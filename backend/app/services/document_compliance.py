"""Document compliance checks — AI review (with hard safety pre-checks)."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.ai.llm import LlmError, chat, get_llm_provider
from app.models.document import Document

logger = logging.getLogger(__name__)

ENGINE_AI_V1 = "ai_v1"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
NEAR_LIMIT_BYTES = int(MAX_UPLOAD_BYTES * 0.9)
AI_SAMPLE_CHARS = 12_000

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

COMPLIANCE_SYSTEM = """You are a workplace document compliance reviewer for NextSpace.
Review the document metadata and any text sample. Look for:
- Personal data / PII (national IDs, phones, emails, payment cards, addresses)
- Secrets (API keys, passwords, private keys)
- Unsafe or suspicious content for a company workspace
- Policy risk (confidential data that should not be shared loosely)
- Missing/weak document quality only if clearly incomplete

Rules:
- Do NOT repeat raw PII/secret values in messages — describe the type only.
- Be practical; avoid false alarms on normal business docs.
- Reply with ONLY one JSON object (no markdown fences):
{
  "status": "passed" | "failed",
  "summary": "short human summary",
  "score": 0-100,
  "findings": [
    {"severity": "high"|"medium"|"low"|"info", "code": "SHORT_CODE", "message": "safe description"}
  ]
}
status=failed if any high or medium finding; otherwise passed.
score: 100 is clean; subtract for severity (roughly high~35, medium~15, low~5).
"""


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


def _hard_safety_findings(document: Document, file_path: Path) -> list[ComplianceFinding]:
    """Non-AI blockers: malware-ish types, empty/missing, unsafe names."""
    findings: list[ComplianceFinding] = []
    size_on_disk = file_path.stat().st_size
    size = document.size_bytes or size_on_disk
    name = document.original_name or file_path.name
    extension = _ext(name)

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

    if size >= NEAR_LIMIT_BYTES:
        findings.append(
            ComplianceFinding(
                severity="low",
                code="NEAR_SIZE_LIMIT",
                message="File is close to the 25MB upload limit.",
            )
        )

    return findings


def _extract_json_object(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("AI response was not valid JSON")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("AI JSON root must be an object")
    return data


def _normalize_ai_result(data: dict, *, engine: str, checked_at: datetime) -> ComplianceResult:
    raw_findings = data.get("findings") if isinstance(data.get("findings"), list) else []
    findings: list[ComplianceFinding] = []
    for item in raw_findings:
        if not isinstance(item, dict):
            continue
        severity = str(item.get("severity") or "info").lower()
        if severity not in {"high", "medium", "low", "info"}:
            severity = "info"
        findings.append(
            ComplianceFinding(
                severity=severity,
                code=str(item.get("code") or "AI_FINDING")[:64],
                message=str(item.get("message") or "Finding reported by AI.")[:500],
            )
        )

    high = sum(1 for item in findings if item.severity == "high")
    medium = sum(1 for item in findings if item.severity == "medium")
    low = sum(1 for item in findings if item.severity == "low")

    status_raw = str(data.get("status") or "").lower()
    if status_raw not in {"passed", "failed"}:
        status_raw = "failed" if (high or medium) else "passed"
    if high or medium:
        status_raw = "failed"

    try:
        score = int(data.get("score"))
    except (TypeError, ValueError):
        score = max(0, 100 - (high * 35) - (medium * 15) - (low * 5))
    score = max(0, min(100, score))

    summary = str(data.get("summary") or "").strip()
    if not summary:
        if status_raw == "failed":
            summary = f"AI compliance failed with {high + medium} issue(s)."
        else:
            summary = "AI compliance passed."

    return ComplianceResult(
        status=status_raw,
        summary=summary[:500],
        score=score,
        engine=engine,
        findings=findings,
        checked_at=checked_at,
    )


def _merge_findings(
    hard: list[ComplianceFinding],
    ai: list[ComplianceFinding],
) -> list[ComplianceFinding]:
    seen: set[tuple[str, str]] = set()
    merged: list[ComplianceFinding] = []
    for item in [*hard, *ai]:
        key = (item.code, item.message)
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
    return merged


def _score_from_findings(findings: list[ComplianceFinding]) -> int:
    high = sum(1 for item in findings if item.severity == "high")
    medium = sum(1 for item in findings if item.severity == "medium")
    low = sum(1 for item in findings if item.severity == "low")
    return max(0, 100 - (high * 35) - (medium * 15) - (low * 5))


def _run_ai_review(document: Document, file_path: Path, sample: str | None) -> ComplianceResult:
    provider = get_llm_provider()
    engine = f"{ENGINE_AI_V1}:{provider}"
    checked_at = datetime.now(timezone.utc)
    name = document.original_name or file_path.name
    extension = _ext(name)
    size = document.size_bytes or file_path.stat().st_size

    sample_note = (
        sample[:AI_SAMPLE_CHARS]
        if sample
        else (
            "(No extractable text sample — binary or non-text file. "
            "Review from metadata only; flag if type looks risky for a workspace.)"
        )
    )

    user_prompt = (
        f"Document name: {name}\n"
        f"Extension: .{extension or 'none'}\n"
        f"Content-Type: {document.content_type or 'unknown'}\n"
        f"Size bytes: {size}\n"
        f"Is likely text: {_is_text_document(document, extension)}\n\n"
        f"Text sample:\n{sample_note}"
    )

    raw = chat(
        [
            {"role": "system", "content": COMPLIANCE_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )
    data = _extract_json_object(raw)
    return _normalize_ai_result(data, engine=engine, checked_at=checked_at)


def run_compliance_check(document: Document, file_path: Path) -> ComplianceResult:
    checked_at = datetime.now(timezone.utc)

    try:
        if not file_path.exists():
            return ComplianceResult(
                status="error",
                summary="File is missing on disk.",
                score=0,
                engine=ENGINE_AI_V1,
                findings=[
                    ComplianceFinding(
                        severity="high",
                        code="FILE_MISSING",
                        message="Stored file could not be found for compliance review.",
                    )
                ],
                checked_at=checked_at,
            )

        hard = _hard_safety_findings(document, file_path)
        # Hard blockers that should fail without calling the LLM
        hard_block = any(
            item.severity == "high" and item.code in {"EMPTY_FILE", "BLOCKED_FILE_TYPE", "UNSAFE_FILENAME"}
            for item in hard
        )
        if hard_block:
            score = _score_from_findings(hard)
            return ComplianceResult(
                status="failed",
                summary="Compliance failed on hard safety checks before AI review.",
                score=score,
                engine=ENGINE_AI_V1,
                findings=hard,
                checked_at=checked_at,
            )

        sample = _read_text_sample(file_path)
        try:
            ai_result = _run_ai_review(document, file_path, sample)
        except (LlmError, ValueError, json.JSONDecodeError) as exc:
            logger.exception("AI compliance failed for document_id=%s", getattr(document, "id", None))
            return ComplianceResult(
                status="error",
                summary="AI compliance check could not complete.",
                score=0,
                engine=ENGINE_AI_V1,
                findings=[
                    *hard,
                    ComplianceFinding(
                        severity="high",
                        code="AI_CHECK_ERROR",
                        message=str(exc) or "LLM compliance review failed.",
                    ),
                ],
                checked_at=checked_at,
            )

        findings = _merge_findings(hard, ai_result.findings)
        high = sum(1 for item in findings if item.severity == "high")
        medium = sum(1 for item in findings if item.severity == "medium")
        status = "failed" if (high or medium) else "passed"
        score = min(ai_result.score, _score_from_findings(findings))
        summary = ai_result.summary
        if hard and status == "passed":
            summary = f"{summary} (plus low safety notes)."

        return ComplianceResult(
            status=status,
            summary=summary,
            score=score,
            engine=ai_result.engine,
            findings=findings,
            checked_at=ai_result.checked_at,
        )
    except Exception as exc:  # noqa: BLE001 — surface as compliance error status
        return ComplianceResult(
            status="error",
            summary="Compliance check could not complete.",
            score=0,
            engine=ENGINE_AI_V1,
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
