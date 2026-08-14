from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uuid

from shared.database import get_db, provision_company_schema
from shared.auth import get_current_user, CurrentUser

router = APIRouter()

class CreateCompanyPayload(BaseModel):
    name: str
    gstin: Optional[str] = None
    plan: str = "starter"
    parent_id: Optional[str] = None
    sub_admin_name: str
    sub_admin_phone: str

@router.get("/companies")
async def get_companies(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can access the business tree."
        )
    
    companies_res = await db.execute(text("""
        SELECT id, name, gstin, plan, parent_id, db_schema, subscription_start, subscription_expiry, is_active 
        FROM public.companies
    """))
    companies_rows = companies_res.fetchall()
    
    users_res = await db.execute(text("""
        SELECT id, phone, name, role, email, company_id 
        FROM public.users
    """))
    users_rows = users_res.fetchall()
    
    companies = []
    for c in companies_rows:
        admins = [
            {"name": u.name, "phone": u.phone, "role": u.role, "email": u.email or ""}
            for u in users_rows
            if u.company_id == c.id
        ]
        companies.append({
            "id": str(c.id),
            "name": c.name,
            "gstin": c.gstin or "",
            "plan": c.plan or "starter",
            "parent_id": str(c.parent_id) if c.parent_id else None,
            "db_schema": c.db_schema,
            "subscription_start": c.subscription_start.isoformat() if c.subscription_start else None,
            "subscription_expiry": c.subscription_expiry.isoformat() if c.subscription_expiry else None,
            "is_active": c.is_active,
            "admins": admins
        })
        
    return {"companies": companies}

@router.post("/companies")
async def create_company(
    body: CreateCompanyPayload,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can create business nodes."
        )
        
    sanitized_name = "".join(e for e in body.name.lower() if e.isalnum() or e == "_")
    db_schema = f"co_{sanitized_name}_{uuid.uuid4().hex[:6]}"
    
    co_id = uuid.uuid4()
    parent_uuid = uuid.UUID(body.parent_id) if body.parent_id else None
    
    try:
        await db.execute(text("""
            INSERT INTO public.companies (id, name, gstin, plan, db_schema, parent_id)
            VALUES (:id, :name, :gstin, :plan, :db_schema, :parent_id)
        """), {
            "id": co_id,
            "name": body.name,
            "gstin": body.gstin,
            "plan": body.plan,
            "db_schema": db_schema,
            "parent_id": parent_uuid
        })
        
        await provision_company_schema(db_schema)
        
        user_id = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO public.users (id, phone, name, company_id, role)
            VALUES (:id, :phone, :name, :company_id, 'company_admin')
        """), {
            "id": user_id,
            "phone": body.sub_admin_phone,
            "name": body.sub_admin_name,
            "company_id": co_id
        })
        
        await db.commit()
        
        return {
            "success": True,
            "company_id": str(co_id),
            "sub_admin_id": str(user_id),
            "message": f"Successfully created company '{body.name}' and sub-admin account."
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create business node: {str(e)}"
        )

class CreateUserPayload(BaseModel):
    name: str
    phone: str
    role: str
    company_id: str

@router.post("/users")
async def create_user(
    body: CreateUserPayload,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can create users."
        )
        
    user_id = uuid.uuid4()
    try:
        await db.execute(text("""
            INSERT INTO public.users (id, phone, name, company_id, role)
            VALUES (:id, :phone, :name, :company_id, :role)
        """), {
            "id": user_id,
            "phone": body.phone,
            "name": body.name,
            "company_id": uuid.UUID(body.company_id),
            "role": body.role
        })
        await db.commit()
        
        return {
            "success": True,
            "user_id": str(user_id),
            "message": f"Successfully created user '{body.name}'."
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}"
        )

class BulkUserItem(BaseModel):
    name: str
    phone: str
    role: str

class CreateUsersBulkPayload(BaseModel):
    company_id: str
    users: List[BulkUserItem]

@router.post("/users/bulk")
async def create_users_bulk(
    body: CreateUsersBulkPayload,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can bulk create users."
        )
        
    company_uuid = uuid.UUID(body.company_id)
    created_count = 0
    try:
        for u in body.users:
            user_id = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO public.users (id, phone, name, company_id, role)
                VALUES (:id, :phone, :name, :company_id, :role)
            """), {
                "id": user_id,
                "phone": u.phone,
                "name": u.name,
                "company_id": company_uuid,
                "role": u.role
            })
            created_count += 1
        await db.commit()
        
        return {
            "success": True,
            "count": created_count,
            "message": f"Successfully created {created_count} users."
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to bulk create users: {str(e)}"
        )

