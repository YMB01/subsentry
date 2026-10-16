"""Intelligence detector for price hikes, forgotten subscriptions, and duplicates."""

from typing import Any, Dict, List, Optional


def detect_price_hikes(subscription_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Detect price hikes by analyzing the price_history table.

    TODO:
      - Query price_history records ordered by observed_at.
      - Compare latest price with historical price entries.
      - Calculate delta and percentage increase.
      - Return list of price hike alert dicts.

    Args:
        subscription_id: Optional ID to check specific subscription. If None, checks all.

    Returns:
        List of detected price hike alerts.
    """
    # TODO: Implement price hike detection logic
    _ = subscription_id
    return []


def detect_forgotten() -> List[Dict[str, Any]]:
    """Detect subscriptions that may be forgotten or underutilized.

    TODO:
      - Evaluate activity signals, days since last receipt, renewal dates, and usage patterns.
      - Compute forgotten_score (0.0 to 1.0) and update subscriptions table.
      - Return list of subscriptions with high forgotten_score.

    Returns:
        List of flagged forgotten subscriptions.
    """
    # TODO: Implement forgotten subscription detection logic
    return []


def detect_duplicates() -> List[Dict[str, Any]]:
    """Detect duplicate or overlapping active subscriptions.

    TODO:
      - Compare active subscriptions by merchant, domain, and category.
      - Identify redundant services (e.g. multiple cloud storage or music streaming).
      - Return list of duplicate/overlapping subscription clusters.

    Returns:
        List of detected duplicate subscriptions.
    """
    # TODO: Implement duplicate detection logic
    return []
