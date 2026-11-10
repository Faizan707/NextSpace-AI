from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.document import Document, DocumentMember
from app.models.project import Project, ProjectMember
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.space import SpaceCreate, SpaceCreatorRead, SpaceMembersAdd, SpaceRead, SpaceUpdate
from app.services.notifications import notify_user
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
    return to_space_read_with_counts(db, created, user=current_user)


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
    return to_space_reads(db, spaces, user=current_user)


@router.get("/{space_id}", response_model=SpaceRead)
def get_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceRead:
    space = get_company_space(db, space_id, current_user.company_id)
    require_space_access(current_user, space)
    return to_space_read_with_counts(db, space, user=current_user)


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
    return to_space_read_with_counts(db, updated, user=current_user)


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

    newly_added: list[User] = []
    for user in users:
        if user.id not in existing_ids:
            db.add(SpaceMember(space_id=space.id, user_id=user.id))
            newly_added.append(user)

    actor_label = current_user.full_name or current_user.email
    for user in newly_added:
        notify_user(
            db,
            user_id=user.id,
            actor_id=current_user.id,
            type="space_added",
            title=f"Added to space “{space.name}”",
            body=f"{actor_label} added you to this space.",
            link=f"/app/spaces/{space.id}",
        )

    db.commit()
    updated = db.scalar(space_query().where(Space.id == space.id))
    return to_space_read_with_counts(db, updated, user=current_user)


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

    project_ids = list(db.scalars(select(Project.id).where(Project.space_id == space.id)).all())
    if project_ids:
        db.execute(
            delete(ProjectMember).where(
                ProjectMember.project_id.in_(project_ids),
                ProjectMember.user_id == user_id,
            )
        )

    team_ids = list(db.scalars(select(Team.id).where(Team.space_id == space.id)).all())
    if team_ids:
        db.execute(
            delete(TeamMember).where(
                TeamMember.team_id.in_(team_ids),
                TeamMember.user_id == user_id,
            )
        )

    document_ids = list(db.scalars(select(Document.id).where(Document.space_id == space.id)).all())
    if document_ids:
        db.execute(
            delete(DocumentMember).where(
                DocumentMember.document_id.in_(document_ids),
                DocumentMember.user_id == user_id,
            )
        )

    db.delete(membership)
    db.commit()
    updated = db.scalar(space_query().where(Space.id == space.id))
    return to_space_read_with_counts(db, updated, user=current_user)
