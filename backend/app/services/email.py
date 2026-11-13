from __future__ import annotations

import json
import logging
import smtplib
import ssl
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from email.message import EmailMessage
from socket import timeout as SocketTimeout

from app.config import get_settings

logger = logging.getLogger(__name__)

_SMTP_CONNECT_TIMEOUT = 15
_BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


@dataclass
class OutboundEmail:
    to: str
    subject: str
    body: str
    html: str | None = None


@dataclass
class SendEmailResult:
    message: OutboundEmail
    delivered: bool
    error: str | None = None


_sent_emails: list[OutboundEmail] = []


def get_sent_emails() -> list[OutboundEmail]:
    return list(_sent_emails)


def _brevo_api_key() -> str | None:
    settings = get_settings()
    key = (settings.brevo_api_key or "").strip()
    # SMTP keys (xsmtpsib-…) are not valid for Brevo's HTTPS API (needs xkeysib-…).
    if key.startswith("xsmtpsib-"):
        return None
    return key or None


def is_email_configured() -> bool:
    settings = get_settings()
    if _brevo_api_key():
        return bool(settings.smtp_from or settings.smtp_username)
    return bool(settings.smtp_host and (settings.smtp_from or settings.smtp_username))


def _from_address() -> str:
    settings = get_settings()
    return (settings.smtp_from or settings.smtp_username or "").strip()


def _build_message(to: str, subject: str, body: str, html: str | None) -> EmailMessage:
    settings = get_settings()
    from_addr = _from_address()
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.app_name} <{from_addr}>" if from_addr else settings.app_name
    message["To"] = to
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")
    return message


def _send_via_ssl(host: str, port: int, username: str | None, password: str | None, message: EmailMessage) -> None:
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(host, port, timeout=_SMTP_CONNECT_TIMEOUT, context=context) as smtp:
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)


def _send_via_starttls(
    host: str, port: int, username: str | None, password: str | None, message: EmailMessage
) -> None:
    with smtplib.SMTP(host, port, timeout=_SMTP_CONNECT_TIMEOUT) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)


def _send_plain(host: str, port: int, username: str | None, password: str | None, message: EmailMessage) -> None:
    with smtplib.SMTP(host, port, timeout=_SMTP_CONNECT_TIMEOUT) as smtp:
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)


def _is_timeout(exc: BaseException) -> bool:
    if isinstance(exc, (TimeoutError, SocketTimeout, smtplib.SMTPServerDisconnected)):
        return True
    text = str(exc).lower()
    return "timed out" in text or "timeout" in text


def _deliver_brevo_http(to: str, subject: str, body: str, html: str | None) -> None:
    """Send via Brevo HTTPS API (works when Railway blocks outbound SMTP ports)."""
    settings = get_settings()
    api_key = _brevo_api_key()
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured (create an xkeysib- key in Brevo)")

    from_addr = _from_address()
    if not from_addr:
        raise RuntimeError("SMTP_FROM is required for Brevo API")

    payload: dict = {
        "sender": {"name": settings.app_name, "email": from_addr},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }
    if html:
        payload["htmlContent"] = html

    request = urllib.request.Request(
        _BREVO_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status >= 300:
                raise RuntimeError(f"Brevo API HTTP {response.status}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Brevo API HTTP {exc.code}: {detail}") from exc


def _deliver_smtp(message: EmailMessage) -> None:
    settings = get_settings()
    host = (settings.smtp_host or "").strip()
    if not host:
        raise RuntimeError("SMTP_HOST is not configured")

    port = settings.smtp_port
    username = (settings.smtp_username or "").strip() or None
    password = settings.smtp_password or None
    use_ssl = settings.smtp_use_ssl or port == 465
    use_tls = settings.smtp_use_tls and not use_ssl

    attempts: list[tuple[str, Callable[[], None]]] = []
    if use_ssl:
        attempts.append(("SMTP_SSL", lambda: _send_via_ssl(host, port or 465, username, password, message)))
    elif use_tls:
        attempts.append(("STARTTLS", lambda: _send_via_starttls(host, port, username, password, message)))
        if port == 587:
            attempts.append(
                ("SMTP_SSL:465", lambda: _send_via_ssl(host, 465, username, password, message))
            )
    else:
        attempts.append(("SMTP", lambda: _send_plain(host, port, username, password, message)))

    errors: list[str] = []
    for label, send in attempts:
        try:
            send()
            if label != attempts[0][0]:
                logger.warning("SMTP delivered via fallback %s (primary failed)", label)
            return
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{label}: {exc}")
            logger.warning("SMTP attempt failed (%s): %s", label, exc)

    raise RuntimeError("; ".join(errors) if errors else "SMTP delivery failed")


def send_email(
    to: str,
    subject: str,
    body: str,
    *,
    html: str | None = None,
) -> SendEmailResult:
    """
    Send invite/transactional email via Brevo HTTPS (preferred on Railway) or SMTP.
    Always keeps a local outbox copy and prints in development.
    """
    message = OutboundEmail(to=to, subject=subject, body=body, html=html)
    _sent_emails.append(message)

    settings = get_settings()
    print("\n=== EMAIL OUTBOX ===")
    print(f"App: {settings.app_name}")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(body)
    print("=== END EMAIL ===\n")

    if not is_email_configured():
        logger.info("Email not delivered (SMTP not configured): to=%s subject=%s", to, subject)
        return SendEmailResult(
            message=message,
            delivered=False,
            error="SMTP is not configured. Set SMTP_HOST and SMTP_FROM in backend/.env",
        )

    errors: list[str] = []
    api_key = _brevo_api_key()
    prefer_api = bool(api_key) and settings.smtp_prefer_api

    if prefer_api:
        try:
            _deliver_brevo_http(to, subject, body, html)
            logger.info("Email delivered via Brevo API: to=%s subject=%s", to, subject)
            return SendEmailResult(message=message, delivered=True)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"BrevoAPI: {exc}")
            logger.warning("Brevo API delivery failed: %s", exc)

    try:
        _deliver_smtp(_build_message(to, subject, body, html))
        logger.info("Email delivered via SMTP: to=%s subject=%s", to, subject)
        return SendEmailResult(message=message, delivered=True)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"SMTP: {exc}")
        logger.exception("SMTP delivery failed: to=%s subject=%s", to, subject)

    # Railway often blocks SMTP — fall back to HTTPS when an API key exists.
    if api_key and not prefer_api:
        try:
            _deliver_brevo_http(to, subject, body, html)
            logger.info("Email delivered via Brevo API fallback: to=%s subject=%s", to, subject)
            return SendEmailResult(message=message, delivered=True)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"BrevoAPI: {exc}")
            logger.warning("Brevo API fallback failed: %s", exc)

    hint = ""
    if not api_key and any("timed out" in e.lower() or "timeout" in e.lower() for e in errors):
        hint = (
            " | Railway cannot reach Brevo SMTP. Create a Brevo API key (xkeysib-…) at "
            "https://app.brevo.com/settings/keys/api and set BREVO_API_KEY on Railway."
        )

    return SendEmailResult(
        message=message,
        delivered=False,
        error=("; ".join(errors) if errors else "Failed to send email") + hint,
    )


def invite_email_html(
    *,
    app_name: str,
    company_name: str,
    greeting_name: str | None,
    role_line: str | None,
    cta_label: str,
    cta_url: str,
    extra_lines: list[str] | None = None,
) -> str:
    name = (greeting_name or "").strip()
    hi = f"Hi {name}," if name else "Hi,"
    extras = "".join(f"<p style='margin:0 0 12px;color:#374151'>{line}</p>" for line in (extra_lines or []))
    role_html = (
        f"<p style='margin:0 0 12px;color:#374151'><strong>Role:</strong> {role_line}</p>"
        if role_line
        else ""
    )
    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f3f5f9;font-family:Figtree,Segoe UI,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden">
      <tr>
        <td style="padding:28px 28px 8px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb">{app_name}</p>
          <h1 style="margin:0 0 16px;line-height:1.25;font-size:24px">You're invited</h1>
          <p style="margin:0 0 12px;color:#374151">{hi}</p>
          <p style="margin:0 0 12px;color:#374151">You have been invited to join <strong>{company_name}</strong> on {app_name}.</p>
          {role_html}
          {extras}
          <p style="margin:24px 0">
            <a href="{cta_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px">{cta_label}</a>
          </p>
          <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all">{cta_url}</p>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
