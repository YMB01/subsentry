"""Subscription extractor service supporting Gemini structured JSON with deterministic fallback."""

import json
import logging
import re
import sqlite3
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, PrivateAttr

from app.config import get_settings
from app.db import connect, init_db

logger = logging.getLogger(__name__)


class ExtractionResult(BaseModel):
    """Pydantic schema representing the extracted subscription receipt data."""

    merchant: str = Field(description="Canonical merchant name, e.g. 'Netflix'")
    amount: float = Field(default=0.0, description="Charge amount as float, e.g. 12.99")
    currency: str = Field(default="USD", description="3-letter currency code, e.g. 'USD'")
    billing_cycle: Literal["monthly", "annual", "unknown"] = Field(
        default="unknown",
        description="'monthly' | 'annual' | 'unknown'",
    )
    charge_date: str = Field(default="", description="ISO date string, e.g. '2026-10-15'")
    is_trial: bool = Field(default=False, description="True for trial or first-charge emails")
    category: str = Field(
        default="other",
        description="Category: 'streaming', 'music', 'productivity', 'domain', 'fitness', 'security', 'cloud', etc.",
    )
    confidence: float = Field(default=0.0, description="Extraction confidence score from 0.0 to 1.0")

    _source: str = PrivateAttr(default="fallback")


def normalize_merchant(
    candidate: str,
    from_addr: str = "",
    subject: str = "",
    snippet: str = "",
) -> str:
    """Normalize merchant names to canonical format.

    Ensures 'Apple Music', 'Apple', and 'iCloud+' do not collapse into one merchant.
    """
    raw_from = from_addr.lower()
    raw_subj = subject.lower()
    raw_snip = snippet.lower()
    cand_lower = candidate.strip().lower()
    combined = f"{cand_lower} {raw_from} {raw_subj} {raw_snip}"

    # 1. Distinguish Apple services carefully:
    # iCloud+ check
    if "icloud" in raw_from or "icloud" in raw_subj or "icloud" in raw_snip or "icloud" in cand_lower:
        return "iCloud+"
    # Apple Music check
    if ("apple" in raw_from or "apple" in raw_subj or "apple" in cand_lower) and (
        "music" in raw_subj or "music" in raw_snip or "music" in cand_lower
    ):
        return "Apple Music"
    # Generic Apple check
    if "apple.com" in raw_from or cand_lower == "apple":
        return "Apple"

    # 2. Other canonical merchants:
    if "netflix" in combined:
        return "Netflix"
    if "spotify" in combined:
        return "Spotify"
    if "adobe" in combined or "creative cloud" in combined:
        return "Adobe"
    if "namecheap" in combined:
        return "Namecheap"
    if "notion" in combined:
        return "Notion"
    if "fitzone" in combined:
        return "FitZone Gym"
    if "securevpn" in combined:
        return "SecureVPN"
    if "hulu" in combined:
        return "Hulu"
    if "copilot" in combined or ("github" in combined and "copilot" in raw_snip):
        return "GitHub Copilot"
    if "github" in combined:
        return "GitHub Copilot"

    # Fallback to cleaned candidate
    cleaned = candidate.strip()
    return cleaned if cleaned else "Unknown"


def normalize_category(merchant: str, candidate_category: str = "") -> str:
    """Map merchant and extracted category to canonical standard categories."""
    cand = candidate_category.lower().strip()
    valid_categories = {
        "streaming",
        "music",
        "productivity",
        "domain",
        "fitness",
        "security",
        "cloud",
    }
    if cand in valid_categories:
        return cand

    m_lower = merchant.lower()
    if "netflix" in m_lower or "hulu" in m_lower or "tv" in m_lower:
        return "streaming"
    if "spotify" in m_lower or "music" in m_lower:
        return "music"
    if "adobe" in m_lower or "notion" in m_lower:
        return "productivity"
    if "namecheap" in m_lower or "domain" in m_lower:
        return "domain"
    if "fitzone" in m_lower or "gym" in m_lower or "fitness" in m_lower:
        return "fitness"
    if "securevpn" in m_lower or "vpn" in m_lower or "security" in m_lower:
        return "security"
    if "icloud" in m_lower or "copilot" in m_lower or "github" in m_lower or "cloud" in m_lower:
        return "cloud"

    return candidate_category.strip() or "other"


def normalize_billing_cycle(
    merchant: str,
    text: str = "",
    candidate_cycle: str = "",
) -> Literal["monthly", "annual", "unknown"]:
    """Infer and normalize billing cycle ('monthly' | 'annual' | 'unknown')."""
    t_lower = text.lower()
    c_lower = candidate_cycle.lower().strip()

    if "annual" in t_lower or "yearly" in t_lower or c_lower in ("annual", "yearly"):
        return "annual"
    if "monthly" in t_lower or "month" in t_lower or c_lower in ("monthly", "month"):
        return "monthly"
    if "namecheap" in merchant.lower():
        return "annual"
    if c_lower in ("monthly", "annual", "unknown"):
        return c_lower  # type: ignore[return-value]
    return "monthly"


def _fallback_extract(email: Dict[str, Any]) -> ExtractionResult:
    """Deterministic regex extraction path tuned to seed and receipt patterns.

    Used when GEMINI_API_KEY is not set or when Gemini API call raises an error.
    """
    from_addr = str(email.get("from_addr") or email.get("sender") or "")
    subject = str(email.get("subject") or "")
    date_val = str(email.get("date") or "")
    snippet = str(email.get("snippet") or "")
    combined_text = f"{subject} {snippet}"

    # 1. Detect merchant
    merchant = normalize_merchant("", from_addr=from_addr, subject=subject, snippet=snippet)

    # 2. Detect trial keywords
    trial_regex = re.compile(r"\b(trial ends|free trial|trial period|extended trial|trial)\b", re.IGNORECASE)
    is_trial = bool(trial_regex.search(combined_text))

    # 3. Detect amount & currency
    # Looks for $XX.XX or $XX
    amount_match = re.search(r"\$\s*(\d+(?:\.\d{1,2})?)", combined_text)
    amount = 0.0
    currency = "USD"
    if amount_match:
        try:
            amount = float(amount_match.group(1))
        except ValueError:
            amount = 0.0

    # 4. Infer billing cycle
    billing_cycle = normalize_billing_cycle(merchant, text=combined_text)

    # 5. Determine category
    category = normalize_category(merchant)

    # 6. Calculate confidence
    if merchant != "Unknown" and amount > 0:
        confidence = 0.95
    elif merchant != "Unknown" and is_trial:
        confidence = 0.85
    elif merchant != "Unknown":
        # Likely an engagement email or notification without receipt charge
        confidence = 0.30
    else:
        confidence = 0.10

    res = ExtractionResult(
        merchant=merchant,
        amount=amount,
        currency=currency,
        billing_cycle=billing_cycle,
        charge_date=date_val,
        is_trial=is_trial,
        category=category,
        confidence=confidence,
    )
    res._source = "fallback"
    return res


def extract_receipt(email: Dict[str, Any]) -> ExtractionResult:
    """Extract subscription receipt data from an email dictionary.

    email dict must provide:
        message_id, from_addr (or sender), subject, date, snippet

    Primary path:
        Calls Gemini (gemini-2.5-flash) with response_mime_type="application/json".
    Fallback path:
        Deterministic regex rules tuned to seed data.
    Never raises an exception — returns low-confidence result on error.
    """
    settings = get_settings()
    from_addr = str(email.get("from_addr") or email.get("sender") or "")
    subject = str(email.get("subject") or "")
    date_val = str(email.get("date") or "")
    snippet = str(email.get("snippet") or "")
    message_id = str(email.get("message_id") or "")

    # Check if Gemini API key is configured
    api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
    if not api_key:
        logger.info(
            "GEMINI_API_KEY missing. Using fallback regex extraction for message_id=%s",
            message_id,
        )
        return _fallback_extract(email)

    # Primary path: call Gemini
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = f"""You are an expert subscription receipt and billing invoice extractor.
Analyze the following email metadata and extract recurring subscription details.

Email Details:
- Sender: {from_addr}
- Subject: {subject}
- Date: {date_val}
- Snippet: {snippet}

Extract the following JSON fields:
- merchant: Canonical service name (e.g., 'Netflix', 'Spotify', 'Adobe', 'iCloud+', 'Apple Music', 'Namecheap', 'Notion', 'FitZone Gym', 'SecureVPN', 'Hulu', 'GitHub Copilot').
  IMPORTANT: Distinguish carefully between Apple services:
  - If it is for iCloud storage / iCloud+, set merchant to 'iCloud+'.
  - If it is for Apple Music, set merchant to 'Apple Music'.
  - Do not collapse Apple services into just 'Apple'.
- amount: Float number of the charge (e.g. 12.99, 0.0 for trials without charge amount). Do not include currency symbols.
- currency: 3-letter currency code, e.g. 'USD'.
- billing_cycle: Infer from wording ('annual', 'yearly' -> 'annual'; 'monthly' -> 'monthly'; otherwise 'unknown').
- charge_date: ISO date string (YYYY-MM-DD) when the charge or receipt occurred, taken or inferred from email date ({date_val}).
- is_trial: Boolean. Set to true for trial notifications or first-charge/trial emails (e.g., wording like 'trial ends', 'free trial', 'extended trial').
- category: One of 'streaming', 'music', 'productivity', 'domain', 'fitness', 'security', 'cloud', or other appropriate category.
- confidence: Float score between 0.0 and 1.0 indicating extraction confidence.

Respond ONLY with a JSON object matching this schema.
"""
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractionResult,
            ),
        )

        raw_text = response.text.strip() if response.text else ""
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        data = json.loads(raw_text)

        # Apply normalization to guarantee canonical names and cycles
        merchant = normalize_merchant(
            data.get("merchant", ""),
            from_addr=from_addr,
            subject=subject,
            snippet=snippet,
        )
        category = normalize_category(merchant, data.get("category", ""))
        billing_cycle = normalize_billing_cycle(
            merchant,
            text=f"{subject} {snippet}",
            candidate_cycle=data.get("billing_cycle", ""),
        )

        amount = float(data.get("amount", 0.0) or 0.0)
        currency = str(data.get("currency", "USD") or "USD").upper()[:3]
        charge_date = str(data.get("charge_date") or date_val)
        is_trial = bool(data.get("is_trial", False))
        confidence = float(data.get("confidence", 0.95))

        result = ExtractionResult(
            merchant=merchant,
            amount=amount,
            currency=currency,
            billing_cycle=billing_cycle,
            charge_date=charge_date,
            is_trial=is_trial,
            category=category,
            confidence=confidence,
        )
        result._source = "gemini"
        logger.info(
            "Successfully extracted receipt via Gemini path (model=%s, message_id=%s, merchant=%s)",
            settings.GEMINI_MODEL,
            message_id,
            merchant,
        )
        return result

    except Exception as exc:
        logger.warning(
            "Gemini extraction failed for message_id=%s (%s). Falling back to deterministic regex rules.",
            message_id,
            exc,
        )
        try:
            return _fallback_extract(email)
        except Exception as inner_exc:
            logger.error("Fallback extraction failed critically: %s", inner_exc)
            fallback_res = ExtractionResult(
                merchant="Unknown",
                amount=0.0,
                currency="USD",
                billing_cycle="unknown",
                charge_date=date_val,
                is_trial=False,
                category="other",
                confidence=0.0,
            )
            fallback_res._source = "fallback"
            return fallback_res


def extract_all(db: Optional[sqlite3.Connection] = None) -> Dict[str, int]:
    """Read unextracted emails from the database, run extract_receipt on each,

    upsert into subscriptions, append charges to price_history, and mark emails processed.

    Returns:
        dict: {"processed": n, "subscriptions": m, "via_gemini": x, "via_fallback": y}
    """
    init_db()
    conn = db if db is not None else connect()
    should_close = db is None

    processed_count = 0
    via_gemini_count = 0
    via_fallback_count = 0

    try:
        with conn:
            cursor = conn.cursor()

            # Query unextracted emails, sorted chronologically so historical price changes order properly
            cursor.execute(
                """
                SELECT id, message_id, from_addr, subject, date, snippet
                FROM emails
                WHERE processed IS NULL OR processed = 0
                ORDER BY date ASC, id ASC
                """
            )
            rows = cursor.fetchall()

            for row in rows:
                email_dict = dict(row)
                email_id = email_dict["id"]
                msg_id = email_dict.get("message_id") or ""

                result = extract_receipt(email_dict)
                processed_count += 1
                if getattr(result, "_source", "fallback") == "gemini":
                    via_gemini_count += 1
                else:
                    via_fallback_count += 1

                merchant = result.merchant
                # Only upsert subscription if merchant is valid and is either a paid receipt or a trial
                if merchant != "Unknown" and (result.amount > 0 or result.is_trial):
                    cursor.execute(
                        """
                        SELECT id, amount, current_amount, last_charge_date, status, is_trial
                        FROM subscriptions
                        WHERE LOWER(merchant) = LOWER(?)
                        """,
                        (merchant,),
                    )
                    existing = cursor.fetchone()

                    if existing is None:
                        status = "trial" if result.is_trial else "active"
                        cursor.execute(
                            """
                            INSERT INTO subscriptions (
                                merchant, name, category, billing_cycle, frequency,
                                amount, current_amount, currency, last_charge_date,
                                status, is_trial, forgotten_score
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                merchant,
                                merchant,
                                result.category,
                                result.billing_cycle,
                                result.billing_cycle,
                                result.amount,
                                result.amount,
                                result.currency,
                                result.charge_date,
                                status,
                                1 if result.is_trial else 0,
                                0.0,
                            ),
                        )
                        subscription_id = cursor.lastrowid
                    else:
                        subscription_id = existing["id"]
                        if result.amount > 0:
                            # Update subscription with latest active receipt details
                            existing_date = existing["last_charge_date"] or ""
                            if not existing_date or result.charge_date >= existing_date:
                                cursor.execute(
                                    """
                                    UPDATE subscriptions
                                    SET amount = ?,
                                        current_amount = ?,
                                        last_charge_date = ?,
                                        status = 'active',
                                        is_trial = 0,
                                        category = COALESCE(?, category),
                                        billing_cycle = ?,
                                        frequency = ?
                                    WHERE id = ?
                                    """,
                                    (
                                        result.amount,
                                        result.amount,
                                        result.charge_date,
                                        result.category,
                                        result.billing_cycle,
                                        result.billing_cycle,
                                        subscription_id,
                                    ),
                                )
                        elif result.is_trial and existing["status"] == "trial":
                            existing_date = existing["last_charge_date"] or ""
                            if not existing_date or result.charge_date >= existing_date:
                                cursor.execute(
                                    "UPDATE subscriptions SET last_charge_date = ? WHERE id = ?",
                                    (result.charge_date, subscription_id),
                                )

                    # Append to price_history if email has a positive charge amount
                    if result.amount > 0 and subscription_id is not None:
                        cursor.execute(
                            """
                            SELECT id FROM price_history
                            WHERE subscription_id = ? AND (source_message_id = ? OR source = ?)
                            """,
                            (subscription_id, msg_id, msg_id),
                        )
                        if cursor.fetchone() is None:
                            cursor.execute(
                                """
                                INSERT INTO price_history (
                                    subscription_id, amount, observed_at, charge_date, source_message_id, source
                                ) VALUES (?, ?, ?, ?, ?, ?)
                                """,
                                (
                                    subscription_id,
                                    result.amount,
                                    result.charge_date,
                                    result.charge_date,
                                    msg_id,
                                    msg_id,
                                ),
                            )

                # Mark email as processed
                cursor.execute("UPDATE emails SET processed = 1 WHERE id = ?", (email_id,))

            # Query total subscriptions count
            cursor.execute("SELECT COUNT(*) FROM subscriptions")
            count_row = cursor.fetchone()
            total_subscriptions = int(count_row[0]) if count_row else 0

        return {
            "processed": processed_count,
            "subscriptions": total_subscriptions,
            "via_gemini": via_gemini_count,
            "via_fallback": via_fallback_count,
        }
    finally:
        if should_close:
            conn.close()
