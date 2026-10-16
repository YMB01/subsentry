"""Router for alerts retrieval and status management."""

import json
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import connect, init_db

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertResponse(BaseModel):
    """Schema for alert item response."""

    id: int
    type: str
    subscription_name: str
    message: str
    data: Dict[str, Any]
    is_read: bool
    created_at: str


@router.get("", response_model=List[AlertResponse])
def get_alerts() -> List[Dict[str, Any]]:
    """Retrieve all alerts ordered newest-first.

    Returns:
        List of alert dicts with fields:
        id, type, subscription_name, message, data (JSON object), is_read, created_at.
    """
    init_db()
    conn = connect()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                a.id,
                a.type,
                a.subscription_id,
                COALESCE(NULLIF(a.subscription_name, ''), s.merchant, s.name, '') AS subscription_name,
                a.message,
                a.data,
                COALESCE(a.is_read, 0) AS is_read,
                COALESCE(a.created_at, a.sent_at, '') AS created_at
            FROM alerts a
            LEFT JOIN subscriptions s ON a.subscription_id = s.id
            ORDER BY a.id DESC
            """
        )
        rows = cursor.fetchall()
        results: List[Dict[str, Any]] = []
        for row in rows:
            raw_data = row["data"]
            parsed_data: Dict[str, Any] = {}
            if raw_data:
                try:
                    parsed_data = json.loads(raw_data)
                except Exception:
                    parsed_data = {"raw": raw_data}

            results.append(
                {
                    "id": row["id"],
                    "type": row["type"],
                    "subscription_name": row["subscription_name"] or "",
                    "message": row["message"],
                    "data": parsed_data,
                    "is_read": bool(row["is_read"]),
                    "created_at": row["created_at"] or "",
                }
            )
        return results
    finally:
        conn.close()


@router.patch("/{alert_id}/read", response_model=Dict[str, Any])
def mark_alert_read(alert_id: int) -> Dict[str, Any]:
    """Mark an alert as read by ID.

    Args:
        alert_id: Primary key of alert to mark read.

    Returns:
        Dict status confirming alert is marked as read.
    """
    init_db()
    conn = connect()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM alerts WHERE id = ?", (alert_id,))
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Alert not found")

            cursor.execute("UPDATE alerts SET is_read = 1 WHERE id = ?", (alert_id,))
        return {
            "id": alert_id,
            "is_read": True,
            "message": f"Alert {alert_id} marked as read",
        }
    finally:
        conn.close()
