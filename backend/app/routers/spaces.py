from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.space import Space
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreate, SpaceRead, SpaceUpdate

router = APIRouter(prefix="/spaces", tags=["spaces"])


def _get_company_space(db: Session, space_id: int, company_id: int) -> Space:
    space = db.scalar(
        select(Space).where(Space.id == space_id, Space.company_id == company_id)
    )
    if space is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return space


def _can_manage_space(user: User, space: Space) -> bool:
    return user.role == UserRole.TENANT_OWNER or space.created_by_id == user.id


@router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
def create_space(
    payload: SpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Space:
    space = Space(
        name=payload.name,
        description=payload.description,
        space_type=payload.space_type,
        company_id=current_user.company_id,
        created_by_id=current_user.id,
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


@router.get("", response_model=list[SpaceRead])
def list_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Space]:
    return list(
        db.scalars(select(Space).where(Space.company_id == current_user.company_id)).all()
    )


@router.get("/{space_id}", response_model=SpaceRead)
def get_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Space:
    return _get_company_space(db, space_id, current_user.company_id)


@router.patch("/{space_id}", response_model=SpaceRead)
def update_space(
    space_id: int,
    payload: SpaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Space:
    space = _get_company_space(db, space_id, current_user.company_id)
    if not _can_manage_space(current_user, space):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this space")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(space, field, value)

    db.commit()
    db.refresh(space)
    return space


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = _get_company_space(db, space_id, current_user.company_id)
    if not _can_manage_space(current_user, space):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this space")

    db.delete(space)
    db.commit()
