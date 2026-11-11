from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.config import get_settings

logger = logging.getLogger(__name__)


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


def is_email_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_host and (settings.smtp_from or settings.smtp_username))


def _build_message(to: str, subject: str, body: str, html: str | None) -> EmailMessage:
    settings = get_settings()
    from_addr = (settings.smtp_from or settings.smtp_username or "").strip()
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.app_name} <{from_addr}>" if from_addr else settings.app_name
    message["To"] = to
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")
    return message


def _deliver_smtp(message: EmailMessage) -> None:
    settings = get_settings()
    host = (settings.smtp_host or "").strip()
    if not host:
        raise RuntimeError("SMTP_HOST is not configured")

    port = settings.smtp_port
    username = (settings.smtp_username or "").strip() or None
    password = settings.smtp_password or None

    if settings.smtp_use_tls:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)


def send_email(
    to: str,
    subject: str,
    body: str,
    *,
    html: str | None = None,
) -> SendEmailResult:
    """
    Send invite/transactional email via SMTP when configured.
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

    try:
        _deliver_smtp(_build_message(to, subject, body, html))
        logger.info("Email delivered via SMTP: to=%s subject=%s", to, subject)
        return SendEmailResult(message=message, delivered=True)
    except Exception as exc:  # noqa: BLE001 - surface delivery failure to invite API
        logger.exception("SMTP delivery failed: to=%s subject=%s", to, subject)
        return SendEmailResult(
            message=message,
            delivered=False,
            error=str(exc) or "Failed to send email",
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
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">You're invited</h1>
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
