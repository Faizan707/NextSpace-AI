"""Rules-based document compliance checks (AI engine plugs in later)."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.models.document import Document

ENGINE_RULES_V1 = "rules_v1"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
NEAR_LIMIT_BYTES = int(MAX_UPLOAD_BYTES * 0.9)

BLOCKED_EXTENSIONS = {
    "exe",
    "bat",
    "cmd",
    "com",
    "msi",
    "scr",
    "js",
    "jse",
    "vbs",
    "vbe",
    "wsf",
    "wsh",
    "ps1",
    "sh",
    "bash",
    "dll",
    "sys",
}

TEXT_EXTENSIONS = {"txt", "md", "markdown", "csv", "log", "json"}
TEXT_CONTENT_TYPES = {
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/csv",
}

EXT_CONTENT_HINTS: dict[str, tuple[str, ...]] = {
    "pdf": ("pdf",),
    "doc": ("msword", "word"),
    "docx": ("wordprocessingml", "officedocument.word", "msword"),
    "xls": ("excel", "spreadsheet"),
    "xlsx": ("spreadsheetml", "excel"),
    "ppt": ("powerpoint", "presentation"),
    "pptx": ("presentationml", "powerpoint"),
    "png": ("image/png", "png"),
    "jpg": ("image/jpeg", "jpeg"),
    "jpeg": ("image/jpeg", "jpeg"),
    "gif": ("image/gif", "gif"),
    "webp": ("image/webp", "webp"),
    "txt": ("text/plain", "text"),
    "md": ("markdown", "text"),
    "csv": ("csv", "text"),
    "json": ("json",),
}

# Personal info patterns (do not echo matched values in findings).
CNIC_RE = re.compile(r"(?<!\d)\d{5}-\d{7}-\d(?!\d)")
CNIC_COMPACT_RE = re.compile(r"(?<!\d)\d{13}(?!\d)")
PK_PHONE_RE = re.compile(
    r"(?<!\d)(?:\+92[\s\-]?|0)?3\d{2}[\s\-]?\d{7}(?!\d)"
)
EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
)
CARD_RE = re.compile(r"(?<!\d)(?:\d{4}[\s\-]?){3}\d{4}(?!\d)")


@dataclass
class ComplianceFinding:
    severity: str  # high | medium | low | info
    code: str
    message: str


@dataclass
class ComplianceResult:
    status: str  # passed | failed | error
    summary: str
    score: int
    engine: str
    findings: list[ComplianceFinding]
    checked_at: datetime

    def findings_json(self) -> str:
        return json.dumps([asdict(item) for item in self.findings], ensure_ascii=True)


def _ext(name: str) -> str:
    return Path(name).suffix.lstrip(".").lower()


def _is_text_document(document: Document, extension: str) -> bool:
    content_type = (document.content_type or "").lower()
    if extension in TEXT_EXTENSIONS:
        return True
    return any(content_type.startswith(prefix) for prefix in TEXT_CONTENT_TYPES) or any(
        token in content_type for token in ("text/", "csv", "json", "markdown")
    )


def _read_text_sample(file_path: Path) -> str | None:
    try:
        raw = file_path.read_bytes()[:64_000]
    except OSError:
        return None
    if raw.count(0) > 8:
        return None
    text = raw.decode("utf-8", errors="replace")
    replacement_ratio = text.count("\ufffd") / max(len(text), 1)
    if replacement_ratio > 0.05:
        return None
    return text.strip()


def _looks_like_cnic_compact(value: str) -> bool:
    """13-digit CNIC candidates: weak check to cut random ID false positives."""
    if len(value) != 13 or not value.isdigit():
        return False
    # Pakistani CNIC province/area digit is typically 1–7 for first digit.
    return value[0] in "1234567"


def _find_pii_findings(text: str) -> list[ComplianceFinding]:
    findings: list[ComplianceFinding] = []

    if CNIC_RE.search(text) or any(
        _looks_like_cnic_compact(match.group(0)) for match in CNIC_COMPACT_RE.finditer(text)
    ):
        findings.append(
            ComplianceFinding(
                severity="high",
                code="PII_CNIC",
                message="Possible CNIC / national ID number detected in the document.",
            )
        )

    if PK_PHONE_RE.search(text):
        findings.append(
            ComplianceFinding(
                severity="high",
                code="PII_PHONE",
                message="Possible personal phone number detected in the document.",
            )
        )

    if EMAIL_RE.search(text):
        findings.append(
            ComplianceFinding(
                severity="medium",
                code="PII_EMAIL",
                message="Email address detected in the document.",
            )
        )

    if CARD_RE.search(text):
        findings.append(
            ComplianceFinding(
                severity="high",
                code="PII_CARD",
                message="Possible payment card number detected in the document.",
            )
        )

    return findings


def run_compliance_check(document: Document, file_path: Path) -> ComplianceResult:
    findings: list[ComplianceFinding] = []
    checked_at = datetime.now(timezone.utc)

    try:
        if not file_path.exists():
            return ComplianceResult(
                status="error",
                summary="File is missing on disk.",
                score=0,
                engine=ENGINE_RULES_V1,
                findings=[
                    ComplianceFinding(
                        severity="high",
                        code="FILE_MISSING",
                        message="Stored file could not be found for compliance review.",
                    )
                ],
                checked_at=checked_at,
            )

        size_on_disk = file_path.stat().st_size
        size = document.size_bytes or size_on_disk
        name = document.original_name or file_path.name
        extension = _ext(name)
        content_type = (document.content_type or "").lower()

        if size <= 0 or size_on_disk <= 0:
            findings.append(
                ComplianceFinding(
                    severity="high",
                    code="EMPTY_FILE",
                    message="File is empty (0 bytes).",
                )
            )

        if not extension:
            findings.append(
                ComplianceFinding(
                    severity="medium",
                    code="MISSING_EXTENSION",
                    message="Filename has no extension, so the document type is unclear.",
                )
            )
        elif extension in BLOCKED_EXTENSIONS:
            findings.append(
                ComplianceFinding(
                    severity="high",
                    code="BLOCKED_FILE_TYPE",
                    message=f".{extension} files are not allowed for workspace documents.",
                )
            )

        if re.search(r"[\\/]", name) or any(ord(ch) < 32 for ch in name):
            findings.append(
                ComplianceFinding(
                    severity="high",
                    code="UNSAFE_FILENAME",
                    message="Filename contains path separators or control characters.",
                )
            )
        elif re.search(r"[<>:\"|?*]", name):
            findings.append(
                ComplianceFinding(
                    severity="medium",
                    code="ODD_FILENAME_CHARS",
                    message="Filename contains characters that are unsafe across systems.",
                )
            )

        if extension and content_type and extension in EXT_CONTENT_HINTS:
            hints = EXT_CONTENT_HINTS[extension]
            if not any(hint in content_type for hint in hints):
                findings.append(
                    ComplianceFinding(
                        severity="medium",
                        code="EXTENSION_MIME_MISMATCH",
                        message=(
                            f"Extension .{extension} does not match content type "
                            f"“{document.content_type}”."
                        ),
                    )
                )

        if size >= NEAR_LIMIT_BYTES:
            findings.append(
                ComplianceFinding(
                    severity="low",
                    code="NEAR_SIZE_LIMIT",
                    message="File is close to the 25MB upload limit.",
                )
            )

        if size_on_disk > 0:
            text = _read_text_sample(file_path)
            if text is None and _is_text_document(document, extension):
                findings.append(
                    ComplianceFinding(
                        severity="high",
                        code="READ_ERROR",
                        message="Could not read file contents for compliance review.",
                    )
                )
            elif text is not None:
                if _is_text_document(document, extension) or not extension:
                    if len(text) < 20:
                        findings.append(
                            ComplianceFinding(
                                severity="medium",
                                code="CONTENT_TOO_SHORT",
                                message="Text content is very short; document may be incomplete.",
                            )
                        )
                    letters = [ch for ch in text if ch.isalpha()]
                    if letters and sum(1 for ch in letters if ch.isupper()) / len(letters) > 0.85:
                        findings.append(
                            ComplianceFinding(
                                severity="low",
                                code="MOSTLY_UPPERCASE",
                                message=(
                                    "Text is mostly uppercase, which can look like spam "
                                    "or unformatted content."
                                ),
                            )
                        )

                findings.extend(_find_pii_findings(text))

        high = sum(1 for item in findings if item.severity == "high")
        medium = sum(1 for item in findings if item.severity == "medium")
        low = sum(1 for item in findings if item.severity == "low")

        score = max(0, 100 - (high * 35) - (medium * 15) - (low * 5))
        if high or medium:
            status = "failed"
            if high:
                summary = f"Compliance failed with {high} high-severity finding(s)."
            else:
                summary = f"Compliance failed with {medium} medium-severity finding(s)."
        else:
            status = "passed"
            summary = (
                "Compliance passed. No high or medium findings."
                if not findings
                else "Compliance passed with only low/info notes."
            )

        return ComplianceResult(
            status=status,
            summary=summary,
            score=score,
            engine=ENGINE_RULES_V1,
            findings=findings,
            checked_at=checked_at,
        )
    except Exception as exc:  # noqa: BLE001 — surface as compliance error status
        return ComplianceResult(
            status="error",
            summary="Compliance check could not complete.",
            score=0,
            engine=ENGINE_RULES_V1,
            findings=[
                ComplianceFinding(
                    severity="high",
                    code="CHECK_ERROR",
                    message=str(exc) or "Unexpected compliance error.",
                )
            ],
            checked_at=checked_at,
        )


def apply_compliance_result(document: Document, result: ComplianceResult) -> None:
    document.compliance_status = result.status
    document.compliance_summary = result.summary
    document.compliance_score = result.score
    document.compliance_findings_json = result.findings_json()
    document.compliance_checked_at = result.checked_at
    document.compliance_engine = result.engine


def parse_findings_json(raw: str | None) -> list[dict]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    findings: list[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        findings.append(
            {
                "severity": str(item.get("severity") or "info"),
                "code": str(item.get("code") or "UNKNOWN"),
                "message": str(item.get("message") or ""),
            }
        )
    return findings
