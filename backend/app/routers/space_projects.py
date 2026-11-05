from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.space import SpaceCreatorRead
from app.services.space_access import get_accessible_space

router = APIRouter(prefix="/spaces", tags=["space-projects"])


def _project_query():
    return select(Project).options(selectinload(Project.created_by))


def _to_read(project: Project) -> ProjectRead:
    return ProjectRead(
        id=project.id,
        space_id=project.space_id,
        name=project.name,
        description=project.description,
        created_by_id=project.created_by_id,
        created_by=SpaceCreatorRead.model_validate(project.created_by),
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
    get_accessible_space(db, space_id, current_user)
    projects = list(
        db.scalars(
            _project_query()
            .where(Project.space_id == space_id)
            .order_by(Project.created_at.desc())
        ).all()
    )
    return [_to_read(project) for project in projects]


@router.post("/{space_id}/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    space_id: int,
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    get_accessible_space(db, space_id, current_user)
    project = Project(
        space_id=space_id,
        name=payload.name.strip(),
        description=payload.description,
        created_by_id=current_user.id,
    )
    db.add(project)
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
    get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "name" and isinstance(value, str):
            value = value.strip()
        setattr(project, field, value)

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
    get_accessible_space(db, space_id, current_user)
    project = _get_project_in_space(db, space_id, project_id)
    db.delete(project)
    db.commit()
