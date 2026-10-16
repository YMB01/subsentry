"""Router for background jobs and pipeline execution."""

from typing import Any, Dict
from fastapi import APIRouter
from app.services.pipeline import run_pipeline

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
