from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.document import Document
from app.models.project import Project
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreatorRead, SpaceRead


def space_query():
    return select(Space).options(
        selectinload(Space.created_by),
        selectinload(Space.memberships).selectinload(SpaceMember.user),
    )


def get_space_counts(db: Session, space_ids: list[int]) -> dict[int, dict[str, int]]:
    if not space_ids:
        return {}

    counts = {
        space_id: {"projects_count": 0, "teams_count": 0, "documents_count": 0}
        for space_id in space_ids
    }

    for space_id, total in db.execute(
        select(Project.space_id, func.count())
        .where(Project.space_id.in_(space_ids))
        .group_by(Project.space_id)
    ):
        counts[space_id]["projects_count"] = int(total)

    for space_id, total in db.execute(
        select(Team.space_id, func.count())
        .where(Team.space_id.in_(space_ids))
        .group_by(Team.space_id)
    ):
        counts[space_id]["teams_count"] = int(total)

    for space_id, total in db.execute(
        select(Document.space_id, func.count())
        .where(Document.space_id.in_(space_ids))
        .group_by(Document.space_id)
    ):
        counts[space_id]["documents_count"] = int(total)

    return counts


def to_space_read(
    space: Space,
    *,
    projects_count: int = 0,
    teams_count: int = 0,
    documents_count: int = 0,
) -> SpaceRead:
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
        projects_count=projects_count,
        teams_count=teams_count,
        documents_count=documents_count,
        created_at=space.created_at,
    )


def to_space_reads(db: Session, spaces: list[Space]) -> list[SpaceRead]:
    counts_by_id = get_space_counts(db, [space.id for space in spaces])
    return [
        to_space_read(
            space,
            projects_count=counts_by_id.get(space.id, {}).get("projects_count", 0),
            teams_count=counts_by_id.get(space.id, {}).get("teams_count", 0),
            documents_count=counts_by_id.get(space.id, {}).get("documents_count", 0),
        )
        for space in spaces
    ]


def to_space_read_with_counts(db: Session, space: Space) -> SpaceRead:
    return to_space_reads(db, [space])[0]


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
