import os
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


def _get_pg_dsn() -> str:
    # Use the directory of this file (backend/) for reports.db to ensure consistency
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(backend_dir, "reports.db")
    
    return (
        os.getenv("DATABASE_URL")
        or os.getenv("SUPABASE_DATABASE_URL")
        or os.getenv("POSTGRES_DSN")
        or f"sqlite+aiosqlite:///{db_path}"
    )


def get_engine() -> AsyncEngine:
    dsn = _get_pg_dsn()

    # Ensure we use async driver. Supabase often gives a `postgresql://` DSN.
    if dsn.startswith("postgresql://"):
        dsn = dsn.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif dsn.startswith("postgres://"):
        dsn = dsn.replace("postgres://", "postgresql+asyncpg://", 1)

    if dsn.startswith("sqlite"):
        return create_async_engine(
            dsn,
            echo=False,
        )

    return create_async_engine(
        dsn,
        pool_pre_ping=True,
        pool_size=int(os.getenv("PG_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("PG_MAX_OVERFLOW", "10")),
    )


engine = None
async_session_factory: sessionmaker[AsyncSession] | None = None


def init_pg() -> None:
    global engine, async_session_factory
    if engine is None:
        engine = get_engine()
        async_session_factory = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )


async def get_session() -> AsyncSession:
    if async_session_factory is None:
        init_pg()
    assert async_session_factory is not None
    async with async_session_factory() as session:
        yield session

