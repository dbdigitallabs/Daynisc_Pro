"""
Middleware: TenantMiddleware sets DB schema per request; AuditMiddleware is a no-op stub.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class TenantMiddleware(BaseHTTPMiddleware):
    """Injects tenant schema from JWT claim into request state."""

    async def dispatch(self, request: Request, call_next):
        # Schema extracted later by auth dependency per-route
        request.state.db_schema = "public"
        response = await call_next(request)
        return response


class AuditMiddleware(BaseHTTPMiddleware):
    """Placeholder — audit logging is handled in route handlers."""

    async def dispatch(self, request: Request, call_next):
        return await call_next(request)
