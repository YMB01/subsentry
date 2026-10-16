"""Router for background jobs and pipeline execution."""

from typing import Any, Dict
from fastapi import APIRouter
from app.services.detector import detect_all
from app.services.extractor import extract_all
from app.services.pipeline import run_pipeline

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/detect")
def trigger_detect() -> Dict[str, Any]:
    """Trigger intelligence detection across subscriptions, price history, and emails.

    Detects price increases, forgotten subscriptions, category duplicates,
    and renewal dates approaching within 7 days.
    """
    return detect_all()


@router.post("/extract")
def trigger_extract() -> Dict[str, Any]:
    """Trigger receipt extraction across all stored emails.

    Reads unextracted emails, parses subscription metadata using Gemini
    or deterministic fallback, upserts subscriptions, and updates price history.
    """
    return extract_all()


@router.post("/scan")
def trigger_scan() -> Dict[str, Any]:
    """Trigger the email ingestion, extraction, and detection pipeline.

    Stubbed: Calls run_pipeline() stub and returns execution status.
    TODO: Run pipeline asynchronously as a background task.
    """
    result = run_pipeline()
    return {
        "status": "success",
        "message": "Scan job executed successfully (stub)",
        "result": result,
    }


@router.post("/renewal-check")
def trigger_renewal_check() -> Dict[str, Any]:
    """Check for approaching renewals and send alerts via Telegram.

    Stubbed: Returns empty upcoming renewals.
    TODO: Query upcoming renewals within next 3 days and dispatch Telegram notifications.
    """
    return {
        "status": "success",
        "message": "Renewal check executed successfully (stub)",
        "upcoming_renewals": [],
    }
