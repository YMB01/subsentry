"""Subscription extractor service using Gemini structured JSON output."""

from typing import Any, Dict, Optional
from app.config import get_settings


def extract_subscription(email: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract subscription fields from raw email text using Gemini structured JSON.

    Expected extracted schema:
      - merchant: str (e.g. 'Netflix', 'Spotify', 'GitHub')
      - amount: float (e.g. 15.99)
      - currency: str (e.g. 'USD', 'EUR')
      - frequency: str ('monthly', 'yearly', 'weekly')
      - next_renewal: str (ISO 8601 date, e.g. '2026-11-01')
      - category: str (e.g. 'Entertainment', 'Cloud & Dev', 'Software')

    TODO:
      - Initialize Gemini API client using settings.GEMINI_API_KEY.
      - Pass email snippet / subject / body into prompt with JSON schema constraint.
      - Parse and validate JSON response.
      - Return normalized subscription dict, or None if the email is not a recurring subscription.

    Args:
        email: Raw email record containing subject, snippet, from_addr, date, etc.

    Returns:
        Extracted subscription dictionary or None.
    """
    settings = get_settings()
    # TODO: Implement Gemini structured JSON extraction
    _ = settings
    _ = email
    return None
