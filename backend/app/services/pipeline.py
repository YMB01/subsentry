"""Subscription discovery and processing pipeline orchestrator."""

import logging
from typing import Any, Dict, List
from app.db import connect
from app.services.extractor import extract_all
from app.services import gmail_client


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
    except FileNotFoundError:
        logger.warning("Gmail not configured, run `python -m app.seed` for demo data")
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


def extract_subscriptions(emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Step 2 Extract: Parse structured subscription details using Gemini / fallback."""
    _ = emails
    extract_all()
    conn = connect()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subscriptions")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def detect_insights(subscriptions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Step 3 Detect: Identify price hikes, forgotten subscriptions, and duplicates.

    TODO:
      - Call services.detector.detect_price_hikes() for each subscription.
      - Call services.detector.detect_forgotten() for inactive services.
      - Call services.detector.detect_duplicates() across similar services.
      - Persist generated alerts in alerts table and dispatch via services.notifier.send_telegram().
      - Return dictionary of detected insights.
    """
    # TODO: Step 3 detect logic goes here
    _ = subscriptions
    return {
        "price_hikes": [],
        "forgotten": [],
        "duplicates": [],
    }


def run_pipeline() -> Dict[str, Any]:
    """Run full pipeline: Step 1 ingest -> Step 2 extract -> Step 3 detect.

    Returns:
        Dict[str, Any]: Summary result of pipeline execution.
    """
    # Step 1: Ingest
    ingested_count = ingest_receipts()

    # Step 2: Extract
    extracted = extract_subscriptions([])

    # Step 3: Detect
    insights = detect_insights(extracted)

    return {
        "status": "completed",
        "ingested_count": ingested_count,
        "extracted_count": len(extracted),
        "insights": insights,
    }
