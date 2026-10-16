"""Database module for SubSentry using sqlite3 standard library."""

import sqlite3
from typing import Optional
from app.config import get_settings


def connect(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Establish and return a connection to the SQLite database.

    Args:
        db_path: Optional path to SQLite database file. Defaults to config DATABASE_PATH.

    Returns:
        sqlite3.Connection: SQLite connection object configured with Row factory.
    """
    path = db_path or get_settings().DATABASE_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[str] = None) -> None:
    """Initialize database tables for SubSentry if they do not already exist.

    Tables created:
      - emails(id, message_id, from_addr, subject, date, snippet)
      - subscriptions(id, merchant, amount, currency, frequency, next_renewal, category, status, forgotten_score)
      - price_history(id, subscription_id, amount, observed_at)
      - alerts(id, type, subscription_id, message, sent_at, channel)
    """
    conn = connect(db_path)
    try:
        with conn:
            cursor = conn.cursor()

            # Enable foreign keys
            cursor.execute("PRAGMA foreign_keys = ON;")

            # 1. emails table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS emails (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    message_id TEXT UNIQUE,
                    from_addr TEXT,
                    subject TEXT,
                    date TEXT,
                    snippet TEXT
                );
                """
            )

            # 2. subscriptions table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    merchant TEXT NOT NULL,
                    amount REAL,
                    currency TEXT,
                    frequency TEXT,
                    next_renewal TEXT,
                    category TEXT,
                    status TEXT,
                    forgotten_score REAL
                );
                """
            )

            # 3. price_history table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subscription_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    observed_at TEXT NOT NULL,
                    FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
                );
                """
            )

            # 4. alerts table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    subscription_id INTEGER,
                    message TEXT NOT NULL,
                    sent_at TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE SET NULL
                );
                """
            )
    finally:
        conn.close()
