import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.document import Document, DocumentMember
from app.models.user import User
from app.schemas.document import ComplianceFinding, DocumentRead
from app.schemas.space import SpaceCreatorRead, SpaceMembersAdd
from app.services.document_compliance import (
    apply_compliance_result,
    parse_findings_json,
    run_compliance_check,
)
from app.services.notifications import notify_user
from app.services.space_access import (
    can_access_document,
    can_manage_space,
    get_accessible_space,
    require_document_access,
)
from app.services.uploads import UPLOADS_ROOT, space_upload_dir

router = APIRouter(prefix="/spaces", tags=["space-documents"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _document_query():
    return select(Document).options(
        selectinload(Document.uploaded_by),
        selectinload(Document.memberships).selectinload(DocumentMember.user),
    )


def _to_read(document: Document) -> DocumentRead:
    findings = [
        ComplianceFinding.model_validate(item)
        for item in parse_findings_json(document.compliance_findings_json)
    ]
    return DocumentRead(
        id=document.id,
        space_id=document.space_id,
        original_name=document.original_name,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        uploaded_by_id=document.uploaded_by_id,
        uploaded_by=SpaceCreatorRead.model_validate(document.uploaded_by),
        members=[
            SpaceCreatorRead.model_validate(membership.user)
            for membership in document.memberships
            if membership.user is not None
        ],
        created_at=document.created_at,
        compliance_status=document.compliance_status or "pending",
        compliance_summary=document.compliance_summary,
        compliance_score=document.compliance_score,
        compliance_findings=findings,
        compliance_checked_at=document.compliance_checked_at,
        compliance_engine=document.compliance_engine,
    )


def _get_document_in_space(db: Session, space_id: int, document_id: int) -> Document:
    document = db.scalar(
        _document_query().where(Document.id == document_id, Document.space_id == space_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/{space_id}/documents", response_model=list[DocumentRead])
def list_documents(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentRead]:
    space = get_accessible_space(db, space_id, current_user)
    documents = list(
        db.scalars(
            _document_query()
            .where(Document.space_id == space_id)
            .order_by(Document.created_at.desc())
        ).all()
    )
    visible = [
        document for document in documents if can_access_document(current_user, space, document)
    ]
    return [_to_read(document) for document in visible]


@router.post(
    "/{space_id}/documents",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    space_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    get_accessible_space(db, space_id, current_user)

    original_name = Path(file.filename or "upload.bin").name
    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 25MB)")

    suffix = Path(original_name).suffix[:40]
    stored_name = f"{secrets.token_urlsafe(16)}{suffix}"
    dest_path = space_upload_dir(space_id) / stored_name
    dest_path.write_bytes(data)

    document = Document(
        space_id=space_id,
        original_name=original_name,
        stored_path=f"spaces/{space_id}/{stored_name}",
        content_type=file.content_type,
        size_bytes=len(data),
        uploaded_by_id=current_user.id,
    )
    db.add(document)
    db.flush()
    db.add(DocumentMember(document_id=document.id, user_id=current_user.id))
    db.commit()
    created = db.scalar(_document_query().where(Document.id == document.id))
    return _to_read(created)


@router.post("/{space_id}/documents/{document_id}/members", response_model=DocumentRead)
def add_document_members(
    space_id: int,
    document_id: int,
    payload: SpaceMembersAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    space = get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)
    require_document_access(current_user, space, document)

    if not (can_manage_space(current_user, space) or document.uploaded_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    space_member_ids = {membership.user_id for membership in space.memberships}
    existing = {membership.user_id for membership in document.memberships}

    invalid = [user_id for user_id in payload.user_ids if user_id not in space_member_ids]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document members must already belong to this space",
        )

    newly_added: list[int] = []
    for user_id in payload.user_ids:
        if user_id in existing:
            continue
        db.add(DocumentMember(document_id=document.id, user_id=user_id))
        existing.add(user_id)
        newly_added.append(user_id)

    actor_label = current_user.full_name or current_user.email
    for user_id in newly_added:
        notify_user(
            db,
            user_id=user_id,
            actor_id=current_user.id,
            type="document_shared",
            title=f"Shared document “{document.original_name}”",
            body=f"{actor_label} shared a document with you.",
            link=f"/app/spaces/{space_id}",
        )

    db.commit()
    updated = db.scalar(_document_query().where(Document.id == document.id))
    return _to_read(updated)


@router.delete(
    "/{space_id}/documents/{document_id}/members/{user_id}",
    response_model=DocumentRead,
)
def remove_document_member(
    space_id: int,
    document_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    space = get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)
    require_document_access(current_user, space, document)

    if not (can_manage_space(current_user, space) or document.uploaded_by_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage members")

    if user_id == document.uploaded_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the document uploader",
        )

    membership = next((item for item in document.memberships if item.user_id == user_id), None)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found on document")

    db.delete(membership)
    db.commit()
    updated = db.scalar(_document_query().where(Document.id == document.id))
    return _to_read(updated)


@router.post(
    "/{space_id}/documents/{document_id}/compliance-check",
    response_model=DocumentRead,
)
def run_document_compliance_check(
    space_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    space = get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)
    require_document_access(current_user, space, document)

    file_path = UPLOADS_ROOT / document.stored_path
    result = run_compliance_check(document, file_path)
    apply_compliance_result(document, result)
    db.commit()

    updated = db.scalar(_document_query().where(Document.id == document.id))
    return _to_read(updated)


@router.get("/{space_id}/documents/{document_id}/download")
def download_document(
    space_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    space = get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)
    require_document_access(current_user, space, document)

    file_path = UPLOADS_ROOT / document.stored_path
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")

    return FileResponse(
        path=file_path,
        filename=document.original_name,
        media_type=document.content_type or "application/octet-stream",
    )


@router.delete("/{space_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    space_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    space = get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)

    if not (can_manage_space(current_user, space) or document.uploaded_by_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this document",
        )

    file_path = UPLOADS_ROOT / document.stored_path
    db.delete(document)
    db.commit()
    if file_path.exists():
        file_path.unlink(missing_ok=True)
