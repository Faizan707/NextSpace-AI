from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.database import Base, engine
from app.models import Company, Space, User  # noqa: F401 — register models on Base.metadata
from app.routers import auth, companies, spaces


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(spaces.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
