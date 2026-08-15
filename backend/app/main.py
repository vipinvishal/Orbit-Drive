import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import accounts, auth, files, folders, storage, trash, users
from app.config import settings
from app.db.session import get_db
from app.jobs.worker import run_worker_loop

# Uvicorn configures its own loggers but leaves the root logger at the
# Python default (WARNING) with no handler, so our orbit_drive.* INFO-level
# logs were being silently dropped — Python's logging.lastResort fallback
# only prints WARNING+. Attach a real handler directly.
_orbit_logger = logging.getLogger("orbit_drive")
_orbit_logger.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
_orbit_logger.addHandler(_handler)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    stop_event = asyncio.Event()
    worker_task = asyncio.create_task(run_worker_loop(stop_event))
    try:
        yield
    finally:
        stop_event.set()
        await worker_task


app = FastAPI(title="Orbit Drive API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(files.router)
app.include_router(folders.router)
app.include_router(storage.router)
app.include_router(trash.router)
app.include_router(users.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# Separate from /health (which Render uses to decide whether to restart the
# service) so a transient DB blip can't get the whole service cycled. This
# one exists purely for the keep-alive cron — a real query here also keeps
# the Supabase free-tier project from going idle-paused.
@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}
