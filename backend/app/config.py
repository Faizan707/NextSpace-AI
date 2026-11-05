from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "NextSpace AI"
    database_url: str = "postgresql+psycopg://user:password@localhost/neondb?sslmode=require"
    jwt_secret: str = "change-me-to-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    frontend_url: str = "http://127.0.0.1:5174"


@lru_cache
def get_settings() -> Settings:
    return Settings()
