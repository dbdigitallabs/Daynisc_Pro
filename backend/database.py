"""
Async PostgreSQL database engine with multi-tenant schema routing.
Each company gets its own PostgreSQL schema (schema-per-tenant isolation).
Supports local Docker, Supabase (free cloud), and AWS RDS.
"""
from __future__ import annotations
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession, AsyncEngine,
    async_sessionmaker, create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from config import settings


def _build_connect_args() -> dict:
    """Return SSL connect_args when connecting to a hosted provider (Supabase, RDS)."""
    url = settings.DATABASE_URL
    # Supabase (direct: supabase.co, pooler: supabase.com) and AWS RDS both require SSL
    if "supabase.co" in url or "supabase.com" in url or "rds.amazonaws.com" in url:
        return {"ssl": "require"}
    return {}


def _pool_kwargs() -> dict:
    """Smaller pool for cloud free-tier (fewer allowed connections)."""
    url = settings.DATABASE_URL
    if "supabase.co" in url or "supabase.com" in url:
        # Supabase free tier allows ~60 connections total; keep our share small
        return {"pool_size": 3, "max_overflow": 5}
    return {
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
    }


# ── Base model ────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Engine ────────────────────────────────────────────────────────────────────

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    **_pool_kwargs(),
    connect_args=_build_connect_args(),
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Session factory — schema is injected per-request by TenantMiddleware
AsyncSessionFactory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create public schema tables on startup."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()


# ── Per-request DB session with tenant schema ─────────────────────────────────

async def get_db(schema: str = "public") -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection for FastAPI routes.
    Sets search_path to the tenant schema before yielding the session.
    """
    async with AsyncSessionFactory() as session:
        # Set PostgreSQL search_path to isolate tenant data
        await session.execute(
            text(f"SET search_path TO {schema}, public")
        )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Schema provisioning for new companies ────────────────────────────────────

async def provision_company_schema(schema_name: str) -> None:
    """
    Create a new PostgreSQL schema and all tables for a new company.
    Called when a company first registers.
    """
    async with engine.begin() as conn:
        # Create schema
        await conn.execute(
            text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        )
        # Set search path and create all tables
        await conn.execute(
            text(f"SET search_path TO {schema_name}, public")
        )
        await conn.run_sync(Base.metadata.create_all)

    # Seed default data (accounts, warehouses, etc.)
    async with AsyncSessionFactory() as session:
        await session.execute(
            text(f"SET search_path TO {schema_name}, public")
        )
        await _seed_defaults(session, schema_name)
        await session.commit()


async def _seed_defaults(session: AsyncSession, schema: str) -> None:
    """Insert default data for a new company."""
    # Default warehouse
    await session.execute(text("""
        INSERT INTO warehouses (id, name, is_default, created_at)
        VALUES (gen_random_uuid(), 'Main Warehouse', true, NOW())
        ON CONFLICT DO NOTHING
    """))
    # Default account groups (Indian CoA structure)
    for group in ['Capital Account', 'Current Assets', 'Fixed Assets',
                  'Current Liabilities', 'Sales Accounts', 'Purchase Accounts',
                  'Direct Expenses', 'Indirect Expenses', 'Bank Accounts', 'Cash-in-Hand']:
        await session.execute(text("""
            INSERT INTO account_groups (id, name, created_at)
            VALUES (gen_random_uuid(), :name, NOW())
            ON CONFLICT DO NOTHING
        """), {"name": group})
