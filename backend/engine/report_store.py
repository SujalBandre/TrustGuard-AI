"""
TrustGuard-AI | Report Store
JSON-file backed persistent store for:
  - User-submitted product flag reports (→ admin)
  - Admin requests to data analyst
  - Analyst-submitted detailed reports (→ admin)
  - Product analysis history (batch history)
"""
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

log = logging.getLogger(__name__)

_STORE_DIR = Path(__file__).parent.parent / "logs"
_STORE_DIR.mkdir(exist_ok=True)

_USER_REPORTS_FILE    = _STORE_DIR / "user_reports.json"
_ANALYST_REQS_FILE    = _STORE_DIR / "analyst_requests.json"
_ANALYST_REPORTS_FILE = _STORE_DIR / "analyst_reports.json"
_BATCH_HISTORY_FILE   = _STORE_DIR / "batch_history.json"


def _load(path: Path) -> List[Dict]:
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        log.warning(f"Could not load {path}: {e}")
    return []

def _save(path: Path, data: List[Dict]):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log.error(f"Could not save {path}: {e}")

def _new_id(items: List[Dict]) -> int:
    return max((i.get("id", 0) for i in items), default=0) + 1


# ── User Reports ─────────────────────────────────────────────────────────────

def add_user_report(user_name: str, product_url: str, message: str, user_email: str = "") -> Dict:
    reports = _load(_USER_REPORTS_FILE)
    entry = {
        "id":          _new_id(reports),
        "user_name":   user_name or "Anonymous",
        "user_email":  user_email,
        "product_url": product_url,
        "message":     message,
        "status":      "pending",
        "ts":          datetime.utcnow().isoformat(),
    }
    reports.insert(0, entry)
    _save(_USER_REPORTS_FILE, reports)
    return entry

def get_user_reports() -> List[Dict]:
    return _load(_USER_REPORTS_FILE)

def mark_user_report_reviewed(report_id: int) -> bool:
    reports = _load(_USER_REPORTS_FILE)
    for r in reports:
        if r.get("id") == report_id:
            r["status"] = "reviewed"
            _save(_USER_REPORTS_FILE, reports)
            return True
    return False


# ── Analyst Requests (Admin → Analyst) ───────────────────────────────────────

def add_analyst_request(product_url: str, product_name: str, admin_note: str, analysis_summary: dict = None) -> Dict:
    requests = _load(_ANALYST_REQS_FILE)
    entry = {
        "id":               _new_id(requests),
        "product_url":      product_url,
        "product_name":     product_name,
        "admin_note":       admin_note,
        "analysis_summary": analysis_summary or {},
        "status":           "pending",
        "ts":               datetime.utcnow().isoformat(),
    }
    requests.insert(0, entry)
    _save(_ANALYST_REQS_FILE, requests)
    return entry

def get_analyst_requests(status: Optional[str] = None) -> List[Dict]:
    reqs = _load(_ANALYST_REQS_FILE)
    if status:
        return [r for r in reqs if r.get("status") == status]
    return reqs

def mark_analyst_request_completed(request_id: int) -> bool:
    reqs = _load(_ANALYST_REQS_FILE)
    for r in reqs:
        if r.get("id") == request_id:
            r["status"] = "completed"
            _save(_ANALYST_REQS_FILE, reqs)
            return True
    return False


# ── Analyst Reports (Analyst → Admin) ────────────────────────────────────────

def add_analyst_report(request_id: int, product_url: str, product_name: str,
                       analyst_name: str, report_content: str) -> Dict:
    reports = _load(_ANALYST_REPORTS_FILE)
    entry = {
        "id":             _new_id(reports),
        "request_id":     request_id,
        "product_url":    product_url,
        "product_name":   product_name,
        "analyst_name":   analyst_name,
        "report_content": report_content,
        "ts":             datetime.utcnow().isoformat(),
        "read_by_admin":  False,
    }
    reports.insert(0, entry)
    _save(_ANALYST_REPORTS_FILE, reports)
    # Mark request as completed
    mark_analyst_request_completed(request_id)
    return entry

def get_analyst_reports() -> List[Dict]:
    return _load(_ANALYST_REPORTS_FILE)

def mark_analyst_report_read(report_id: int):
    reports = _load(_ANALYST_REPORTS_FILE)
    for r in reports:
        if r.get("id") == report_id:
            r["read_by_admin"] = True
            _save(_ANALYST_REPORTS_FILE, reports)
            return True
    return False


# ── Batch / Product History ───────────────────────────────────────────────────

def add_to_batch_history(product_url: str, product_name: str, platform: str,
                          trust_score: float, fake_count: int, total_reviews: int,
                          risk_level: str, tags: List[str]) -> Dict:
    history = _load(_BATCH_HISTORY_FILE)
    # Avoid exact duplicate URL entries within 5 minutes
    from datetime import timedelta
    recent_cutoff = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    for h in history:
        if h.get("product_url") == product_url and h.get("ts", "") > recent_cutoff:
            return h  # skip duplicate

    entry = {
        "id":            _new_id(history),
        "product_url":   product_url,
        "product_name":  product_name,
        "platform":      platform,
        "trust_score":   trust_score,
        "fake_count":    fake_count,
        "total_reviews": total_reviews,
        "fake_pct":      round(fake_count / max(total_reviews, 1) * 100, 1),
        "risk_level":    risk_level,
        "tags":          tags[:5],
        "ts":            datetime.utcnow().isoformat(),
    }
    history.insert(0, entry)
    history = history[:100]  # keep last 100 entries
    _save(_BATCH_HISTORY_FILE, history)
    return entry

def get_batch_history() -> List[Dict]:
    return _load(_BATCH_HISTORY_FILE)
