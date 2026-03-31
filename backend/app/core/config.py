
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Personal Budget Analyzer"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/budget_analyzer"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    FIRST_SUPERUSER_EMAIL: str
    FIRST_SUPERUSER_PASSWORD: str
    FIRST_SUPERUSER_USERNAME: str
    FIRST_SUPERUSER_FULL_NAME: str | None = None

    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    PASSWORD_RESET_PATH: str = "/reset-password"

    # Email (Resend SMTP)
    MAIL_FROM: str | None = None
    MAIL_FROM_NAME: str | None = None
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_SERVER: str = "smtp.resend.com"
    MAIL_PORT: int = 465
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = True
    MAIL_TIMEOUT: int = 30

    # Optional External APIs
    PLAID_CLIENT_ID: str | None = None
    PLAID_SECRET: str | None = None
    PLAID_ENV: str = "sandbox"

    GOOGLE_CLOUD_VISION_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
