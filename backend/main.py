"""
AI ERP Platform — FastAPI Backend
Main application entry point — all service routers registered.
"""
from contextlib import asynccontextmanager
import socket
from fastapi import FastAPI
from fastapi.responses import RedirectResponse

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
from super_admin_router import router as super_admin_router
from extra_routers import (
    transport_router,
    settings_router,
)

# New routers added for accounting operating system features
from ai_assistant_router import router as ai_assistant_router
from integration_router import router as integration_router
from bank_recon_router import router as bank_recon_router
from excel_mapper_router import router as excel_mapper_router


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
app.include_router(super_admin_router, prefix=f"{PREFIX}/super-admin", tags=["Super Admin"])

# Include new capability routers
app.include_router(ai_assistant_router, prefix=f"{PREFIX}/ai-assistant", tags=["AI Assistant"])
app.include_router(integration_router,  prefix=f"{PREFIX}/integrations", tags=["Integrations"])
app.include_router(bank_recon_router,  prefix=f"{PREFIX}/bank-reconciliation", tags=["Bank Reconciliation"])
app.include_router(excel_mapper_router, prefix=f"{PREFIX}/excel-mapper", tags=["Excel Column Mapping"])




def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.0)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and ip != "127.0.0.1" and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        ips = socket.gethostbyname_ex(hostname)[2]
        for ip in ips:
            if ip.startswith("192.168.") or ip.startswith("10."):
                return ip
            if ip.startswith("172."):
                parts = ip.split(".")
                if len(parts) >= 2 and 16 <= int(parts[1]) <= 31:
                    return ip
        for ip in ips:
            if ip != "127.0.0.1" and not ip.startswith("127."):
                return ip
    except Exception:
        pass

    return "localhost"

@app.get("/")
async def root():
    return RedirectResponse(url="/api/docs")

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():

    lan_ip = get_lan_ip()
    return {
        "status": "ok",
        "version": "1.0.0",
        "lan_url": f"http://{lan_ip}:8000/api/v1"
    }

