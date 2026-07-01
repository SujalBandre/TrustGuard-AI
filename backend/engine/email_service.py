"""
TrustGuard-AI | Email Service
Supports Gmail SMTP with App Password.
Falls back to in-memory queue if SMTP is not configured (safe for demos).
"""
import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ADMIN_EMAIL   = os.getenv("ADMIN_EMAIL", SMTP_USER or "admin@trustguard.ai")
ANALYST_EMAIL = os.getenv("ANALYST_EMAIL", SMTP_USER or "analyst@trustguard.ai")

# ── In-memory notification queue (used when SMTP is not configured) ──────────
_notification_queue: list[dict] = []

def _smtp_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASSWORD)

def _send_email(to: str, subject: str, body_html: str) -> bool:
    """Send a real email via SMTP. Returns True on success."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = to
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to, msg.as_string())
        log.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        log.error(f"SMTP failed: {e}")
        return False

def _queue_notification(notification_type: str, to_role: str, subject: str, body: str, meta: dict = None):
    """Store notification in-memory when SMTP is unavailable."""
    _notification_queue.append({
        "id":       len(_notification_queue) + 1,
        "type":     notification_type,
        "to_role":  to_role,
        "subject":  subject,
        "body":     body,
        "meta":     meta or {},
        "ts":       datetime.utcnow().isoformat(),
        "read":     False,
    })
    log.info(f"[MockEmail] Queued notification → {to_role}: {subject}")


def get_notifications_for_role(role: str) -> list[dict]:
    """Get all unread notifications for a given role."""
    return [n for n in _notification_queue if n["to_role"] == role]

def mark_notification_read(notification_id: int):
    for n in _notification_queue:
        if n["id"] == notification_id:
            n["read"] = True


# ── Public API ────────────────────────────────────────────────────────────────

def send_user_report_to_admin(user_name: str, product_url: str, message: str, user_email: str = "") -> bool:
    """User flags a suspicious product → admin gets notified."""
    subject = f"🚩 User Report: Suspicious Reviews Flagged — {product_url[:60]}"
    body = f"""
    <h2 style="color:#EF4444">🚩 TrustGuard AI — User Report</h2>
    <p><b>Reporter:</b> {user_name or 'Anonymous User'}</p>
    <p><b>Reporter Email:</b> {user_email or 'Not provided'}</p>
    <p><b>Product URL:</b> <a href="{product_url}">{product_url}</a></p>
    <hr/>
    <p><b>Message:</b></p>
    <blockquote style="border-left:3px solid #EF4444;padding-left:12px;color:#555">{message}</blockquote>
    <hr/>
    <p style="color:#888;font-size:12px">Sent automatically by TrustGuard AI Platform</p>
    """
    if _smtp_configured():
        return _send_email(ADMIN_EMAIL, subject, body)
    else:
        _queue_notification("user_report", "admin", subject, message, {
            "user_name": user_name, "product_url": product_url, "user_email": user_email
        })
        return True


def send_analyst_request_from_admin(product_url: str, product_name: str, admin_note: str, analysis_summary: dict = None) -> bool:
    """Admin requests a detailed report from the data analyst."""
    subject = f"📋 Report Request: {product_name[:50]}"
    summary_html = ""
    if analysis_summary:
        summary_html = f"""
        <table border="1" cellpadding="8" style="border-collapse:collapse;font-size:13px">
          <tr><td><b>Trust Score</b></td><td>{analysis_summary.get('trust_score', 'N/A')}%</td></tr>
          <tr><td><b>Total Reviews</b></td><td>{analysis_summary.get('total_reviews', 'N/A')}</td></tr>
          <tr><td><b>Fake Reviews</b></td><td>{analysis_summary.get('fake_count', 'N/A')}</td></tr>
          <tr><td><b>Risk Level</b></td><td>{analysis_summary.get('risk_level', 'N/A')}</td></tr>
        </table>
        """
    body = f"""
    <h2 style="color:#00D4FF">📋 TrustGuard AI — Detailed Report Request</h2>
    <p><b>Product:</b> {product_name}</p>
    <p><b>URL:</b> <a href="{product_url}">{product_url}</a></p>
    <hr/>
    <p><b>Admin Note:</b></p>
    <blockquote style="border-left:3px solid #00D4FF;padding-left:12px">{admin_note}</blockquote>
    {f'<h3>Auto-Analysis Summary</h3>{summary_html}' if summary_html else ''}
    <hr/>
    <p>Please log in to the TrustGuard Analyst Panel to submit your report.</p>
    """
    if _smtp_configured():
        return _send_email(ANALYST_EMAIL, subject, body)
    else:
        _queue_notification("analyst_request", "analyst", subject, admin_note, {
            "product_url": product_url, "product_name": product_name,
            "analysis_summary": analysis_summary
        })
        return True


def send_analyst_report_to_admin(product_name: str, product_url: str, analyst_name: str, report_content: str) -> bool:
    """Analyst submits completed report → admin receives it."""
    subject = f"✅ Analyst Report Ready: {product_name[:50]}"
    body = f"""
    <h2 style="color:#10B981">✅ TrustGuard AI — Analyst Report Submitted</h2>
    <p><b>Product:</b> {product_name}</p>
    <p><b>URL:</b> <a href="{product_url}">{product_url}</a></p>
    <p><b>Analyst:</b> {analyst_name}</p>
    <hr/>
    <h3>Report</h3>
    <div style="background:#f9f9f9;padding:16px;border-radius:8px;font-size:13px;line-height:1.7">
      {report_content.replace(chr(10), '<br>')}
    </div>
    <hr/>
    <p style="color:#888;font-size:12px">You can also view this report in the TrustGuard Admin Panel under Reports.</p>
    """
    if _smtp_configured():
        return _send_email(ADMIN_EMAIL, subject, body)
    else:
        _queue_notification("analyst_report", "admin", subject, report_content, {
            "product_url": product_url, "product_name": product_name, "analyst_name": analyst_name
        })
        return True
