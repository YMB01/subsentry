"""Gmail API client service for fetching billing and receipt emails."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from app.config import get_settings

logger = logging.getLogger(__name__)

SCOPES: List[str] = ["https://www.googleapis.com/auth/gmail.readonly"]
DEFAULT_RECEIPT_QUERY: str = (
    'subject:(receipt OR invoice OR "payment received" OR subscription OR renew) newer_than:90d'
)


def _resolve_backend_path(path_str: str) -> Path:
    """Resolve file path relative to current working directory or backend root."""
    p = Path(path_str)
    if p.is_absolute() or p.exists():
        return p

    # Fallback to backend root relative to this file
    backend_root = Path(__file__).resolve().parent.parent.parent
    backend_p = backend_root / path_str
    if backend_p.exists():
        return backend_p

    return p


def _is_real_credentials_file(creds_path: Path) -> bool:
    """Validate whether the file exists and is a genuine OAuth client credentials file."""
    if not creds_path.is_file():
        return False

    try:
        with open(creds_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        client_info = data.get("installed") or data.get("web")
        if not client_info or not isinstance(client_info, dict):
            return False

        client_id = str(client_info.get("client_id", ""))
        # If client_id is placeholder or empty, credentials are not real
        if not client_id or "YOUR_CLIENT_ID" in client_id:
            return False

        return True
    except (json.JSONDecodeError, OSError):
        return False


def fetch_receipts(query: str = DEFAULT_RECEIPT_QUERY) -> List[Dict[str, Any]]:
    """Fetch receipts and invoices from user's Gmail mailbox using Gmail API.

    Performs OAuth2 desktop flow caching refresh token if real credentials exist.
    Raises FileNotFoundError if real credentials file is not configured.
    Only extracts email snippet and metadata (no bodies).

    Args:
        query: Gmail search query string. Defaults to receipt/invoice query.

    Returns:
        List of dicts: {message_id, from_addr, subject, date, snippet}.

    Raises:
        FileNotFoundError: If GMAIL_CREDENTIALS_PATH does not point to a valid file.
    """
    settings = get_settings()
    creds_path = _resolve_backend_path(settings.GMAIL_CREDENTIALS_PATH)

    if not _is_real_credentials_file(creds_path):
        raise FileNotFoundError("Gmail not configured")

    token_path = _resolve_backend_path(settings.GMAIL_TOKEN_PATH)
    if not token_path.is_file():
        raise FileNotFoundError(
            "Gmail token.json not found. Run authentication flow or seed demo data."
        )

    try:
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    except Exception as e:
        logger.warning("Failed to load cached Gmail token: %s", e)
        raise FileNotFoundError("Invalid Gmail token.json file.")

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())
        else:
            raise FileNotFoundError("Gmail credentials expired or invalid.")

    service = build("gmail", "v1", credentials=creds)

    response = service.users().messages().list(userId="me", q=query).execute()
    messages = response.get("messages", [])

    results: List[Dict[str, Any]] = []
    for item in messages:
        msg_id = item.get("id")
        if not msg_id:
            continue

        msg = (
            service.users()
            .messages()
            .get(
                userId="me",
                id=msg_id,
                format="metadata",
                metadataHeaders=["From", "Subject", "Date"],
            )
            .execute()
        )

        snippet = msg.get("snippet", "")
        headers = msg.get("payload", {}).get("headers", [])
        header_map = {
            h.get("name", "").lower(): h.get("value", "") for h in headers if "name" in h
        }

        results.append(
            {
                "message_id": msg_id,
                "from_addr": header_map.get("from", ""),
                "subject": header_map.get("subject", ""),
                "date": header_map.get("date", ""),
                "snippet": snippet,
            }
        )

    return results
