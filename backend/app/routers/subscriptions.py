"""Router for subscription management and dashboard endpoints."""

from typing import Any, Dict, List
from fastapi import APIRouter
from app.db import connect

router = APIRouter(tags=["subscriptions"])


@router.get("/emails/count", response_model=Dict[str, int])
def get_emails_count() -> Dict[str, int]:
    """Retrieve total count of stored emails."""
    conn = connect()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM emails")
        row = cursor.fetchone()
        count = int(row[0]) if row else 0
        return {"count": count}
    finally:
        conn.close()


@router.get("/subscriptions", response_model=List[Dict[str, Any]])
def get_subscriptions() -> List[Dict[str, Any]]:
    """Retrieve all tracked subscriptions from SQLite database."""
    conn = connect()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subscriptions ORDER BY merchant ASC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard() -> Dict[str, Any]:
    """Retrieve aggregated dashboard metrics and summary data.

    Stubbed: Returns empty metrics and empty lists.
    TODO: Aggregate total monthly spend, active count, price hike alerts,
    and high forgotten-score subscriptions from SQLite database.
    """
    return {
        "metrics": {
            "total_monthly_spend": 0.0,
            "active_subscriptions": 0,
            "detected_price_hikes": 0,
            "forgotten_subscriptions": 0,
        },
        "subscriptions": [],
        "alerts": [],
    }
