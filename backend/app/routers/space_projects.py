from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import Project, ProjectMember
from app.models.team import Team
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.space import ProjectMembersAdd, SpaceCreatorRead
from app.services.notifications import notify_user
from app.services.project_board import ensure_default_stages
from app.services.space_access import (
    can_access_project,
    can_manage_space,
    get_accessible_space,
    require_project_access,
)

router = APIRouter(prefix="/spaces", tags=["space-projects"])


def _project_query():
    return select(Project).options(
        selectinload(Project.created_by),
        selectinload(Project.memberships).selectinload(ProjectMember.user),
    )


def _to_read(project: Project) -> ProjectRead:
    return ProjectRead(
        id=project.id,
        space_id=project.space_id,
        name=project.name,
        description=project.description,
        status=project.status,  # type: ignore[arg-type]
        progress=project.progress,
        deadline=project.deadline,
        created_by_id=project.created_by_id,
        created_by=SpaceCreatorRead.model_validate(project.created_by),
        members=[
            SpaceCreatorRead.model_validate(membership.user)
            for membership in project.memberships
            if membership.user is not None
        ],
        created_at=project.created_at,
    )


def _get_project_in_space(db: Session, space_id: int, project_id: int) -> Project:
    project = db.scalar(
        _project_query().where(Project.id == project_id, Project.space_id == space_id)
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/{space_id}/projects", response_model=list[ProjectRead])
def list_projects(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectRead]:
    space = get_accessible_space(db, space_id, current_user)
    projects = list(
        db.scalars(
            _project_query()
            .where(Project.space_id == space_id)
            .order_by(Project.created_at.desc())
        ).all()
    )
    visible = [
        project for project in projects if can_access_project(current_user, space, project)
    ]
    return [_to_read(project) for project in visible]


@router.post("/{space_id}/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    space_id: int,
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    space = get_accessible_space(db, space_id, current_user)
    space_member_ids = {membership.user_id for membership in space.memberships}

    invalid = [user_id for user_id in payload.member_ids if user_id not in space_member_ids]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project members must already belong to this space",
        )

    project = Project(
        space_id=space_id,
        name=payload.name.strip(),
        description=payload.description,
        status=payload.status,
        progress=0,
        deadline=payload.deadline,
        created_by_id=current_user.id,
    )
    db.add(project)
    db.flush()

    member_ids = set(payload.member_ids)
    member_ids.add(current_user.id)
    for user_id in member_ids:
        db.add(ProjectMember(project_id=project.id, user_id=user_id))

    ensure_default_stages(db, project.id)

    actor_label = current_user.full_name or current_user.email
    for user_id in member_ids:
        notify_user(
            db,
            user_id=user_id,
            actor_id=current_user.id,
            type="project_added",
            title=f"Added to project “{project.name}”",
            body=f"{actor_label} added you to this project.",
            link=f"/app/spaces/{space_id}/projects/{project.id}",
        )

    db.commit()
    created = db.scalar(_project_query().where(Project.id == project.id))
    return _to_read(created)


@router.patch("/{space_id}/projects/{project_id}", response_model=ProjectRead)
def update_project(
    space_id: int,
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    if not (can_manage_space(current_user, space) or project.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this project")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "progress":
            continue  # Derived from Kanban stages
        if field == "name" and isinstance(value, str):
            value = value.strip()
        setattr(project, field, value)

    db.commit()
    updated = db.scalar(_project_query().where(Project.id == project.id))
    return _to_read(updated)


@router.post("/{space_id}/projects/{project_id}/members", response_model=ProjectRead)
def add_project_members(
    space_id: int,
    project_id: int,
    payload: ProjectMembersAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)

    if not (can_manage_space(current_user, space) or project.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    space_member_ids = {membership.user_id for membership in space.memberships}
    existing = {membership.user_id for membership in project.memberships}

    candidate_ids = set(payload.user_ids)
    if payload.team_ids:
        teams = list(
            db.scalars(
                select(Team)
                .options(selectinload(Team.memberships))
                .where(Team.space_id == space_id, Team.id.in_(payload.team_ids))
            ).all()
        )
        found_team_ids = {team.id for team in teams}
        missing_teams = [team_id for team_id in payload.team_ids if team_id not in found_team_ids]
        if missing_teams:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more teams were not found in this space",
            )
        for team in teams:
            for membership in team.memberships:
                candidate_ids.add(membership.user_id)

    invalid = [user_id for user_id in candidate_ids if user_id not in space_member_ids]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project members must already belong to this space",
        )

    newly_added: list[int] = []
    for user_id in candidate_ids:
        if user_id in existing:
            continue
        db.add(ProjectMember(project_id=project.id, user_id=user_id))
        existing.add(user_id)
        newly_added.append(user_id)

    actor_label = current_user.full_name or current_user.email
    for user_id in newly_added:
        notify_user(
            db,
            user_id=user_id,
            actor_id=current_user.id,
            type="project_added",
            title=f"Added to project “{project.name}”",
            body=f"{actor_label} added you to this project.",
            link=f"/app/spaces/{space_id}/projects/{project.id}",
        )

    db.commit()
    updated = db.scalar(_project_query().where(Project.id == project.id))
    return _to_read(updated)


@router.delete("/{space_id}/projects/{project_id}/members/{user_id}", response_model=ProjectRead)
def remove_project_member(
    space_id: int,
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)

    if not (can_manage_space(current_user, space) or project.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    if user_id == project.created_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the project creator",
        )

    membership = next((item for item in project.memberships if item.user_id == user_id), None)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in project")

    db.delete(membership)
    db.commit()
    updated = db.scalar(_project_query().where(Project.id == project.id))
    return _to_read(updated)


@router.delete("/{space_id}/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    space_id: int,
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    if not (can_manage_space(current_user, space) or project.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this project")
    db.delete(project)
    db.commit()
