"""Subscription discovery and processing pipeline orchestrator."""

import logging
import sqlite3
from typing import Any, Dict, List, Optional

from app.db import connect, init_db
from app.services import gmail_client
from app.services.detector import detect_all
from app.services.extractor import extract_all
from app.services.notifier import notify_new_alerts

logger = logging.getLogger(__name__)


def ingest_receipts() -> int:
    """Step 1 Ingest: Fetch receipt/invoice emails from Gmail.

    Attempts to fetch receipts via services.gmail_client.fetch_receipts().
    If Gmail is not configured (FileNotFoundError), logs advice and returns 0.
    Inserts fetched emails into the emails table deduplicated by message_id.

    Returns:
        int: Number of newly ingested email records.
    """
    try:
        emails = gmail_client.fetch_receipts()
    except (FileNotFoundError, Exception) as exc:
        logger.warning("Gmail not configured or unavailable (%s), run `python -m app.seed` for demo data", exc)
        return 0

    if not emails:
        return 0

    conn = connect()
    inserted_count = 0
    try:
        with conn:
            cursor = conn.cursor()
            for email in emails:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO emails (message_id, from_addr, subject, date, snippet)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        email.get("message_id"),
                        email.get("from_addr", ""),
                        email.get("subject", ""),
                        email.get("date", ""),
                        email.get("snippet", ""),
                    ),
                )
                if cursor.rowcount > 0:
                    inserted_count += 1
        return inserted_count
    finally:
        conn.close()


def extract_subscriptions(
    emails: Optional[List[Dict[str, Any]]] = None,
    db: Optional[sqlite3.Connection] = None,
) -> Dict[str, Any]:
    """Step 2 Extract: Parse structured subscription details using Gemini / fallback."""
    _ = emails
    return extract_all(db=db)


def detect_insights(
    subscriptions: Optional[List[Dict[str, Any]]] = None,
    db: Optional[sqlite3.Connection] = None,
) -> Dict[str, Any]:
    """Step 3 Detect: Identify price hikes, forgotten subscriptions, and duplicates."""
    _ = subscriptions
    return detect_all(db=db)


def run_pipeline(db: Optional[sqlite3.Connection] = None) -> Dict[str, Any]:
    """Run full pipeline: Step 1 ingest -> Step 2 extract -> Step 3 detect -> Step 4 notify.

    Steps:
      1. ingest_receipts()
      2. extract_all(db)
      3. detect_all(db)
      4. notify_new_alerts(newly created alerts only)

    CRITICAL anti-spam rule:
      Only the alerts created in THIS run (detect_all's returned 'alerts' list) get Telegram messages.
      A re-run that creates 0 alerts sends 0 messages.

    Returns:
        Dict[str, Any]: {
            "ingested": n,
            "extracted": {...},
            "alerts_created": m,
            "telegram_sent": k,
        }
    """
    init_db()
    conn = db if db is not None else connect()
    should_close = db is None

    try:
        # Step 1: Ingest receipts
        ingested = ingest_receipts()

        # Step 2: Extract receipts
        extracted = extract_all(db=conn)

        # Step 3: Detect insights
        detection_result = detect_all(db=conn)
        alerts_created = detection_result.get("alerts_created", 0)
        newly_created_alerts = detection_result.get("alerts", [])

        # Step 4: Proactive notifications for newly created alerts only
        telegram_sent = notify_new_alerts(newly_created_alerts)

        logger.info(
            "Pipeline completed: ingested=%d, extracted=%s, alerts_created=%d, telegram_sent=%d",
            ingested,
            extracted.get("processed", 0),
            alerts_created,
            telegram_sent,
        )

        return {
            "ingested": ingested,
            "extracted": extracted,
            "alerts_created": alerts_created,
            "telegram_sent": telegram_sent,
        }
    finally:
        if should_close:
            conn.close()
