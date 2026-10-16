"""Configuration settings for SubSentry backend using pydantic-settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    GMAIL_CREDENTIALS_PATH: str = "gmail_credentials.json"
    GMAIL_TOKEN_PATH: str = "token.json"
    DATABASE_PATH: str = "subsentry.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Return a cached instance of application settings."""
    return Settings()
