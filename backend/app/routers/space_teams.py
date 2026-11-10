from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.space_member import SpaceMember
from app.models.team import Team, TeamMember
from app.models.user import User
from app.schemas.space import SpaceCreatorRead, SpaceMembersAdd
from app.schemas.team import TeamCreate, TeamRead, TeamUpdate
from app.services.space_access import (
    can_access_team,
    can_manage_space,
    get_accessible_space,
    require_team_access,
)

router = APIRouter(prefix="/spaces", tags=["space-teams"])


def _team_query():
    return select(Team).options(
        selectinload(Team.created_by),
        selectinload(Team.memberships).selectinload(TeamMember.user),
    )


def _to_read(team: Team) -> TeamRead:
    return TeamRead(
        id=team.id,
        space_id=team.space_id,
        name=team.name,
        description=team.description,
        created_by_id=team.created_by_id,
        created_by=SpaceCreatorRead.model_validate(team.created_by),
        members=[
            SpaceCreatorRead.model_validate(membership.user)
            for membership in team.memberships
            if membership.user is not None
        ],
        created_at=team.created_at,
    )


def _get_team_in_space(db: Session, space_id: int, team_id: int) -> Team:
    team = db.scalar(_team_query().where(Team.id == team_id, Team.space_id == space_id))
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.get("/{space_id}/teams", response_model=list[TeamRead])
def list_teams(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TeamRead]:
    space = get_accessible_space(db, space_id, current_user)
    teams = list(
        db.scalars(
            _team_query().where(Team.space_id == space_id).order_by(Team.created_at.desc())
        ).all()
    )
    visible = [team for team in teams if can_access_team(current_user, space, team)]
    return [_to_read(team) for team in visible]


@router.post("/{space_id}/teams", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    space_id: int,
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamRead:
    space = get_accessible_space(db, space_id, current_user)
    space_member_ids = {membership.user_id for membership in space.memberships}

    invalid = [user_id for user_id in payload.member_ids if user_id not in space_member_ids]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team members must already belong to this space",
        )

    team = Team(
        space_id=space_id,
        name=payload.name.strip(),
        description=payload.description,
        created_by_id=current_user.id,
    )
    db.add(team)
    db.flush()

    member_ids = set(payload.member_ids)
    member_ids.add(current_user.id)
    for user_id in member_ids:
        if user_id not in space_member_ids:
            db.add(SpaceMember(space_id=space_id, user_id=user_id))
            space_member_ids.add(user_id)
        db.add(TeamMember(team_id=team.id, user_id=user_id))

    db.commit()
    created = db.scalar(_team_query().where(Team.id == team.id))
    return _to_read(created)


@router.patch("/{space_id}/teams/{team_id}", response_model=TeamRead)
def update_team(
    space_id: int,
    team_id: int,
    payload: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamRead:
    space = get_accessible_space(db, space_id, current_user)
    team = _get_team_in_space(db, space_id, team_id)
    require_team_access(current_user, space, team)

    if not (can_manage_space(current_user, space) or team.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this team")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "name" and isinstance(value, str):
            value = value.strip()
        setattr(team, field, value)

    db.commit()
    updated = db.scalar(_team_query().where(Team.id == team.id))
    return _to_read(updated)


@router.post("/{space_id}/teams/{team_id}/members", response_model=TeamRead)
def add_team_members(
    space_id: int,
    team_id: int,
    payload: SpaceMembersAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamRead:
    space = get_accessible_space(db, space_id, current_user)
    team = _get_team_in_space(db, space_id, team_id)
    require_team_access(current_user, space, team)

    if not (can_manage_space(current_user, space) or team.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    space_member_ids = {membership.user_id for membership in space.memberships}
    existing = {membership.user_id for membership in team.memberships}

    invalid = [user_id for user_id in payload.user_ids if user_id not in space_member_ids]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team members must already belong to this space",
        )

    for user_id in payload.user_ids:
        if user_id in existing:
            continue
        db.add(TeamMember(team_id=team.id, user_id=user_id))
        existing.add(user_id)

    db.commit()
    updated = db.scalar(_team_query().where(Team.id == team.id))
    return _to_read(updated)


@router.delete("/{space_id}/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    space_id: int,
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = get_accessible_space(db, space_id, current_user)
    team = _get_team_in_space(db, space_id, team_id)

    if not (can_manage_space(current_user, space) or team.created_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this team")

    db.delete(team)
    db.commit()
