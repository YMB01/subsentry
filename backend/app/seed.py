"""Seed module for generating the SubSentry demo inbox.

Populates the emails table with realistic demo email data reflecting 10 subscriptions
across 3 monthly billing cycles (2026-08-15, 2026-09-15, 2026-10-15) plus specified
engagement emails for active services.
"""

from typing import Any, Dict, List, Optional
from app.db import connect, init_db

DEMO_EMAILS: List[Dict[str, str]] = [
    # 1. Netflix (Engagement: Yes; Price hike on latest: 12.99 -> 12.99 -> 15.49)
    {
        "message_id": "seed-netflix-20260815",
        "from_addr": "receipts@netflix.com",
        "subject": "Your Netflix receipt — $12.99",
        "date": "2026-08-15",
        "snippet": "Thanks for your payment of $12.99 for Netflix Standard Monthly Plan.",
    },
    {
        "message_id": "seed-netflix-20260915",
        "from_addr": "receipts@netflix.com",
        "subject": "Your Netflix receipt — $12.99",
        "date": "2026-09-15",
        "snippet": "Thanks for your payment of $12.99 for Netflix Standard Monthly Plan.",
    },
    {
        "message_id": "seed-netflix-20261015",
        "from_addr": "receipts@netflix.com",
        "subject": "Your Netflix receipt — $15.49",
        "date": "2026-10-15",
        "snippet": "Thanks for your payment of $15.49 for Netflix Standard Monthly Plan.",
    },
    {
        "message_id": "seed-netflix-engagement",
        "from_addr": "info@netflix.com",
        "subject": "Top 10 shows this week",
        "date": "2026-10-10",
        "snippet": "Top 10 shows this week: Discover trending series, documentaries, and movies on Netflix.",
    },

    # 2. Spotify (Engagement: Yes)
    {
        "message_id": "seed-spotify-20260815",
        "from_addr": "receipts@spotify.com",
        "subject": "Your Spotify receipt — $9.99",
        "date": "2026-08-15",
        "snippet": "Your Spotify Premium subscription has been renewed. Payment of $9.99 received.",
    },
    {
        "message_id": "seed-spotify-20260915",
        "from_addr": "receipts@spotify.com",
        "subject": "Your Spotify receipt — $9.99",
        "date": "2026-09-15",
        "snippet": "Your Spotify Premium subscription has been renewed. Payment of $9.99 received.",
    },
    {
        "message_id": "seed-spotify-20261015",
        "from_addr": "receipts@spotify.com",
        "subject": "Your Spotify receipt — $9.99",
        "date": "2026-10-15",
        "snippet": "Your Spotify Premium subscription has been renewed. Payment of $9.99 received.",
    },
    {
        "message_id": "seed-spotify-engagement",
        "from_addr": "news@spotify.com",
        "subject": "Your Daily Mix is ready",
        "date": "2026-10-14",
        "snippet": "Your Daily Mix is ready. Enjoy your personalized playlists updated today.",
    },

    # 3. Adobe (Engagement: Yes; Monthly receipts: 2026-07-22, 2026-08-22, 2026-09-22; Next renewal: 2026-10-22)
    {
        "message_id": "seed-adobe-20260722",
        "from_addr": "billing@adobe.com",
        "subject": "Your Adobe Creative Cloud receipt — $54.99",
        "date": "2026-07-22",
        "snippet": "Thank you for your payment of $54.99 for Adobe Creative Cloud All Apps.",
    },
    {
        "message_id": "seed-adobe-20260822",
        "from_addr": "billing@adobe.com",
        "subject": "Your Adobe Creative Cloud receipt — $54.99",
        "date": "2026-08-22",
        "snippet": "Thank you for your payment of $54.99 for Adobe Creative Cloud All Apps.",
    },
    {
        "message_id": "seed-adobe-20260922",
        "from_addr": "billing@adobe.com",
        "subject": "Your Adobe Creative Cloud receipt — $54.99",
        "date": "2026-09-22",
        "snippet": "Thank you for your payment of $54.99 for Adobe Creative Cloud All Apps. Next renewal 2026-10-22.",
    },
    {
        "message_id": "seed-adobe-engagement",
        "from_addr": "updates@adobe.com",
        "subject": "What's new in Creative Cloud",
        "date": "2026-10-05",
        "snippet": "What's new in Creative Cloud: Explore generative AI features and vector tools in Creative Cloud.",
    },

    # 4. iCloud (Engagement: Yes)
    {
        "message_id": "seed-icloud-20260815",
        "from_addr": "receipts@apple.com",
        "subject": "Your iCloud receipt — $2.99",
        "date": "2026-08-15",
        "snippet": "Apple invoice: iCloud+ with 200 GB storage monthly plan renewal of $2.99 billed.",
    },
    {
        "message_id": "seed-icloud-20260915",
        "from_addr": "receipts@apple.com",
        "subject": "Your iCloud receipt — $2.99",
        "date": "2026-09-15",
        "snippet": "Apple invoice: iCloud+ with 200 GB storage monthly plan renewal of $2.99 billed.",
    },
    {
        "message_id": "seed-icloud-20261015",
        "from_addr": "receipts@apple.com",
        "subject": "Your iCloud receipt — $2.99",
        "date": "2026-10-15",
        "snippet": "Apple invoice: iCloud+ with 200 GB storage monthly plan renewal of $2.99 billed.",
    },
    {
        "message_id": "seed-icloud-engagement",
        "from_addr": "notifications@apple.com",
        "subject": "Your storage is almost full",
        "date": "2026-10-12",
        "snippet": "Your storage is almost full. You have used 188 GB of your 200 GB iCloud storage.",
    },

    # 5. Namecheap domain (annual; Engagement: Yes; Next renewal: 2026-10-20)
    {
        "message_id": "seed-namecheap-20251020",
        "from_addr": "receipts@namecheap.com",
        "subject": "Your Namecheap receipt — $14.88",
        "date": "2025-10-20",
        "snippet": "Namecheap Order Confirmation: Annual domain registration payment of $14.88 processed successfully. Next renewal: 2026-10-20.",
    },
    {
        "message_id": "seed-namecheap-engagement",
        "from_addr": "support@namecheap.com",
        "subject": "Your domain renews soon",
        "date": "2026-10-13",
        "snippet": "Your domain renews soon. Your domain subscription will automatically renew on 2026-10-20.",
    },

    # 6. Notion (Engagement: Yes; 2 trial emails then 1 receipt for $10.00)
    {
        "message_id": "seed-notion-trial1-20260815",
        "from_addr": "team@mail.notion.so",
        "subject": "Your trial ends in 3 days",
        "date": "2026-08-15",
        "snippet": "Your trial ends in 3 days. Continue enjoying Notion Plus workspace features.",
    },
    {
        "message_id": "seed-notion-trial2-20260915",
        "from_addr": "team@mail.notion.so",
        "subject": "Your trial ends in 3 days",
        "date": "2026-09-15",
        "snippet": "Your trial ends in 3 days. Extended trial period for Notion Plus is finishing.",
    },
    {
        "message_id": "seed-notion-20261015",
        "from_addr": "receipts@mail.notion.so",
        "subject": "Your Notion receipt — $10.00",
        "date": "2026-10-15",
        "snippet": "Thank you for subscribing to Notion Plus. Payment receipt for $10.00 monthly subscription.",
    },
    {
        "message_id": "seed-notion-engagement",
        "from_addr": "team@mail.notion.so",
        "subject": "Welcome to Notion Plus",
        "date": "2026-10-16",
        "snippet": "Welcome to Notion Plus! Learn how to use unlimited file uploads and custom databases.",
    },

    # 7. FitZone Gym (Forgotten: Billing emails ONLY)
    {
        "message_id": "seed-fitzone-20260815",
        "from_addr": "receipts@fitzonegym.com",
        "subject": "Your FitZone Gym receipt — $49.99",
        "date": "2026-08-15",
        "snippet": "FitZone Gym monthly membership dues of $49.99 charged to card on file.",
    },
    {
        "message_id": "seed-fitzone-20260915",
        "from_addr": "receipts@fitzonegym.com",
        "subject": "Your FitZone Gym receipt — $49.99",
        "date": "2026-09-15",
        "snippet": "FitZone Gym monthly membership dues of $49.99 charged to card on file.",
    },
    {
        "message_id": "seed-fitzone-20261015",
        "from_addr": "receipts@fitzonegym.com",
        "subject": "Your FitZone Gym receipt — $49.99",
        "date": "2026-10-15",
        "snippet": "FitZone Gym monthly membership dues of $49.99 charged to card on file.",
    },

    # 8. SecureVPN (Forgotten: Billing emails ONLY)
    {
        "message_id": "seed-securevpn-20260815",
        "from_addr": "receipts@securevpn.net",
        "subject": "Your SecureVPN receipt — $9.99",
        "date": "2026-08-15",
        "snippet": "SecureVPN monthly privacy plan renewal payment of $9.99 confirmed.",
    },
    {
        "message_id": "seed-securevpn-20260915",
        "from_addr": "receipts@securevpn.net",
        "subject": "Your SecureVPN receipt — $9.99",
        "date": "2026-09-15",
        "snippet": "SecureVPN monthly privacy plan renewal payment of $9.99 confirmed.",
    },
    {
        "message_id": "seed-securevpn-20261015",
        "from_addr": "receipts@securevpn.net",
        "subject": "Your SecureVPN receipt — $9.99",
        "date": "2026-10-15",
        "snippet": "SecureVPN monthly privacy plan renewal payment of $9.99 confirmed.",
    },

    # 9. Hulu (Forgotten: Billing emails ONLY)
    {
        "message_id": "seed-hulu-20260815",
        "from_addr": "receipts@hulu.com",
        "subject": "Your Hulu receipt — $7.99",
        "date": "2026-08-15",
        "snippet": "Your Hulu recurring subscription fee of $7.99 was successfully billed.",
    },
    {
        "message_id": "seed-hulu-20260915",
        "from_addr": "receipts@hulu.com",
        "subject": "Your Hulu receipt — $7.99",
        "date": "2026-09-15",
        "snippet": "Your Hulu recurring subscription fee of $7.99 was successfully billed.",
    },
    {
        "message_id": "seed-hulu-20261015",
        "from_addr": "receipts@hulu.com",
        "subject": "Your Hulu receipt — $7.99",
        "date": "2026-10-15",
        "snippet": "Your Hulu recurring subscription fee of $7.99 was successfully billed.",
    },

    # 10. GitHub Copilot (Billing emails ONLY)
    {
        "message_id": "seed-github-20260815",
        "from_addr": "receipts@github.com",
        "subject": "Your GitHub receipt — $10.00",
        "date": "2026-08-15",
        "snippet": "GitHub payment receipt: GitHub Copilot monthly subscription of $10.00 paid.",
    },
    {
        "message_id": "seed-github-20260915",
        "from_addr": "receipts@github.com",
        "subject": "Your GitHub receipt — $10.00",
        "date": "2026-09-15",
        "snippet": "GitHub payment receipt: GitHub Copilot monthly subscription of $10.00 paid.",
    },
    {
        "message_id": "seed-github-20261015",
        "from_addr": "receipts@github.com",
        "subject": "Your GitHub receipt — $10.00",
        "date": "2026-10-15",
        "snippet": "GitHub payment receipt: GitHub Copilot monthly subscription of $10.00 paid.",
    },

    # 11. Apple Music (Engagement: Yes; Duplicate with Spotify)
    {
        "message_id": "seed-applemusic-20260815",
        "from_addr": "receipts@apple.com",
        "subject": "Your Apple Music receipt — $10.99",
        "date": "2026-08-15",
        "snippet": "Apple invoice: Apple Music Individual monthly subscription renewed for $10.99.",
    },
    {
        "message_id": "seed-applemusic-20260915",
        "from_addr": "receipts@apple.com",
        "subject": "Your Apple Music receipt — $10.99",
        "date": "2026-09-15",
        "snippet": "Apple invoice: Apple Music Individual monthly subscription renewed for $10.99.",
    },
    {
        "message_id": "seed-applemusic-20261015",
        "from_addr": "receipts@apple.com",
        "subject": "Your Apple Music receipt — $10.99",
        "date": "2026-10-15",
        "snippet": "Apple invoice: Apple Music Individual monthly subscription renewed for $10.99.",
    },
    {
        "message_id": "seed-applemusic-engagement",
        "from_addr": "news@apple.com",
        "subject": "Your Apple Music weekly mix",
        "date": "2026-10-14",
        "snippet": "Listen to new releases and trending playlists curated for you on Apple Music.",
    },
]


def seed_demo_inbox(db_path: Optional[str] = None) -> int:
    """Insert demo emails into the emails table deduplicated by message_id.

    Args:
        db_path: Optional path to SQLite database. Defaults to DATABASE_PATH config.

    Returns:
        int: Number of new emails inserted.
    """
    init_db(db_path)
    conn = connect(db_path)
    inserted_count = 0
    try:
        with conn:
            cursor = conn.cursor()
            for email in DEMO_EMAILS:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO emails (message_id, from_addr, subject, date, snippet)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        email["message_id"],
                        email["from_addr"],
                        email["subject"],
                        email["date"],
                        email["snippet"],
                    ),
                )
                if cursor.rowcount > 0:
                    inserted_count += 1
        return inserted_count
    finally:
        conn.close()


if __name__ == "__main__":
    inserted = seed_demo_inbox()
    conn = connect()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM emails")
        total = cursor.fetchone()[0]
    finally:
        conn.close()
    print(f"Seed complete: {inserted} inserted, {total} total emails in database.")
