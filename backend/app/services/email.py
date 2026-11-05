from dataclasses import dataclass

from app.config import get_settings


@dataclass
class OutboundEmail:
    to: str
    subject: str
    body: str


_sent_emails: list[OutboundEmail] = []


def get_sent_emails() -> list[OutboundEmail]:
    return list(_sent_emails)


def send_email(to: str, subject: str, body: str) -> OutboundEmail:
    """Dev-friendly mailer: stores + prints email. Swap for SMTP later."""
    message = OutboundEmail(to=to, subject=subject, body=body)
    _sent_emails.append(message)
    settings = get_settings()
    print("\n=== EMAIL OUTBOX ===")
    print(f"App: {settings.app_name}")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(body)
    print("=== END EMAIL ===\n")
    return message
