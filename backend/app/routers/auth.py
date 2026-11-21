from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user, oauth2_scheme
from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models.company import Company
from app.models.invite import Invite, InviteStatus
from app.models.user import User, UserRole
from app.rate_limit import limiter
from app.schemas.auth import Token
from app.schemas.invite import InviteAccept, InvitePublicRead
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    company = Company(
        name=payload.company.name,
        employee_count=payload.company.employee_count,
        location=payload.company.location,
    )
    db.add(company)
    db.flush()

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.TENANT_OWNER,
        company_id=company.id,
    )
    db.add(user)
    db.commit()

    return db.scalar(
        select(User).options(selectinload(User.company)).where(User.id == user.id)
    )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    user = db.scalar(select(User).where(User.email == form_data.username))
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=create_access_token(
            subject=user.email,
            company_id=user.company_id,
            role=user.role,
        )
    )


@router.get("/me", response_model=UserRead)
def me(
    _: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


@router.get("/invites/{token}", response_model=InvitePublicRead)
def get_invite(token: str, db: Session = Depends(get_db)) -> InvitePublicRead:
    invite = db.scalar(
        select(Invite).options(selectinload(Invite.company)).where(Invite.token == token)
    )
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return InvitePublicRead(
        email=invite.email,
        company_name=invite.company.name if invite.company else "Company",
        status=invite.status,
    )


@router.post("/invites/{token}/accept", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def accept_invite(
    request: Request,
    token: str,
    payload: InviteAccept,
    db: Session = Depends(get_db),
) -> User:
    invite = db.scalar(
        select(Invite).options(selectinload(Invite.company)).where(Invite.token == token)
    )
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite is no longer valid")
    if invite.send_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite already created an account. Please sign in.",
        )

    existing = db.scalar(select(User).where(User.email == invite.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    user = User(
        email=invite.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name or invite.full_name,
        job_role=invite.job_role,
        role=UserRole.MEMBER,
        company_id=invite.company_id,
    )
    db.add(user)
    invite.status = InviteStatus.ACCEPTED
    invite.accepted_at = datetime.now(UTC)
    db.commit()

    return db.scalar(
        select(User).options(selectinload(User.company)).where(User.id == user.id)
    )
