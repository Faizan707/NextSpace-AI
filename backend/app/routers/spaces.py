from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.user import User
from app.schemas.space import SpaceCreate, SpaceCreatorRead, SpaceMembersAdd, SpaceRead, SpaceUpdate
from app.services.space_access import (
    can_manage_space,
    get_company_space,
    require_space_access,
    space_query,
    to_space_read_with_counts,
    to_space_reads,
)

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
def create_space(
    payload: SpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceRead:
    space = Space(
        name=payload.name,
        description=payload.description,
        space_type=payload.space_type,
        company_id=current_user.company_id,
        created_by_id=current_user.id,
    )
    db.add(space)
    db.flush()
    db.add(SpaceMember(space_id=space.id, user_id=current_user.id))
    db.commit()
    created = db.scalar(space_query().where(Space.id == space.id))
    return to_space_read_with_counts(db, created)


@router.get("", response_model=list[SpaceRead])
def list_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SpaceRead]:
    spaces = list(
        db.scalars(
            space_query()
            .join(SpaceMember, SpaceMember.space_id == Space.id)
            .where(
                Space.company_id == current_user.company_id,
                SpaceMember.user_id == current_user.id,
            )
            .order_by(Space.created_at.desc())
        )
        .unique()
        .all()
    )
    return to_space_reads(db, spaces)


@router.get("/{space_id}", response_model=SpaceRead)
def get_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceRead:
    space = get_company_space(db, space_id, current_user.company_id)
    require_space_access(current_user, space)
    return to_space_read_with_counts(db, space)


@router.patch("/{space_id}", response_model=SpaceRead)
def update_space(
    space_id: int,
    payload: SpaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceRead:
    space = get_company_space(db, space_id, current_user.company_id)
    if not can_manage_space(current_user, space):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this space")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(space, field, value)

    db.commit()
    updated = db.scalar(space_query().where(Space.id == space.id))
    return to_space_read_with_counts(db, updated)


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = get_company_space(db, space_id, current_user.company_id)
    if not can_manage_space(current_user, space):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this space")

    db.delete(space)
    db.commit()


@router.get("/{space_id}/members", response_model=list[SpaceCreatorRead])
def list_space_members(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SpaceCreatorRead]:
    space = get_company_space(db, space_id, current_user.company_id)
    require_space_access(current_user, space)
    return [
        SpaceCreatorRead.model_validate(membership.user)
        for membership in space.memberships
        if membership.user is not None
    ]


@router.post("/{space_id}/members", response_model=SpaceRead)
def add_space_members(
    space_id: int,
    payload: SpaceMembersAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceRead:
    space = get_company_space(db, space_id, current_user.company_id)
    if not can_manage_space(current_user, space):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    existing_ids = {membership.user_id for membership in space.memberships}
    users = list(
        db.scalars(
            select(User).where(
                User.company_id == current_user.company_id,
                User.id.in_(payload.user_ids),
            )
        ).all()
    )
    found_ids = {user.id for user in users}
    missing = [user_id for user_id in payload.user_ids if user_id not in found_ids]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more users are not in your company",
        )

    for user in users:
        if user.id not in existing_ids:
            db.add(SpaceMember(space_id=space.id, user_id=user.id))

    db.commit()
    updated = db.scalar(space_query().where(Space.id == space.id))
    return to_space_read_with_counts(db, updated)


@router.delete("/{space_id}/members/{user_id}", response_model=SpaceRead)
def remove_space_member(
    space_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceRead:
    space = get_company_space(db, space_id, current_user.company_id)
    if not can_manage_space(current_user, space):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    if user_id == space.created_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the space creator",
        )

    membership = next((item for item in space.memberships if item.user_id == user_id), None)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in space")

    db.delete(membership)
    db.commit()
    updated = db.scalar(space_query().where(Space.id == space.id))
    return to_space_read_with_counts(db, updated)
