from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.document import Document, DocumentMember
from app.models.project import Project, ProjectMember
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.team import Team, TeamMember
from app.models.user import User, UserRole
from app.schemas.space import SpaceCreatorRead, SpaceRead


def space_query():
    return select(Space).options(
        selectinload(Space.created_by),
        selectinload(Space.memberships).selectinload(SpaceMember.user),
    )


def get_space_counts(
    db: Session,
    space_ids: list[int],
    *,
    user: User | None = None,
) -> dict[int, dict[str, int]]:
    if not space_ids:
        return {}

    counts = {
        space_id: {"projects_count": 0, "teams_count": 0, "documents_count": 0}
        for space_id in space_ids
    }

    project_query = (
        select(Project.space_id, func.count())
        .where(Project.space_id.in_(space_ids))
        .group_by(Project.space_id)
    )
    if user is not None and user.role != UserRole.TENANT_OWNER:
        # Non-owners only count projects they can open (member or creator).
        # Space creators still see every project in spaces they manage via can_manage_space
        # which is applied per-space below when assembling reads.
        project_query = (
            select(Project.space_id, func.count())
            .outerjoin(
                ProjectMember,
                (ProjectMember.project_id == Project.id)
                & (ProjectMember.user_id == user.id),
            )
            .where(
                Project.space_id.in_(space_ids),
                (Project.created_by_id == user.id) | (ProjectMember.id.is_not(None)),
            )
            .group_by(Project.space_id)
        )

    for space_id, total in db.execute(project_query):
        counts[space_id]["projects_count"] = int(total)

    team_query = (
        select(Team.space_id, func.count())
        .where(Team.space_id.in_(space_ids))
        .group_by(Team.space_id)
    )
    if user is not None and user.role != UserRole.TENANT_OWNER:
        team_query = (
            select(Team.space_id, func.count())
            .outerjoin(
                TeamMember,
                (TeamMember.team_id == Team.id) & (TeamMember.user_id == user.id),
            )
            .where(
                Team.space_id.in_(space_ids),
                (Team.created_by_id == user.id) | (TeamMember.id.is_not(None)),
            )
            .group_by(Team.space_id)
        )

    for space_id, total in db.execute(team_query):
        counts[space_id]["teams_count"] = int(total)

    document_query = (
        select(Document.space_id, func.count())
        .where(Document.space_id.in_(space_ids))
        .group_by(Document.space_id)
    )
    if user is not None and user.role != UserRole.TENANT_OWNER:
        document_query = (
            select(Document.space_id, func.count())
            .outerjoin(
                DocumentMember,
                (DocumentMember.document_id == Document.id)
                & (DocumentMember.user_id == user.id),
            )
            .where(
                Document.space_id.in_(space_ids),
                (Document.uploaded_by_id == user.id) | (DocumentMember.id.is_not(None)),
            )
            .group_by(Document.space_id)
        )

    for space_id, total in db.execute(document_query):
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


def to_space_reads(db: Session, spaces: list[Space], user: User | None = None) -> list[SpaceRead]:
    counts_by_id = get_space_counts(db, [space.id for space in spaces], user=user)
    # Space managers / tenant owners see true project + team totals for spaces they manage.
    manager_space_ids = [
        space.id
        for space in spaces
        if user is not None and can_manage_space(user, space)
    ]
    if manager_space_ids:
        full_counts = get_space_counts(db, manager_space_ids, user=None)
        for space_id, values in full_counts.items():
            counts_by_id[space_id]["projects_count"] = values["projects_count"]
            counts_by_id[space_id]["teams_count"] = values["teams_count"]
            counts_by_id[space_id]["documents_count"] = values["documents_count"]

    return [
        to_space_read(
            space,
            projects_count=counts_by_id.get(space.id, {}).get("projects_count", 0),
            teams_count=counts_by_id.get(space.id, {}).get("teams_count", 0),
            documents_count=counts_by_id.get(space.id, {}).get("documents_count", 0),
        )
        for space in spaces
    ]


def to_space_read_with_counts(db: Session, space: Space, user: User | None = None) -> SpaceRead:
    return to_space_reads(db, [space], user=user)[0]


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


def is_project_member(project: Project, user_id: int) -> bool:
    return any(membership.user_id == user_id for membership in project.memberships)


def can_access_project(user: User, space: Space, project: Project) -> bool:
    """Project is visible only to members, the project creator, or space managers."""
    return (
        can_manage_space(user, space)
        or project.created_by_id == user.id
        or is_project_member(project, user.id)
    )


def can_write_project(user: User, space: Space, project: Project) -> bool:
    """Same people who can see a project can mutate its board."""
    return can_access_project(user, space, project)


def require_project_access(user: User, space: Space, project: Project) -> None:
    if can_access_project(user, space, project):
        return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


def require_project_write(user: User, space: Space, project: Project) -> None:
    if can_write_project(user, space, project):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only project members can change this board",
    )


def is_team_member(team: Team, user_id: int) -> bool:
    return any(membership.user_id == user_id for membership in team.memberships)


def can_access_team(user: User, space: Space, team: Team) -> bool:
    """Team is visible only to members, the team creator, or space managers."""
    return (
        can_manage_space(user, space)
        or team.created_by_id == user.id
        or is_team_member(team, user.id)
    )


def require_team_access(user: User, space: Space, team: Team) -> None:
    if can_access_team(user, space, team):
        return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")


def is_document_member(document: Document, user_id: int) -> bool:
    return any(membership.user_id == user_id for membership in document.memberships)


def can_access_document(user: User, space: Space, document: Document) -> bool:
    """Document is visible only to members, the uploader, or space managers."""
    return (
        can_manage_space(user, space)
        or document.uploaded_by_id == user.id
        or is_document_member(document, user.id)
    )


def require_document_access(user: User, space: Space, document: Document) -> None:
    if can_access_document(user, space, document):
        return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
