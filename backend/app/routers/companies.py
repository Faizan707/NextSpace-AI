from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_tenant_owner
from app.database import get_db
from app.models.company import Company
from app.models.space import Space
from app.models.user import User
from app.schemas.admin import MemberRead
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> Company:
    if current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already belong to a company",
        )

    company = Company(
        name=payload.name,
        employee_count=payload.employee_count,
        location=payload.location,
    )
    db.add(company)
    db.flush()
    current_user.company_id = company.id
    db.commit()
    db.refresh(company)
    return company


@router.get("/me", response_model=CompanyRead)
def get_my_company(current_user: User = Depends(get_current_user)) -> Company:
    if current_user.company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return current_user.company


@router.get("/me/members", response_model=list[MemberRead])
def list_my_company_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[User]:
    return list(
        db.scalars(
            select(User).where(User.company_id == current_user.company_id).order_by(User.created_at)
        ).all()
    )


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Company:
    if company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> Company:
    if company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> None:
    if company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    company = db.scalar(select(Company).where(Company.id == company_id))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    other_users = db.scalars(
        select(User).where(User.company_id == company_id, User.id != current_user.id)
    ).all()
    if other_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Remove other company members before deleting the company",
        )

    db.execute(delete(Space).where(Space.company_id == company_id))
    db.delete(current_user)
    db.delete(company)
    db.commit()
