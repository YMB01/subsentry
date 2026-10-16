"""Telegram notification delivery service for SubSentry alerts."""

import html
import logging
from typing import Any, Dict, List, Optional
import requests

from app.config import get_settings

logger = logging.getLogger(__name__)

# Emoji indicators mapped by alert type
ALERT_EMOJIS: Dict[str, str] = {
    "price_increase": "🔺",
    "possibly_forgotten": "😴",
    "duplicate": "👯",
    "renewal_soon": "⏰",
}


def send_telegram_message(text: str, chat_id: Optional[str] = None) -> bool:
    """Send an HTML-formatted message via the Telegram Bot API.

    POSTs to https://api.telegram.org/bot<TOKEN>/sendMessage with chat_id and text (parse_mode="HTML").
    Returns True on ok==true, False otherwise.
    If token or chat_id is missing/empty, logs a warning and returns False WITHOUT raising.

    Args:
        text: The message body to dispatch.
        chat_id: Optional Telegram chat ID override. Falls back to config TELEGRAM_CHAT_ID.

    Returns:
        bool: True if Telegram API returns ok==True, False otherwise.
    """
    settings = get_settings()
    token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    target_chat_id = (chat_id or settings.TELEGRAM_CHAT_ID or "").strip()

    if not token or not target_chat_id:
        logger.warning(
            "Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing/empty."
        )
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": target_chat_id,
        "text": text,
        "parse_mode": "HTML",
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        data = response.json()
        if response.status_code == 200 and data.get("ok") is True:
            logger.info("Telegram alert dispatched successfully to chat %s", target_chat_id)
            return True
        logger.warning(
            "Telegram API error: status=%s response=%s",
            response.status_code,
            data.get("description", response.text),
        )
        return False
    except Exception as exc:
        logger.warning("Failed to dispatch Telegram message: %s", exc)
        return False


def format_alert(alert: Dict[str, Any]) -> str:
    """Format an alert dictionary into a compact Telegram HTML message (< ~400 chars).

    Format:
      - Emoji by type (🔺 price_increase, 😴 possibly_forgotten, 👯 duplicate, ⏰ renewal_soon)
      - Bold merchant name
      - The alert message
      - The cancel_guide on its own line

    Args:
        alert: Alert dictionary containing type, subscription_name, message, and optional data/cancel_guide.

    Returns:
        str: HTML-formatted Telegram message under ~400 characters.
    """
    alert_type = str(alert.get("type", "")).strip()
    emoji = ALERT_EMOJIS.get(alert_type, "⚠️")

    data = alert.get("data")
    if not isinstance(data, dict):
        data = {}

    merchant = (
        alert.get("subscription_name")
        or alert.get("merchant")
        or data.get("merchant")
        or "Subscription"
    )

    message = alert.get("message") or ""

    cancel_guide = alert.get("cancel_guide") or data.get("cancel_guide")
    if not cancel_guide:
        try:
            from app.services.detector import get_cancel_guide

            cancel_guide = get_cancel_guide(str(merchant))
        except Exception:
            cancel_guide = ""

    # Ensure fields stay within limits so total message remains compact (< ~400 chars)
    clean_merchant = str(merchant).strip()[:80]
    clean_message = str(message).strip()[:180]
    clean_cancel = str(cancel_guide).strip()[:250]

    # Escape HTML entities so <, >, & do not corrupt HTML tags or fail Telegram parser
    escaped_merchant = html.escape(clean_merchant, quote=False)
    escaped_message = html.escape(clean_message, quote=False)
    escaped_cancel = html.escape(clean_cancel, quote=False)

    lines = [f"{emoji} <b>{escaped_merchant}</b>"]
    if escaped_message:
        lines.append(escaped_message)
    if escaped_cancel:
        lines.append(escaped_cancel)

    formatted = "\n".join(lines)
    if len(formatted) > 400:
        formatted = formatted[:397] + "..."
    return formatted


def notify_new_alerts(alerts: List[Dict[str, Any]]) -> int:
    """Format and send Telegram messages for each alert in the list.

    Never raises: catches per-alert exceptions, logs them, and continues.

    Args:
        alerts: List of newly generated alert dictionaries.

    Returns:
        int: Count of alerts successfully sent.
    """
    if not alerts:
        return 0

    sent_count = 0
    for alert in alerts:
        try:
            formatted_text = format_alert(alert)
            if send_telegram_message(formatted_text):
                sent_count += 1
        except Exception as exc:
            logger.warning(
                "Failed to send Telegram alert for alert_id=%s: %s",
                alert.get("id"),
                exc,
            )
            continue

    return sent_count


# Backwards compatibility alias
send_telegram = send_telegram_message
