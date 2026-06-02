"""
AI ERP Platform — FastAPI Backend
Main application entry point with all service routers registered.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from shared.database import init_db, close_db
from shared.middleware import TenantMiddleware, AuditMiddleware
from shared.config import settings

# Service routers
from services.auth_service.routes import router as auth_router
from services.document_service.routes import router as doc_router
from services.accounting_service.routes import router as acc_router
from services.inventory_service.routes import router as inv_router
from services.production_service.routes import router as prod_router
from services.sales_service.routes import router as sales_router
from services.purchase_service.routes import router as purchase_router
from services.transport_service.routes import router as transport_router
from services.gst_service.routes import router as gst_router
from services.erp_connector.routes import router as erp_router
from services.whatsapp_service.routes import router as wa_router
from services.dashboard_service.routes import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="AI ERP Platform API",
    description="AI-powered ERP & Business Automation for Indian SMEs",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# ── Middleware ──────────────────────────────────────────────────────────────

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

# ── Routers ─────────────────────────────────────────────────────────────────

PREFIX = "/api/v1"

app.include_router(auth_router,       prefix=f"{PREFIX}/auth",       tags=["Auth"])
app.include_router(dashboard_router,  prefix=f"{PREFIX}",            tags=["Dashboard"])
app.include_router(doc_router,        prefix=f"{PREFIX}/documents",  tags=["Documents"])
app.include_router(acc_router,        prefix=f"{PREFIX}/accounting", tags=["Accounting"])
app.include_router(inv_router,        prefix=f"{PREFIX}/inventory",  tags=["Inventory"])
app.include_router(prod_router,       prefix=f"{PREFIX}/production", tags=["Production"])
app.include_router(sales_router,      prefix=f"{PREFIX}/sales",      tags=["Sales"])
app.include_router(purchase_router,   prefix=f"{PREFIX}/purchase",   tags=["Purchase"])
app.include_router(transport_router,  prefix=f"{PREFIX}/transport",  tags=["Transport"])
app.include_router(gst_router,        prefix=f"{PREFIX}/gst",        tags=["GST"])
app.include_router(erp_router,        prefix=f"{PREFIX}/erp",        tags=["ERP"])
app.include_router(wa_router,         prefix=f"{PREFIX}/whatsapp",   tags=["WhatsApp"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0", "platform": "AI ERP"}
