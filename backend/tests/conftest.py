import os

os.environ["APP_DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["APP_SECRET_KEY"] = "test-secret-key-that-is-long-enough"
os.environ["APP_LOCAL_STORAGE_PATH"] = "./test-storage"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.database import Base, engine
from app.core.rate_limit import memory_rate_limiter
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def clean_database():
    memory_rate_limiter.clear()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as value:
        yield value
