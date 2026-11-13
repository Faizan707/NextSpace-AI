from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def normalize_database_url(url: str) -> str:
    """Use psycopg v3 driver. Railway often injects postgresql:// without +psycopg."""
    value = (url or "").strip()
    if value.startswith("postgres://"):
        value = "postgresql://" + value[len("postgres://") :]
    if value.startswith("postgresql://"):
        value = "postgresql+psycopg://" + value[len("postgresql://") :]
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NextSpace AI"
    database_url: str = "postgresql+psycopg://user:password@localhost/neondb?sslmode=require"
    jwt_secret: str = "change-me-to-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    frontend_url: str = "http://127.0.0.1:5174"
    # Comma-separated browser origins allowed by CORS (local Vite + later Vercel).
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    # Invite / transactional email (SMTP). Leave unset to keep console outbox in dev.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True

    # AWS S3 (documents + task attachments). Leave unset to keep local uploads/.
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "ap-southeast-2"
    aws_s3_bucket: str | None = None

    @field_validator(
        "smtp_host",
        "smtp_username",
        "smtp_password",
        "smtp_from",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_s3_bucket",
        mode="before",
    )
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_db_url(cls, value: object) -> object:
        if not isinstance(value, str) or not value.strip():
            return value
        return normalize_database_url(value)

    def cors_origin_list(self) -> list[str]:
        origins: set[str] = set()
        for part in self.cors_origins.split(","):
            origin = part.strip().rstrip("/")
            if origin:
                origins.add(origin)
        frontend = (self.frontend_url or "").strip().rstrip("/")
        if frontend:
            origins.add(frontend)
        return sorted(origins)

    def database_host(self) -> str:
        try:
            return urlparse(self.database_url).hostname or "unknown"
        except Exception:
            return "unknown"


@lru_cache
def get_settings() -> Settings:
    return Settings()
