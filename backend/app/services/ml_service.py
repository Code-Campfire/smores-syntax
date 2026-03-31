import hashlib
import hmac
import pickle
from collections import Counter

import redis as redis_lib
from scipy.stats import loguniform
from sklearn.linear_model import SGDClassifier
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logger_init import setup_logging
from app.models.category import Category
from app.models.transaction import Transactions

logger = setup_logging()

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_encoder = None  # process-level singleton

# L1: in-process cache (fast, invalidated on corrections or restart)
_model_cache: dict[int, tuple[SGDClassifier, list[str]]] = {}

# L2: Redis (24h TTL, survives restarts, shared across workers)
# v2: embedding-based (incompatible with v1 TF-IDF caches)
_redis_client: redis_lib.Redis | None = None
_redis_checked: bool = False
_REDIS_KEY_PREFIX = "ml_model:v2:"
MODEL_TTL_SECONDS = 24 * 60 * 60

N_ITER = 20
CONFIDENCE_THRESHOLD = 0.45
SIMILARITY_THRESHOLD = 0.40
CORRECTION_WEIGHT = 3

# Cache of category name → embedding (populated lazily, never invalidated — names don't change)
_category_emb_cache: dict = {}


def _sign(data: bytes) -> bytes:
    key = settings.SECRET_KEY.encode()
    sig = hmac.new(key, data, hashlib.sha256).digest()
    return sig + data


def _verify_and_load(signed_data: bytes) -> tuple[SGDClassifier, list[str]]:
    key = settings.SECRET_KEY.encode()
    sig, data = signed_data[:32], signed_data[32:]
    expected = hmac.new(key, data, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected):
        raise ValueError("ML model Redis payload failed HMAC verification")
    return pickle.loads(data)  # noqa: S301 — data verified above


def _get_redis() -> redis_lib.Redis | None:
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    try:
        client = redis_lib.from_url(settings.REDIS_URL, decode_responses=False)
        client.ping()
        _redis_client = client
        logger.info("ML service: Redis connection established")
    except Exception:
        logger.warning("ML service: Redis unavailable, using in-memory cache only")
    return _redis_client


def _get_encoder():
    global _encoder
    if _encoder is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading sentence transformer: {EMBEDDING_MODEL}")
        _encoder = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Sentence transformer loaded")
    return _encoder


def _encode(texts: list[str]):
    import numpy as np
    embeddings = _get_encoder().encode(texts, batch_size=64, show_progress_bar=False)
    return np.array(embeddings)


def _get_training_data(db: Session, user_id: int) -> list[tuple[str, str]]:
    from app.models.category_feedback import CategoryFeedback  # local import avoids circular dependency

    stmt = (
        select(Transactions.description, Category.name)
        .join(Category, Transactions.category_id == Category.id)
        .where(
            Transactions.user_id == user_id,
            Transactions.description.is_not(None),
            Transactions.description != "",
        )
        .limit(2000)
    )
    rows = db.execute(stmt).all()
    samples = [(desc.strip(), cat_name) for desc, cat_name in rows if desc and desc.strip()]

    feedback_stmt = (
        select(CategoryFeedback.description, Category.name)
        .join(Category, CategoryFeedback.chosen_category_id == Category.id)
        .where(
            CategoryFeedback.user_id == user_id,
            CategoryFeedback.is_correction.is_(True),
            CategoryFeedback.description.is_not(None),
            CategoryFeedback.description != "",
        )
        .limit(500)
    )
    feedback_rows = db.execute(feedback_stmt).all()
    for desc, cat_name in feedback_rows:
        if desc and desc.strip():
            samples.extend([(desc.strip(), cat_name)] * CORRECTION_WEIGHT)

    cat_counts = Counter(cat for _, cat in samples)
    logger.info(
        f"User {user_id}: training data — {len(rows)} transactions + {len(feedback_rows)} corrections "
        f"(x{CORRECTION_WEIGHT}) = {len(samples)} total samples | distribution: {dict(cat_counts)}"
    )
    for desc, cat_name in feedback_rows:
        if desc and desc.strip():
            logger.info(f"  [correction sample x{CORRECTION_WEIGHT}] '{desc}' → '{cat_name}'")

    return samples


def _train_clf(samples: list[tuple[str, str]]) -> tuple[SGDClassifier, list[str]]:
    texts = [s[0] for s in samples]
    labels = [s[1] for s in samples]
    label_counts = Counter(labels)
    x = _encode(texts)
    clf = SGDClassifier(loss="log_loss", penalty="l2", random_state=42)
    param_dist = {
        "alpha": loguniform(1e-5, 1e-1),
        "max_iter": [100, 300, 500, 1000],
        "penalty": ["l1", "l2", "elasticnet"],
    }
    min_count = min(label_counts.values())
    n_splits = min(5, min_count)
    cv = StratifiedKFold(n_splits=max(n_splits, 2), shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        clf, param_dist, n_iter=N_ITER, cv=cv,
        scoring="f1_macro", random_state=42, refit=True, n_jobs=-1,
    )
    search.fit(x, labels)
    best_clf = search.best_estimator_
    best_clf.fit(x, labels)
    return best_clf, list(best_clf.classes_)


def _similarity_predict(desc_emb, available_categories: list[dict]) -> tuple[str | None, float]:
    import numpy as np

    best_name = None
    best_score = -1.0
    for cat in available_categories:
        name = cat["name"]
        if name not in _category_emb_cache:
            _category_emb_cache[name] = _encode([name])[0]
        cat_emb = _category_emb_cache[name]
        score = float(np.dot(desc_emb, cat_emb) / (np.linalg.norm(desc_emb) * np.linalg.norm(cat_emb) + 1e-8))
        if score > best_score:
            best_score = score
            best_name = name

    if best_score >= SIMILARITY_THRESHOLD:
        return best_name, round(best_score, 4)
    return None, round(best_score, 4)


def _get_or_train(db: Session, user_id: int) -> tuple[SGDClassifier, list[str]] | None:
    if user_id in _model_cache:
        logger.debug(f"User {user_id}: ML model served from in-memory cache (L1)")
        return _model_cache[user_id]

    r = _get_redis()
    if r is not None:
        try:
            data = r.get(f"{_REDIS_KEY_PREFIX}{user_id}")
            if data:
                clf, classes = _verify_and_load(data)
                _model_cache[user_id] = (clf, classes)
                logger.info(f"User {user_id}: ML model loaded from Redis (L2), warm in L1")
                return clf, classes
        except Exception:
            logger.warning(f"User {user_id}: Redis read failed, will retrain from DB")

    samples = _get_training_data(db, user_id)

    try:
        logger.info(f"User {user_id}: training ML model on {len(samples)} samples")
        clf, classes = _train_clf(samples)
        _model_cache[user_id] = (clf, classes)
        logger.info(f"User {user_id}: model trained, classes={classes}")
        if r is not None:
            try:
                r.set(
                    f"{_REDIS_KEY_PREFIX}{user_id}",
                    _sign(pickle.dumps((clf, classes))),
                    ex=MODEL_TTL_SECONDS,
                )
                logger.info(f"User {user_id}: ML model persisted to Redis (TTL={MODEL_TTL_SECONDS}s)")
            except Exception:
                logger.warning(f"User {user_id}: Redis write failed, model in L1 only")

        return clf, classes
    except Exception:
        logger.exception(f"User {user_id}: model training failed")
        return None


def predict_category(
    db: Session,
    user_id: int,
    description: str,
    available_categories: list[dict],
) -> dict:
    _no_suggestion = {"category_id": None, "category_name": None, "confidence": 0.0, "source": "none"}

    if not description or not description.strip():
        return _no_suggestion

    name_to_cat = {c["name"]: c for c in available_categories}

    desc_emb = _encode([description])

    model_result = _get_or_train(db, user_id)
    if model_result is not None:
        clf, classes = model_result
        try:
            proba = clf.predict_proba(desc_emb)[0]
            best_idx = int(proba.argmax())
            best_name = classes[best_idx]
            confidence = float(proba[best_idx])

            if confidence >= CONFIDENCE_THRESHOLD and best_name in name_to_cat:
                logger.debug(f"User {user_id}: ML predicted '{best_name}' ({confidence:.0%}) for '{description}'")
                cat = name_to_cat[best_name]
                return {
                    "category_id": cat["id"],
                    "category_name": best_name,
                    "confidence": round(confidence, 4),
                    "source": "ml",
                }
            logger.debug(f"User {user_id}: ML confidence too low ({confidence:.0%}) "
                         f"for '{description}', falling back to similarity")
        except Exception:
            logger.warning(f"User {user_id}: ML prediction failed for '{description}', falling back to similarity")

    matched_name, similarity = _similarity_predict(desc_emb[0], available_categories)
    if matched_name:
        logger.debug(f"User {user_id}: similarity matched '{matched_name}' ({similarity:.0%}) for '{description}'")
        cat = name_to_cat[matched_name]
        return {
            "category_id": cat["id"],
            "category_name": matched_name,
            "confidence": similarity,
            "source": "similarity",
        }

    logger.debug(f"User {user_id}: no suggestion for '{description}'")
    return _no_suggestion


def incremental_update(user_id: int, description: str, label: str, is_correction: bool = False) -> None:
    import numpy as np

    cached = _model_cache.get(user_id)
    if cached is None:
        r = _get_redis()
        if r is not None:
            try:
                data = r.get(f"{_REDIS_KEY_PREFIX}{user_id}")
                if data:
                    clf, classes = _verify_and_load(data)
                    _model_cache[user_id] = (clf, classes)
                    cached = (clf, classes)
            except Exception:
                logger.warning(f"User {user_id}: Redis read failed during incremental update lookup")

    if cached is None:
        logger.debug(f"User {user_id}: no cached model — incremental update skipped, will retrain on next predict")
        return

    clf, classes = cached

    if label not in classes:
        logger.info(f"User {user_id}: new class '{label}' — invalidating for full retrain")
        invalidate_cache(user_id)
        return

    weight = CORRECTION_WEIGHT if is_correction else 1
    x = np.tile(_encode([description]), (weight, 1))
    clf.partial_fit(x, [label] * weight)
    _model_cache[user_id] = (clf, classes)

    r = _get_redis()
    if r is not None:
        try:
            r.set(
                f"{_REDIS_KEY_PREFIX}{user_id}",
                _sign(pickle.dumps((clf, classes))),
                ex=MODEL_TTL_SECONDS,
            )
        except Exception:
            logger.warning(f"User {user_id}: Redis write failed during incremental update")
    logger.info(f"User {user_id}: partial_fit '{description}' → '{label}' (weight={weight})")


def invalidate_cache(user_id: int) -> None:
    _model_cache.pop(user_id, None)
    r = _get_redis()
    if r is not None:
        try:
            r.delete(f"{_REDIS_KEY_PREFIX}{user_id}")
        except Exception:
            logger.warning(f"User {user_id}: Redis delete failed during cache invalidation")
    logger.info(f"User {user_id}: ML model cache invalidated (L1 + Redis)")
