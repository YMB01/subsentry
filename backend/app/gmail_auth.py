"""One-time Gmail authorization helper for SubSentry.

Executes Google OAuth2 desktop flow, caches the authorization token to
the configured GMAIL_TOKEN_PATH, tests fetching recent receipts, and
prints the 5 newest results.

Usage:
    python -m app.gmail_auth
"""

import logging
import sys
from app.config import get_settings
from app.services.gmail_client import (
    _resolve_backend_path,
    fetch_receipts,
    run_oauth_desktop_flow,
)

logger = logging.getLogger(__name__)


def main() -> int:
    """Run interactive Gmail OAuth authorization flow and print 5 newest receipts."""
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    print("=" * 60, flush=True)
    print("SubSentry - One-Time Gmail Authorization Helper", flush=True)
    print("=" * 60, flush=True)

    settings = get_settings()
    creds_path = _resolve_backend_path(settings.GMAIL_CREDENTIALS_PATH)
    token_path = _resolve_backend_path(settings.GMAIL_TOKEN_PATH)

    print(f"Credentials source : {creds_path}", flush=True)
    print(f"Token destination  : {token_path}", flush=True)

    try:
        print("\nStarting Google OAuth2 authorization flow...", flush=True)
        creds = run_oauth_desktop_flow()

        # Ensure token is persisted to configured GMAIL_TOKEN_PATH
        if not token_path.is_file():
            token_path.parent.mkdir(parents=True, exist_ok=True)
            with open(token_path, "w", encoding="utf-8") as f:
                f.write(creds.to_json())

        print(f"[SUCCESS] OAuth authorization completed.", flush=True)
        print(f"[SUCCESS] Token saved to: {token_path}", flush=True)

        print("\nCalling fetch_receipts() to verify live Gmail integration...", flush=True)
        receipts = fetch_receipts()
        print(f"[SUCCESS] Successfully fetched {len(receipts)} live receipt(s) from Gmail.", flush=True)

        print("\n--- 5 Newest Receipt Results ---", flush=True)
        if not receipts:
            print("No receipts found matching search query.", flush=True)
        else:
            for idx, item in enumerate(receipts[:5], start=1):
                print(f"Result #{idx}:", flush=True)
                print(f"  message_id : {item.get('message_id')}", flush=True)
                print(f"  from_addr  : {item.get('from_addr')}", flush=True)
                print(f"  subject    : {item.get('subject')}", flush=True)
                print(f"  date       : {item.get('date')}", flush=True)

        print("\n[SUCCESS] Gmail authorization helper finished successfully.", flush=True)
        return 0

    except Exception as exc:
        print(f"\n[FAILURE] Gmail authorization failed: {exc}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
