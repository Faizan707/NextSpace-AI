"""Entry shim — prefer: uv run fastapi dev app/main.py"""

from app.main import app

__all__ = ["app"]
