"""
AI ERP Platform — FastAPI Backend
Main application entry point — all service routers registered.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from config import settings
from database import init_db, close_db
from shared.middleware import TenantMiddleware, AuditMiddleware

# Core routers
from routes import router as dashboard_router
from auth_router import router as auth_router
from accounting_router import router as accounting_router
from inventory_router import router as inventory_router
from sales_router import router as sales_router
from purchase_router import router as purchase_router
from gst_router import router as gst_router
from erp_router import router as erp_router
from documents_router import router as documents_router

# Production (full BOM + QC router), Transport, Settings
from production_router import router as production_router
from extra_routers import (
    transport_router,
    settings_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="AI ERP Platform API",
    description="AI-powered ERP & Business Automation for Indian SMEs",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)
app.add_middleware(AuditMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────

PREFIX = "/api/v1"

app.include_router(auth_router,        prefix=f"{PREFIX}/auth",        tags=["Auth"])
app.include_router(dashboard_router,   prefix=f"{PREFIX}",             tags=["Dashboard"])
app.include_router(accounting_router,  prefix=f"{PREFIX}/accounting",  tags=["Accounting"])
app.include_router(inventory_router,   prefix=f"{PREFIX}/inventory",   tags=["Inventory"])
app.include_router(sales_router,       prefix=f"{PREFIX}/sales",       tags=["Sales"])
app.include_router(purchase_router,    prefix=f"{PREFIX}/purchase",    tags=["Purchase"])
app.include_router(gst_router,         prefix=f"{PREFIX}/gst",         tags=["GST"])
app.include_router(erp_router,         prefix=f"{PREFIX}/erp",         tags=["ERP Sync"])
app.include_router(production_router,  prefix=f"{PREFIX}/production",  tags=["Production"])  # BOM + QC
app.include_router(transport_router,   prefix=f"{PREFIX}/transport",   tags=["Transport"])
app.include_router(settings_router,    prefix=f"{PREFIX}/settings",    tags=["Settings"])
app.include_router(documents_router,   prefix=f"{PREFIX}/documents",   tags=["Documents"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
