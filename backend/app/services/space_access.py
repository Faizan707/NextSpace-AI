from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreatorRead, SpaceRead


def space_query():
    return select(Space).options(
        selectinload(Space.created_by),
        selectinload(Space.memberships).selectinload(SpaceMember.user),
    )


def to_space_read(space: Space) -> SpaceRead:
    members = [
        SpaceCreatorRead.model_validate(membership.user)
        for membership in space.memberships
        if membership.user is not None
    ]
    return SpaceRead(
        id=space.id,
        name=space.name,
        description=space.description,
        space_type=space.space_type,
        company_id=space.company_id,
        created_by_id=space.created_by_id,
        created_by=SpaceCreatorRead.model_validate(space.created_by),
        members=members,
        created_at=space.created_at,
    )


def get_company_space(db: Session, space_id: int, company_id: int) -> Space:
    space = db.scalar(space_query().where(Space.id == space_id, Space.company_id == company_id))
    if space is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return space


def is_space_member(space: Space, user_id: int) -> bool:
    return any(membership.user_id == user_id for membership in space.memberships)


def can_manage_space(user: User, space: Space) -> bool:
    return user.role == UserRole.TENANT_OWNER or space.created_by_id == user.id


def require_space_access(user: User, space: Space) -> None:
    if can_manage_space(user, space) or is_space_member(space, user.id):
        return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")


def get_accessible_space(db: Session, space_id: int, user: User) -> Space:
    space = get_company_space(db, space_id, user.company_id)
    require_space_access(user, space)
    return space
