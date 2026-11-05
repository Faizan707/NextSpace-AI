import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentRead
from app.schemas.space import SpaceCreatorRead
from app.services.space_access import get_accessible_space
from app.services.uploads import UPLOADS_ROOT, space_upload_dir

router = APIRouter(prefix="/spaces", tags=["space-documents"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _document_query():
    return select(Document).options(selectinload(Document.uploaded_by))


def _to_read(document: Document) -> DocumentRead:
    return DocumentRead(
        id=document.id,
        space_id=document.space_id,
        original_name=document.original_name,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        uploaded_by_id=document.uploaded_by_id,
        uploaded_by=SpaceCreatorRead.model_validate(document.uploaded_by),
        created_at=document.created_at,
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
    get_accessible_space(db, space_id, current_user)
    documents = list(
        db.scalars(
            _document_query()
            .where(Document.space_id == space_id)
            .order_by(Document.created_at.desc())
        ).all()
    )
    return [_to_read(document) for document in documents]


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
    db.commit()
    created = db.scalar(_document_query().where(Document.id == document.id))
    return _to_read(created)


@router.get("/{space_id}/documents/{document_id}/download")
def download_document(
    space_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)

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
    get_accessible_space(db, space_id, current_user)
    document = _get_document_in_space(db, space_id, document_id)
    file_path = UPLOADS_ROOT / document.stored_path
    db.delete(document)
    db.commit()
    if file_path.exists():
        file_path.unlink(missing_ok=True)
