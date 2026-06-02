"""
Production Router — Full BOM, Production Orders, and QC management.
Endpoints:
  GET/POST /bom                  — List / create BOM headers
  GET      /bom/{id}             — BOM detail with components
  PATCH    /bom/{id}             — Update BOM
  DELETE   /bom/{id}             — Deactivate BOM
  POST     /bom/{id}/components  — Add component to BOM
  DELETE   /bom/{id}/components/{cid}

  GET/POST /orders               — List / create production orders
  PATCH    /orders/{id}          — Update status / actual qty
  GET      /orders/{id}/bom      — Fetch BOM for a production order

  GET/POST /qc                   — List / create QC checks
  PATCH    /qc/{id}              — Update QC result

  GET      /report               — Efficiency summary
"""
from __future__ import annotations
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from shared.database import get_db
from shared.auth import get_current_user, CurrentUser

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _set_schema(db: AsyncSession, schema: str):
    try:
        await db.execute(text(f"SET search_path TO {schema}, public"))
    except Exception:
        pass


async def _rows(db, sql, params=None):
    try:
        res = await db.execute(text(sql), params or {})
        return [dict(r._mapping) for r in res.fetchall()]
    except Exception:
        await db.rollback()
        return []


async def _scalar(db, sql, params=None, default=None):
    try:
        res = await db.execute(text(sql), params or {})
        return res.scalar()
    except Exception:
        await db.rollback()
        return default


# ════════════════════════════════════════════════════════════════════════════════
# BOM ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/bom")
async def list_boms(
    active_only: bool = True,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    where = "WHERE bh.is_active = TRUE" if active_only else ""
    boms = await _rows(db, f"""
        SELECT bh.id, bh.bom_name, bh.output_quantity, bh.output_unit,
               bh.is_active, bh.notes, bh.created_at::text,
               im.item_name AS finished_item_name, im.item_code,
               COUNT(bc.id) AS component_count
        FROM bom_headers bh
        LEFT JOIN item_master im ON im.id = bh.finished_item_id
        LEFT JOIN bom_components bc ON bc.bom_id = bh.id
        {where}
        GROUP BY bh.id, im.item_name, im.item_code
        ORDER BY bh.created_at DESC
        LIMIT :limit
    """, {"limit": limit})
    return {"items": boms, "count": len(boms)}


@router.post("/bom")
async def create_bom(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    bom_id = str(uuid.uuid4())
    try:
        await db.execute(text("""
            INSERT INTO bom_headers
                (id, finished_item_id, bom_name, output_quantity, output_unit, notes, is_active, created_at)
            VALUES
                (:id, :item_id, :name, :qty, :unit, :notes, TRUE, NOW())
        """), {
            "id": bom_id,
            "item_id": payload.get("finished_item_id"),
            "name": payload.get("bom_name", "New BOM"),
            "qty": float(payload.get("output_quantity", 1)),
            "unit": payload.get("output_unit", "KG"),
            "notes": payload.get("notes"),
        })

        # Insert components if provided
        for i, comp in enumerate(payload.get("components", [])):
            await db.execute(text("""
                INSERT INTO bom_components (id, bom_id, item_id, quantity, unit, wastage_pct, seq_no)
                VALUES (:id, :bom_id, :item_id, :qty, :unit, :wastage, :seq)
            """), {
                "id": str(uuid.uuid4()),
                "bom_id": bom_id,
                "item_id": comp.get("item_id"),
                "qty": float(comp.get("quantity", 0)),
                "unit": comp.get("unit", "KG"),
                "wastage": float(comp.get("wastage_pct", 0)),
                "seq": i,
            })

        await db.commit()
        return {"success": True, "id": bom_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bom/{bom_id}")
async def get_bom(
    bom_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    rows = await _rows(db, """
        SELECT bh.id, bh.bom_name, bh.output_quantity, bh.output_unit,
               bh.is_active, bh.notes, bh.created_at::text,
               im.item_name AS finished_item_name, im.item_code, im.unit AS finished_unit
        FROM bom_headers bh
        LEFT JOIN item_master im ON im.id = bh.finished_item_id
        WHERE bh.id = :id
    """, {"id": bom_id})
    if not rows:
        raise HTTPException(status_code=404, detail="BOM not found")
    header = rows[0]
    components = await _rows(db, """
        SELECT bc.id, bc.quantity, bc.unit, bc.wastage_pct, bc.seq_no,
               im.item_name, im.item_code, im.standard_rate
        FROM bom_components bc
        JOIN item_master im ON im.id = bc.item_id
        WHERE bc.bom_id = :bom_id
        ORDER BY bc.seq_no, bc.id
    """, {"bom_id": bom_id})
    header["components"] = components
    return header


@router.patch("/bom/{bom_id}")
async def update_bom(
    bom_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    allowed = {"bom_name", "output_quantity", "output_unit", "notes", "is_active"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        return {"success": False, "message": "No valid fields"}
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = bom_id
    try:
        await db.execute(text(f"UPDATE bom_headers SET {set_clause} WHERE id = :id"), updates)
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bom/{bom_id}/components")
async def add_bom_component(
    bom_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    comp_id = str(uuid.uuid4())
    try:
        await db.execute(text("""
            INSERT INTO bom_components (id, bom_id, item_id, quantity, unit, wastage_pct, seq_no)
            VALUES (:id, :bom_id, :item_id, :qty, :unit, :wastage, :seq)
        """), {
            "id": comp_id,
            "bom_id": bom_id,
            "item_id": payload.get("item_id"),
            "qty": float(payload.get("quantity", 0)),
            "unit": payload.get("unit", "KG"),
            "wastage": float(payload.get("wastage_pct", 0)),
            "seq": payload.get("seq_no", 0),
        })
        await db.commit()
        return {"success": True, "id": comp_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bom/{bom_id}/components/{comp_id}")
async def delete_bom_component(
    bom_id: str, comp_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    try:
        await db.execute(text(
            "DELETE FROM bom_components WHERE id = :id AND bom_id = :bom_id"
        ), {"id": comp_id, "bom_id": bom_id})
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════════
# PRODUCTION ORDER ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/orders")
async def list_production_orders(
    status: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    conditions = []
    params: dict = {"limit": limit}
    if status:
        conditions.append("po.status = :status")
        params["status"] = status
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    orders = await _rows(db, f"""
        SELECT po.id, po.order_number, po.planned_qty, po.actual_qty,
               po.wastage_qty, po.status, po.shift,
               po.planned_date::text, po.started_at::text, po.completed_at::text,
               po.notes,
               bh.bom_name, bh.output_unit,
               im.item_name AS product_name, im.item_code,
               CASE WHEN po.planned_qty > 0
                    THEN ROUND((COALESCE(po.actual_qty,0) / po.planned_qty) * 100, 1)
                    ELSE 0 END AS completion_percent
        FROM production_orders po
        LEFT JOIN bom_headers bh ON bh.id = po.bom_id
        LEFT JOIN item_master im ON im.id = bh.finished_item_id
        {where}
        ORDER BY po.planned_date DESC, po.created_at DESC
        LIMIT :limit
    """, params)
    return {"items": orders, "count": len(orders)}


@router.post("/orders")
async def create_production_order(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    order_id = str(uuid.uuid4())
    # Auto-generate order number
    count = await _scalar(db, "SELECT COUNT(*) FROM production_orders", default=0) or 0
    order_number = f"PO-{date.today().strftime('%Y%m')}-{int(count)+1:04d}"

    try:
        await db.execute(text("""
            INSERT INTO production_orders
                (id, order_number, bom_id, planned_qty, planned_date, shift, notes,
                 status, created_by, created_at, updated_at)
            VALUES
                (:id, :order_number, :bom_id, :qty, :planned_date, :shift, :notes,
                 'planned', :created_by, NOW(), NOW())
        """), {
            "id": order_id,
            "order_number": order_number,
            "bom_id": payload.get("bom_id"),
            "qty": float(payload.get("planned_qty", 1)),
            "planned_date": payload.get("planned_date", str(date.today())),
            "shift": payload.get("shift", "morning"),
            "notes": payload.get("notes"),
            "created_by": str(user.id) if user.id else None,
        })
        await db.commit()
        return {"success": True, "id": order_id, "order_number": order_number}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/orders/{order_id}")
async def update_production_order(
    order_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    set_parts = ["updated_at = NOW()"]
    params: dict = {"id": order_id}

    if "status" in payload:
        set_parts.append("status = :status")
        params["status"] = payload["status"]
        if payload["status"] == "in_progress":
            set_parts.append("started_at = NOW()")
        elif payload["status"] == "completed":
            set_parts.append("completed_at = NOW()")

    for field in ("actual_qty", "wastage_qty", "notes", "shift"):
        if field in payload:
            set_parts.append(f"{field} = :{field}")
            params[field] = payload[field]

    try:
        await db.execute(text(f"""
            UPDATE production_orders SET {', '.join(set_parts)} WHERE id = :id
        """), params)
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{order_id}/bom")
async def get_order_bom(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Return BOM components scaled to this order's planned_qty."""
    await _set_schema(db, user.db_schema)
    row = await _rows(db, """
        SELECT po.planned_qty, bh.output_quantity, bh.id AS bom_id
        FROM production_orders po
        JOIN bom_headers bh ON bh.id = po.bom_id
        WHERE po.id = :id
    """, {"id": order_id})
    if not row:
        raise HTTPException(status_code=404, detail="Order or BOM not found")
    r = row[0]
    factor = float(r["planned_qty"]) / float(r["output_quantity"]) if r["output_quantity"] else 1

    components = await _rows(db, """
        SELECT bc.id, bc.quantity, bc.unit, bc.wastage_pct,
               im.item_name, im.item_code,
               ROUND((bc.quantity * :factor)::numeric, 4) AS required_qty,
               ROUND((bc.quantity * :factor * (1 + bc.wastage_pct/100))::numeric, 4) AS required_with_wastage
        FROM bom_components bc
        JOIN item_master im ON im.id = bc.item_id
        WHERE bc.bom_id = :bom_id
        ORDER BY bc.seq_no
    """, {"bom_id": str(r["bom_id"]), "factor": factor})
    return {"planned_qty": r["planned_qty"], "bom_factor": factor, "components": components}


# ════════════════════════════════════════════════════════════════════════════════
# QC ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

# QC uses a JSONB table — created on first use if not existing
_QC_CREATE_SQL = """
    CREATE TABLE IF NOT EXISTS qc_checks (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        production_order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
        check_name          VARCHAR(100) NOT NULL,
        check_type          VARCHAR(30)  DEFAULT 'visual',
        expected_value      TEXT,
        actual_value        TEXT,
        tolerance_pct       NUMERIC(5,2) DEFAULT 0,
        result              VARCHAR(20)  DEFAULT 'pending',
        checked_by          VARCHAR(100),
        checked_at          TIMESTAMPTZ,
        remarks             TEXT,
        created_at          TIMESTAMPTZ  DEFAULT NOW()
    )
"""


@router.get("/qc")
async def list_qc_checks(
    order_id: Optional[str] = None,
    result: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    try:
        await db.execute(text(_QC_CREATE_SQL))
        await db.commit()
    except Exception:
        await db.rollback()

    conditions, params = [], {"limit": limit}
    if order_id:
        conditions.append("qc.production_order_id = :order_id")
        params["order_id"] = order_id
    if result:
        conditions.append("qc.result = :result")
        params["result"] = result
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    checks = await _rows(db, f"""
        SELECT qc.id, qc.check_name, qc.check_type, qc.expected_value,
               qc.actual_value, qc.tolerance_pct, qc.result,
               qc.checked_by, qc.checked_at::text, qc.remarks,
               qc.created_at::text, qc.production_order_id::text,
               po.order_number, po.planned_qty
        FROM qc_checks qc
        LEFT JOIN production_orders po ON po.id = qc.production_order_id
        {where}
        ORDER BY qc.created_at DESC
        LIMIT :limit
    """, params)
    return {"items": checks, "count": len(checks)}


@router.post("/qc")
async def create_qc_check(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    try:
        await db.execute(text(_QC_CREATE_SQL))
    except Exception:
        await db.rollback()

    qc_id = str(uuid.uuid4())
    try:
        await db.execute(text("""
            INSERT INTO qc_checks
                (id, production_order_id, check_name, check_type,
                 expected_value, tolerance_pct, result, created_at)
            VALUES
                (:id, :order_id, :name, :ctype,
                 :expected, :tolerance, 'pending', NOW())
        """), {
            "id": qc_id,
            "order_id": payload.get("production_order_id"),
            "name": payload.get("check_name"),
            "ctype": payload.get("check_type", "visual"),
            "expected": payload.get("expected_value"),
            "tolerance": float(payload.get("tolerance_pct", 0)),
        })
        await db.commit()
        return {"success": True, "id": qc_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/qc/{qc_id}")
async def update_qc_check(
    qc_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    allowed = {"actual_value", "result", "checked_by", "remarks", "tolerance_pct"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        return {"success": False, "message": "No valid fields"}
    if "result" in updates:
        updates["checked_at"] = "NOW()"
    # Handle NOW() specially
    set_parts = []
    params = {"id": qc_id}
    for k, v in updates.items():
        if v == "NOW()":
            set_parts.append(f"{k} = NOW()")
        else:
            set_parts.append(f"{k} = :{k}")
            params[k] = v
    try:
        await db.execute(text(f"""
            UPDATE qc_checks SET {', '.join(set_parts)} WHERE id = :id
        """), params)
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════════
# REPORT ENDPOINT
# ════════════════════════════════════════════════════════════════════════════════

@router.get("/report")
async def production_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await _set_schema(db, user.db_schema)
    params: dict = {}
    date_filter = ""
    if from_date:
        date_filter += " AND po.planned_date >= :from_date"
        params["from_date"] = from_date
    if to_date:
        date_filter += " AND po.planned_date <= :to_date"
        params["to_date"] = to_date

    summary = await _rows(db, f"""
        SELECT im.item_name,
               COUNT(po.id)                                     AS order_count,
               COALESCE(SUM(po.planned_qty), 0)                 AS total_planned,
               COALESCE(SUM(po.actual_qty), 0)                  AS total_actual,
               COALESCE(SUM(po.wastage_qty), 0)                 AS total_wastage,
               CASE WHEN SUM(po.planned_qty) > 0
                    THEN ROUND((SUM(po.actual_qty)/SUM(po.planned_qty))*100, 1)
                    ELSE 0 END                                   AS efficiency_pct
        FROM production_orders po
        JOIN bom_headers bh ON bh.id = po.bom_id
        JOIN item_master im ON im.id = bh.finished_item_id
        WHERE po.status = 'completed' {date_filter}
        GROUP BY im.item_name
        ORDER BY total_actual DESC
    """, params)

    return {"summary": summary}
