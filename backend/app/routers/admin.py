import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import require_tenant_owner
from app.auth.password import hash_password
from app.config import get_settings
from app.database import get_db
from app.models.invite import Invite, InviteStatus
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.user import User, UserRole
from app.schemas.admin import AdminOverview, MemberRead, MemberUpdate
from app.schemas.invite import InviteCreate, InviteCreateResult, InviteRead
from app.schemas.space import SpaceRead
from app.services.email import send_email
from app.services.space_access import to_space_reads

router = APIRouter(prefix="/admin", tags=["admin"])


def _generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> AdminOverview:
    users = list(
        db.scalars(
            select(User).where(User.company_id == current_user.company_id).order_by(User.created_at)
        ).all()
    )
    spaces = list(
        db.scalars(
            select(Space)
            .options(
                selectinload(Space.created_by),
                selectinload(Space.memberships).selectinload(SpaceMember.user),
            )
            .where(Space.company_id == current_user.company_id)
            .order_by(Space.created_at.desc())
        ).all()
    )
    return AdminOverview(users=users, spaces=to_space_reads(db, spaces))


@router.get("/users", response_model=list[MemberRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> list[User]:
    return list(
        db.scalars(select(User).where(User.company_id == current_user.company_id).order_by(User.created_at)).all()
    )


@router.get("/spaces", response_model=list[SpaceRead])
def list_org_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> list[SpaceRead]:
    spaces = list(
        db.scalars(
            select(Space)
            .options(
                selectinload(Space.created_by),
                selectinload(Space.memberships).selectinload(SpaceMember.user),
            )
            .where(Space.company_id == current_user.company_id)
            .order_by(Space.created_at.desc())
        ).all()
    )
    return to_space_reads(db, spaces)


@router.get("/invites", response_model=list[InviteRead])
def list_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> list[Invite]:
    return list(
        db.scalars(
            select(Invite)
            .where(Invite.company_id == current_user.company_id)
            .order_by(Invite.created_at.desc())
        ).all()
    )


@router.post("/invites", response_model=InviteCreateResult, status_code=status.HTTP_201_CREATED)
def create_invite(
    payload: InviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> InviteCreateResult:
    email = payload.email.lower().strip()
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    pending = db.scalar(
        select(Invite).where(
            Invite.email == email,
            Invite.company_id == current_user.company_id,
            Invite.status == InviteStatus.PENDING,
        )
    )
    if pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite already pending for this email")

    settings = get_settings()
    token = secrets.token_urlsafe(32)
    job_role = payload.job_role.strip() if payload.job_role else None
    full_name = payload.full_name.strip() if payload.full_name else None

    invite = Invite(
        email=email,
        full_name=full_name,
        job_role=job_role,
        token=token,
        status=InviteStatus.PENDING,
        send_password=payload.send_password,
        company_id=current_user.company_id,
        invited_by_id=current_user.id,
    )
    db.add(invite)

    temporary_password: str | None = None
    invite_link: str | None = None
    company_name = current_user.company.name if current_user.company else "your company"

    if payload.send_password:
        temporary_password = _generate_password()
        user = User(
            email=email,
            hashed_password=hash_password(temporary_password),
            full_name=full_name,
            job_role=job_role,
            role=UserRole.MEMBER,
            company_id=current_user.company_id,
        )
        db.add(user)
        invite.status = InviteStatus.ACCEPTED
        from datetime import UTC, datetime

        invite.accepted_at = datetime.now(UTC)
        login_url = f"{settings.frontend_url.rstrip('/')}/login"
        send_email(
            to=email,
            subject=f"You're invited to {company_name} on {settings.app_name}",
            body=(
                f"Hi{f' {full_name}' if full_name else ''},\n\n"
                f"You have been added to {company_name} on {settings.app_name}.\n\n"
                f"Email: {email}\n"
                f"{f'Role: {job_role}\n' if job_role else ''}"
                f"Temporary password: {temporary_password}\n\n"
                f"Sign in here: {login_url}\n"
                "Please change your password after logging in.\n"
            ),
        )
    else:
        invite_link = f"{settings.frontend_url.rstrip('/')}/invite/{token}"
        send_email(
            to=email,
            subject=f"Invitation to join {company_name} on {settings.app_name}",
            body=(
                f"Hi{f' {full_name}' if full_name else ''},\n\n"
                f"You have been invited to join {company_name} on {settings.app_name}.\n\n"
                f"{f'Role: {job_role}\n\n' if job_role else ''}"
                f"Accept your invite and set a password here:\n{invite_link}\n"
            ),
        )

    db.commit()
    db.refresh(invite)
    return InviteCreateResult(
        invite=InviteRead.model_validate(invite),
        temporary_password=temporary_password,
        invite_link=invite_link,
    )


@router.post("/invites/{invite_id}/revoke", response_model=InviteRead)
def revoke_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> Invite:
    invite = db.scalar(
        select(Invite).where(
            Invite.id == invite_id,
            Invite.company_id == current_user.company_id,
        )
    )
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.status != InviteStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending invites can be revoked",
        )

    invite.status = InviteStatus.REVOKED
    db.commit()
    db.refresh(invite)
    return invite


@router.patch("/users/{user_id}", response_model=MemberRead)
def update_user(
    user_id: int,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> User:
    target = db.scalar(
        select(User).where(User.id == user_id, User.company_id == current_user.company_id)
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data:
        value = data["full_name"]
        target.full_name = value.strip() if isinstance(value, str) and value.strip() else None
    if "job_role" in data:
        value = data["job_role"]
        target.job_role = value.strip() if isinstance(value, str) and value.strip() else None

    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_user_access(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_owner),
) -> None:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot revoke your own access",
        )

    target = db.scalar(
        select(User).where(User.id == user_id, User.company_id == current_user.company_id)
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.role == UserRole.TENANT_OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke tenant owner access",
        )

    db.execute(delete(SpaceMember).where(SpaceMember.user_id == target.id))

    owned_spaces = list(db.scalars(select(Space).where(Space.created_by_id == target.id)).all())
    for space in owned_spaces:
        space.created_by_id = current_user.id
        owner_membership = db.scalar(
            select(SpaceMember).where(
                SpaceMember.space_id == space.id,
                SpaceMember.user_id == current_user.id,
            )
        )
        if owner_membership is None:
            db.add(SpaceMember(space_id=space.id, user_id=current_user.id))

    db.execute(
        delete(Invite).where(
            Invite.email == target.email,
            Invite.company_id == current_user.company_id,
        )
    )
    db.delete(target)
    db.commit()
