"""Intelligence detector for price hikes, forgotten subscriptions, duplicates, and approaching renewals."""

import json
import logging
import re
import sqlite3
from datetime import date, datetime, timedelta, timezone
from itertools import combinations
from typing import Any, Dict, List, Optional, Tuple

from app.db import connect, init_db
from app.services.extractor import normalize_merchant

logger = logging.getLogger(__name__)

# Genuinely substitutable categories for duplicate alert generation
SUBSTITUTABLE_CATEGORIES = {"music", "streaming"}

# Static cancellation guides mapping canonical merchants to cancel instructions
CANCEL_GUIDES: Dict[str, str] = {
    "Netflix": "Account > Cancel Membership at netflix.com.",
    "Spotify": "Account page > Your plan > Change plan > Cancel Premium at spotify.com.",
    "Adobe": "Sign in to account.adobe.com/plans, select Manage plan, and click Cancel your plan.",
    "iCloud+": "Settings > [Your Name] > iCloud > Manage Storage > Downgrade Options on your Apple device.",
    "Apple": "Settings > [Your Name] > Subscriptions > Cancel Subscription on your Apple device.",
    "Apple Music": "Settings > [Your Name] > Subscriptions > Apple Music > Cancel Subscription on your Apple device.",
    "Namecheap": "Profile > Billing > Expiring/Active Services, and toggle off Auto-Renew at namecheap.com.",
    "Notion": "Settings & members > Plans / Billing > Change plan to Free at notion.so.",
    "FitZone Gym": "Visit your home club in person or submit a written cancellation request via fitzonegym.com/support.",
    "SecureVPN": "Account settings > Subscriptions > Turn off Auto-Renewal at securevpn.net.",
    "Hulu": "Account > Your Subscription > Manage Plan > Cancel Subscription at hulu.com.",
    "GitHub Copilot": "Settings > Billing and plans > Copilot > Cancel subscription at github.com.",
}


def get_cancel_guide(merchant: str) -> str:
    """Retrieve 1-2 sentence cancellation instruction for a canonical merchant."""
    if merchant in CANCEL_GUIDES:
        return CANCEL_GUIDES[merchant]
    m_lower = merchant.lower().strip()
    for k, v in CANCEL_GUIDES.items():
        if k.lower() == m_lower or k.lower() in m_lower or m_lower in k.lower():
            return v
    return f"Visit {merchant} account settings to manage or cancel your subscription."


def detect_price_hikes(
    subscription_id: Optional[int] = None,
    db: Optional[sqlite3.Connection] = None,
) -> List[Dict[str, Any]]:
    """Detect price hikes by analyzing the price_history table.

    For each subscription, compares the latest price_history amount to the previous one.
    If it increased, generates an alert payload of type='price_increase'.

    Args:
        subscription_id: Optional subscription ID to limit analysis.
        db: Optional SQLite connection.

    Returns:
        List of generated price increase alert candidate dicts.
    """
    conn = db if db is not None else connect()
    should_close = db is None
    alerts: List[Dict[str, Any]] = []

    try:
        cursor = conn.cursor()
        if subscription_id:
            cursor.execute(
                "SELECT id, merchant, name, amount FROM subscriptions WHERE id = ?",
                (subscription_id,),
            )
        else:
            cursor.execute("SELECT id, merchant, name, amount FROM subscriptions")
        subs = cursor.fetchall()

        for sub in subs:
            sub_id = sub["id"]
            merchant_name = sub["merchant"] or sub["name"] or "Subscription"

            cursor.execute(
                """
                SELECT amount, observed_at, id
                FROM price_history
                WHERE subscription_id = ?
                ORDER BY observed_at ASC, id ASC
                """,
                (sub_id,),
            )
            history = cursor.fetchall()
            if len(history) < 2:
                continue

            prev_amount = float(history[-2]["amount"])
            latest_amount = float(history[-1]["amount"])

            if latest_amount > prev_amount and prev_amount > 0:
                pct = ((latest_amount - prev_amount) / prev_amount) * 100.0
                pct_rounded = round(pct)
                message = (
                    f"{merchant_name} rose from ${prev_amount:.2f} to "
                    f"${latest_amount:.2f} (+{pct_rounded}%)"
                )
                alerts.append(
                    {
                        "type": "price_increase",
                        "subscription_id": sub_id,
                        "subscription_name": merchant_name,
                        "message": message,
                        "data": {
                            "old_amount": round(prev_amount, 2),
                            "new_amount": round(latest_amount, 2),
                            "pct": round(pct, 2),
                            "cancel_guide": get_cancel_guide(merchant_name),
                        },
                    }
                )
        return alerts
    finally:
        if should_close:
            conn.close()


def detect_forgotten(
    db: Optional[sqlite3.Connection] = None,
) -> List[Dict[str, Any]]:
    """Detect subscriptions with signs of no engagement / forgotten usage.

    Classifies each email as billing or engagement:
      - Billing if subject/snippet matches receipt/invoice/charge/payment keywords
        or contains a $ amount.
      - Otherwise engagement.
    Links emails to merchants by matching normalized merchant name against
    from_addr/subject/snippet.
    If a subscription has >= 2 billing emails and 0 engagement emails,
    creates alert type='possibly_forgotten' with a forgotten_score.

    Args:
        db: Optional SQLite connection.

    Returns:
        List of generated forgotten subscription alert candidate dicts.
    """
    conn = db if db is not None else connect()
    should_close = db is None
    alerts: List[Dict[str, Any]] = []

    billing_kw_pattern = re.compile(
        r"\b(receipt|invoice|charge|payment|billed|order confirmation)\b",
        re.IGNORECASE,
    )
    dollar_pattern = re.compile(r"\$\s*\d+", re.IGNORECASE)

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, merchant, name FROM subscriptions")
        subs = cursor.fetchall()

        cursor.execute("SELECT id, message_id, from_addr, subject, date, snippet FROM emails")
        emails = cursor.fetchall()

        # Pre-classify and link each email to canonical merchants
        email_classifications: List[Tuple[str, str]] = []  # (merchant, 'billing' | 'engagement')
        for em in emails:
            from_addr = em["from_addr"] or ""
            subj = em["subject"] or ""
            snip = em["snippet"] or ""
            comb = f"{subj} {snip}".lower()

            is_billing = bool(billing_kw_pattern.search(comb) or dollar_pattern.search(comb) or "$" in comb)
            category_tag = "billing" if is_billing else "engagement"

            # Normalize canonical merchant
            m_norm = normalize_merchant("", from_addr=from_addr, subject=subj, snippet=snip)
            email_classifications.append((m_norm, category_tag))

        for sub in subs:
            sub_id = sub["id"]
            merchant_name = sub["merchant"] or sub["name"] or ""
            m_lower = merchant_name.lower().strip()

            billing_count = 0
            engagement_count = 0

            for m_norm, tag in email_classifications:
                # Link if normalized merchant equals subscription merchant
                if m_norm.lower() == m_lower or (
                    m_lower in m_norm.lower() or m_norm.lower() in m_lower
                ):
                    if tag == "billing":
                        billing_count += 1
                    else:
                        engagement_count += 1

            total_emails = billing_count + engagement_count
            if billing_count >= 2 and engagement_count == 0:
                forgotten_score = float(billing_count) / float(total_emails)
                message = (
                    f"You paid for {merchant_name} {billing_count} times "
                    f"with no sign of use."
                )
                alerts.append(
                    {
                        "type": "possibly_forgotten",
                        "subscription_id": sub_id,
                        "subscription_name": merchant_name,
                        "message": message,
                        "data": {
                            "billing_count": billing_count,
                            "engagement_count": engagement_count,
                            "forgotten_score": round(forgotten_score, 2),
                            "cancel_guide": get_cancel_guide(merchant_name),
                        },
                    }
                )

                # Keep forgotten_score in subscriptions table updated
                cursor.execute(
                    "UPDATE subscriptions SET forgotten_score = ? WHERE id = ?",
                    (round(forgotten_score, 2), sub_id),
                )
        return alerts
    finally:
        if should_close:
            conn.close()


def detect_duplicates(
    db: Optional[sqlite3.Connection] = None,
) -> List[Dict[str, Any]]:
    """Detect duplicate or overlapping active subscriptions within the same category.

    Groups active subscriptions by category. If 2+ share a category (e.g. Spotify +
    Apple Music in 'music'), generates one alert type='duplicate' per pair with
    combined monthly cost.

    Args:
        db: Optional SQLite connection.

    Returns:
        List of generated duplicate alert candidate dicts.
    """
    conn = db if db is not None else connect()
    should_close = db is None
    alerts: List[Dict[str, Any]] = []

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, merchant, name, amount, current_amount, category, billing_cycle, frequency, status
            FROM subscriptions
            WHERE status != 'cancelled' AND status != 'inactive'
            ORDER BY id ASC
            """
        )
        subs = cursor.fetchall()

        # Group subscriptions by category
        by_category: Dict[str, List[sqlite3.Row]] = {}
        for sub in subs:
            cat = (sub["category"] or "other").strip().lower()
            by_category.setdefault(cat, []).append(sub)

        for cat, cat_subs in by_category.items():
            if cat not in SUBSTITUTABLE_CATEGORIES:
                continue
            if len(cat_subs) < 2:
                continue

            # Compare every unique pair in this category
            for sub_a, sub_b in combinations(cat_subs, 2):
                m_a = sub_a["merchant"] or sub_a["name"] or "Subscription A"
                m_b = sub_b["merchant"] or sub_b["name"] or "Subscription B"

                # Calculate monthly equivalent cost for each
                def _monthly_cost(s: sqlite3.Row) -> float:
                    raw_amount = float(s["current_amount"] or s["amount"] or 0.0)
                    cycle = (s["billing_cycle"] or s["frequency"] or "monthly").strip().lower()
                    if cycle in ("annual", "yearly"):
                        return raw_amount / 12.0
                    return raw_amount

                cost_a = _monthly_cost(sub_a)
                cost_b = _monthly_cost(sub_b)
                combined_monthly = cost_a + cost_b

                # Ensure Spotify is listed first if paired with Apple Music for clean readability
                first_sub, second_sub = sub_a, sub_b
                first_m, second_m = m_a, m_b
                first_cost, second_cost = cost_a, cost_b

                if "apple music" in m_a.lower() and "spotify" in m_b.lower():
                    first_sub, second_sub = sub_b, sub_a
                    first_m, second_m = m_b, m_a
                    first_cost, second_cost = cost_b, cost_a

                message = (
                    f"{first_m} (${first_cost:.2f}) and {second_m} (${second_cost:.2f}) "
                    f"overlap — keeping both costs ${combined_monthly:.2f}/mo."
                )

                cancel_guide_text = (
                    f"{first_m}: {get_cancel_guide(first_m)} | "
                    f"{second_m}: {get_cancel_guide(second_m)}"
                )

                alerts.append(
                    {
                        "type": "duplicate",
                        "subscription_id": first_sub["id"],
                        "subscription_name": f"{first_m} & {second_m}",
                        "message": message,
                        "data": {
                            "category": cat,
                            "subscription_id_1": first_sub["id"],
                            "subscription_id_2": second_sub["id"],
                            "merchant_1": first_m,
                            "merchant_2": second_m,
                            "monthly_cost_1": round(first_cost, 2),
                            "monthly_cost_2": round(second_cost, 2),
                            "combined_monthly_cost": round(combined_monthly, 2),
                            "cancel_guide": cancel_guide_text,
                        },
                    }
                )
        return alerts
    finally:
        if should_close:
            conn.close()


def detect_renewal_soon(
    db: Optional[sqlite3.Connection] = None,
    today_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """Detect subscriptions whose renewal date is approaching within 0 to 7 days.

    Computes:
      next_renewal = last_charge_date + 30 days (monthly) or + 365 days (annual).
    If 0 <= (next_renewal - today) <= 7 days, generates an alert of type='renewal_soon'.

    Args:
        db: Optional SQLite connection.
        today_date: Optional reference date (defaults to UTC today).

    Returns:
        List of generated renewal soon alert candidate dicts.
    """
    conn = db if db is not None else connect()
    should_close = db is None
    alerts: List[Dict[str, Any]] = []
    today = today_date or datetime.now(timezone.utc).date()

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, merchant, name, amount, current_amount, last_charge_date, billing_cycle, frequency, status
            FROM subscriptions
            WHERE status != 'cancelled' AND status != 'inactive'
            """
        )
        subs = cursor.fetchall()

        for sub in subs:
            last_charge_str = sub["last_charge_date"]
            if not last_charge_str:
                continue

            try:
                charge_date = datetime.strptime(last_charge_str.strip(), "%Y-%m-%d").date()
            except ValueError:
                continue

            cycle = (sub["billing_cycle"] or sub["frequency"] or "monthly").strip().lower()
            if cycle in ("annual", "yearly"):
                next_renewal = charge_date + timedelta(days=365)
            else:
                next_renewal = charge_date + timedelta(days=30)

            days_left = (next_renewal - today).days
            if 0 <= days_left <= 7:
                merchant_name = sub["merchant"] or sub["name"] or "Subscription"
                amount_val = float(sub["current_amount"] or sub["amount"] or 0.0)
                days_label = f"{days_left} days" if days_left != 1 else "1 day"
                message = f"{merchant_name} renews in {days_label} (${amount_val:.2f})."

                alerts.append(
                    {
                        "type": "renewal_soon",
                        "subscription_id": sub["id"],
                        "subscription_name": merchant_name,
                        "message": message,
                        "data": {
                            "days_left": days_left,
                            "next_renewal": next_renewal.isoformat(),
                            "amount": round(amount_val, 2),
                            "cancel_guide": get_cancel_guide(merchant_name),
                        },
                    }
                )
        return alerts
    finally:
        if should_close:
            conn.close()


def detect_all(
    db: Optional[sqlite3.Connection] = None,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """Run all 4 detection engines and write findings into the alerts table idempotently.

    Must be idempotent: re-running must NOT create duplicate alerts — before
    inserting, check for an existing unread alert with the same (type, subscription_id)
    and skip if present.

    Args:
        db: Optional SQLite connection.
        reference_date: Optional reference date for renewal calculation.

    Returns:
        Dict[str, Any]: {"alerts_created": n, "alerts": [...]}
    """
    init_db()
    conn = db if db is not None else connect()
    should_close = db is None

    created_alerts: List[Dict[str, Any]] = []

    try:
        with conn:
            cursor = conn.cursor()

            # 1. Run all detectors
            price_alerts = detect_price_hikes(db=conn)
            forgotten_alerts = detect_forgotten(db=conn)
            duplicate_alerts = detect_duplicates(db=conn)
            renewal_alerts = detect_renewal_soon(db=conn, today_date=reference_date)

            all_candidates = (
                price_alerts + forgotten_alerts + duplicate_alerts + renewal_alerts
            )

            now_iso = datetime.now(timezone.utc).isoformat()

            for candidate in all_candidates:
                alert_type = candidate["type"]
                sub_id = candidate["subscription_id"]
                sub_name = candidate.get("subscription_name") or ""
                msg = candidate["message"]
                data_dict = candidate.get("data") or {}
                data_json = json.dumps(data_dict)

                # Idempotency check: Skip if ANY existing alert with the same (type, subscription_id) exists
                cursor.execute(
                    """
                    SELECT id FROM alerts
                    WHERE type = ? AND subscription_id = ?
                    """,
                    (alert_type, sub_id),
                )
                existing = cursor.fetchone()
                if existing is not None:
                    continue

                # Insert newly detected alert
                cursor.execute(
                    """
                    INSERT INTO alerts (
                        type, subscription_id, subscription_name, message, data,
                        is_read, created_at, sent_at, channel
                    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'in_app')
                    """,
                    (
                        alert_type,
                        sub_id,
                        sub_name,
                        msg,
                        data_json,
                        now_iso,
                        now_iso,
                    ),
                )
                new_id = cursor.lastrowid
                created_alerts.append(
                    {
                        "id": new_id,
                        "type": alert_type,
                        "subscription_id": sub_id,
                        "subscription_name": sub_name,
                        "message": msg,
                        "data": data_dict,
                        "is_read": False,
                        "created_at": now_iso,
                    }
                )

        return {
            "alerts_created": len(created_alerts),
            "alerts": created_alerts,
        }
    finally:
        if should_close:
            conn.close()
