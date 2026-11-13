from __future__ import annotations

import logging
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status
from fastapi.responses import FileResponse, Response, StreamingResponse
from urllib.parse import quote

from app.config import get_settings
from app.services.uploads import UPLOADS_ROOT

logger = logging.getLogger(__name__)


def is_s3_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.aws_access_key_id
        and settings.aws_secret_access_key
        and settings.aws_s3_bucket
        and settings.aws_region
    )


def _s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def save_bytes(
    *,
    relative_path: str,
    data: bytes,
    content_type: str | None = None,
) -> str:
    """Persist bytes to S3 (preferred) or local uploads/. Returns stored_path key."""
    relative_path = relative_path.replace("\\", "/").lstrip("/")

    if is_s3_configured():
        settings = get_settings()
        extra: dict = {}
        if content_type:
            extra["ContentType"] = content_type
        try:
            _s3_client().put_object(
                Bucket=settings.aws_s3_bucket,
                Key=relative_path,
                Body=data,
                **extra,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 upload failed for %s", relative_path)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"S3 upload failed: {exc}",
            ) from exc
        return relative_path

    dest = UPLOADS_ROOT / relative_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return relative_path


def delete_stored(relative_path: str) -> None:
    relative_path = relative_path.replace("\\", "/").lstrip("/")
    if is_s3_configured():
        settings = get_settings()
        try:
            _s3_client().delete_object(Bucket=settings.aws_s3_bucket, Key=relative_path)
        except (BotoCoreError, ClientError):
            logger.exception("S3 delete failed for %s", relative_path)
        return

    file_path = UPLOADS_ROOT / relative_path
    if file_path.exists():
        file_path.unlink(missing_ok=True)


def download_response(
    *,
    relative_path: str,
    filename: str,
    content_type: str | None,
) -> Response:
    relative_path = relative_path.replace("\\", "/").lstrip("/")

    disposition = f"attachment; filename*=UTF-8''{quote(filename)}"

    if is_s3_configured():
        settings = get_settings()
        try:
            obj = _s3_client().get_object(
                Bucket=settings.aws_s3_bucket or "",
                Key=relative_path,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 get failed for %s", relative_path)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File missing in S3: {exc}",
            ) from exc

        media = content_type or obj.get("ContentType") or "application/octet-stream"
        return StreamingResponse(
            obj["Body"].iter_chunks(),
            media_type=media,
            headers={"Content-Disposition": disposition},
        )

    file_path = UPLOADS_ROOT / relative_path
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=content_type or "application/octet-stream",
    )


@contextmanager
def open_stored_path(relative_path: str) -> Iterator[Path]:
    """Yield a local Path for reading (downloads from S3 to a temp file when needed)."""
    relative_path = relative_path.replace("\\", "/").lstrip("/")

    if not is_s3_configured():
        yield UPLOADS_ROOT / relative_path
        return

    settings = get_settings()
    suffix = Path(relative_path).suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = Path(tmp.name)
    tmp.close()
    try:
        try:
            _s3_client().download_file(settings.aws_s3_bucket, relative_path, str(tmp_path))
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 download failed for %s", relative_path)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File missing in S3: {exc}",
            ) from exc
        yield tmp_path
    finally:
        tmp_path.unlink(missing_ok=True)


__all__ = [
    "is_s3_configured",
    "save_bytes",
    "delete_stored",
    "download_response",
    "open_stored_path",
    "UPLOADS_ROOT",
]
