"""Subscription discovery and processing pipeline orchestrator."""

from typing import Any, Dict, List


def ingest_receipts() -> List[Dict[str, Any]]:
    """Step 1 Ingest: Fetch receipt/invoice emails from Gmail.

    TODO:
      - Authenticate and query messages via services.gmail_client.fetch_receipts().
      - Store raw email metadata into the emails table (id, message_id, from_addr, subject, date, snippet).
      - Return list of ingested email records.
    """
    # TODO: Step 1 ingest logic goes here
    return []


def extract_subscriptions(emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Step 2 Extract: Parse structured subscription details using Gemini.

    TODO:
      - For each email, invoke services.extractor.extract_subscription(email).
      - Upsert parsed merchant, amount, frequency, renewal date into subscriptions table.
      - Record new price point into price_history table.
      - Return list of extracted subscriptions.
    """
    # TODO: Step 2 extract logic goes here
    return []


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
    emails = ingest_receipts()

    # Step 2: Extract
    extracted = extract_subscriptions(emails)

    # Step 3: Detect
    insights = detect_insights(extracted)

    return {
        "status": "completed",
        "ingested_count": len(emails),
        "extracted_count": len(extracted),
        "insights": insights,
    }
