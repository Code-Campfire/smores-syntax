from datetime import datetime
import io

import pendulum
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import extract, func, select
from fastapi.responses import StreamingResponse

from app import models
from app.api.deps import CurrentUser, DbSession
from app.core.logger_init import setup_logging
from app.services.report_service import generate_spending_report_pdf_bytes

logger = setup_logging()
router = APIRouter()

@router.get("/category-distribution", status_code=status.HTTP_200_OK)
def get_category_distribution(
    *,
    db: DbSession,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    current_user: CurrentUser
):
    if start_date is None:
        start_date = pendulum.now().start_of("year")
    if end_date is None:
        end_date = pendulum.now()

    stmt = (
        select(
            models.Category.name.label("category_name"),
            func.sum(models.Transactions.amount).label("total_amount")
        )
        .join(models.Category, models.Transactions.category_id == models.Category.id)
        .where(
            models.Transactions.user_id == current_user.id,
            models.Category.type == "expense",
            models.Transactions.transaction_date >= start_date,
            models.Transactions.transaction_date <= end_date
        )
        .group_by(models.Category.name)
        .order_by(func.sum(models.Transactions.amount).desc())
    )
    category_data = db.execute(stmt).all()

    result = {
        "start_date": start_date,
        "end_date": end_date,
        "category_distribution": [
            {
                "category": category_name,
                "total": float(total) if total else 0.0
            }
            for category_name, total in category_data
        ]
    }
    return result

@router.get("/monthly-spending-trend", status_code=status.HTTP_200_OK)
def get_monthly_spending_trend(
    *,
    db: DbSession,
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int,
    current_user: CurrentUser
):
    start_date = pendulum.datetime(start_year, start_month, 1)
    end_date = pendulum.datetime(end_year, end_month, 1).end_of("month")

    stmt = (
        select(
            extract("year", models.Transactions.transaction_date).label("year"),
            extract("month", models.Transactions.transaction_date).label("month"),
            func.sum(models.Transactions.amount).label("total_amount")
        )
        .join(models.Category, models.Transactions.category_id == models.Category.id)
        .where(
            models.Transactions.user_id == current_user.id,
            models.Category.type == "expense",
            models.Transactions.transaction_date >= start_date,
            models.Transactions.transaction_date <= end_date
        )
        .group_by(
            extract("year", models.Transactions.transaction_date),
            extract("month", models.Transactions.transaction_date)
        )
        .order_by(
            extract("year", models.Transactions.transaction_date),
            extract("month", models.Transactions.transaction_date)
        )
    )
    trend_data = db.execute(stmt).all()
    result = {
        "start_date": start_date,
        "end_date": end_date,
        "monthly_spending_trend": [
            {
                "year": int(year),
                "month": int(month),
                "total": float(total) if total else 0.0
            }
            for year, month, total in trend_data
        ]
    }
    return result


@router.get("/spending-report/pdf", response_class=StreamingResponse)
def get_spending_report_pdf(
    *,
    db: DbSession,
    report_type: str = Query(pattern="^(monthly|yearly)$"),
    start_year: int | None = None,
    start_month: int | None = None,
    end_year: int | None = None,
    end_month: int | None = None,
    year: int | None = None,
    current_user: CurrentUser,
) -> StreamingResponse:
    """
    Download a PDF with spending summary + charts.

    report_type:
      - monthly: provide start_year/start_month/end_year/end_month
      - yearly: provide year
    """

    if report_type == "monthly":
        missing = [name for name, val in (
            ("start_year", start_year),
            ("start_month", start_month),
            ("end_year", end_year),
            ("end_month", end_month),
        ) if val is None]
        if missing:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Missing parameters for monthly report: {', '.join(missing)}")

    if report_type == "yearly" and year is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing parameter 'year' for yearly report")

    pdf_bytes = generate_spending_report_pdf_bytes(
        db=db,
        user_id=current_user.id,
        report_type=report_type,
        start_year=start_year,
        start_month=start_month,
        end_year=end_year,
        end_month=end_month,
        year=year,
    )

    if report_type == "monthly":
        file_name = f"spending-report-monthly-{start_year}-{start_month}-to-{end_year}-{end_month}.pdf"
    else:
        file_name = f"spending-report-yearly-{year}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
