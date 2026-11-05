from pathlib import Path

UPLOADS_ROOT = Path(__file__).resolve().parents[2] / "uploads"


def space_upload_dir(space_id: int) -> Path:
    path = UPLOADS_ROOT / "spaces" / str(space_id)
    path.mkdir(parents=True, exist_ok=True)
    return path
