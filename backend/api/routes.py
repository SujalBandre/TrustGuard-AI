"""TrustGuard-AI | Unified API Routes — User + Admin + Analyst"""
import json, logging, datetime, io, csv, pydantic, uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse, FileResponse
import asyncio, pandas as pd

from backend.auth.auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash, get_current_owner
from backend.auth.db import get_db_connection
from datetime import timedelta

from .schemas import (
    VerifyReviewInput, VerifyReviewOutput,
    BatchAnalyzeInput, BatchAnalyzeOutput, FlaggedReview,
    ProductTrustInput, ProductTrustOutput,
    DashboardStatsOutput, ReviewItem,
    AnalyzeInput, AnalyzeOutput,
    UserReportInput, AdminAnalystRequestInput, AnalystReportInput,
)
from backend.engine.detection import compute_trust_score, analyze_text, analyze_behavior, analyze_temporal
from backend.engine.price_analyzer import calculate_price_integrity
from backend.engine.scraper import scrape_product_data
from backend.engine.api_gateway import get_exchange_rate, get_price_history
from backend.engine.syndicate_logic import identify_syndicate_leaders
from backend.engine.report_engine import TrustBuyReport
from backend.engine.summarizer import extract_aspects_and_summarize
from backend.engine.security import is_malicious_link
from backend.engine.reputation import compute_reputation_data
from backend.engine.email_service import (
    send_user_report_to_admin,
    send_analyst_request_from_admin,
    send_analyst_report_to_admin,
    get_notifications_for_role,
)
from backend.engine.report_store import (
    add_user_report, get_user_reports, mark_user_report_reviewed,
    add_analyst_request, get_analyst_requests,
    add_analyst_report, get_analyst_reports,
    add_to_batch_history, get_batch_history,
)

router = APIRouter()
log    = logging.getLogger(__name__)

_stats = {
    "total_analyzed": 0, "fake_detected": 0, "real_count": 0,
    "trust_scores": [], "recent_flags": [],
}
# In-memory store for admin dashboards
_last_analysis_cache = {
    "reviews": [], "platform": "Unknown", "product_name": "Unknown",
    "product_url": "", "trust_score": 0, "fake_count": 0, "total_reviews": 0,
    "risk_level": "LOW", "tags": [], "flagged_reviews": [],
    "reputation": {}, "sentiment_distribution": {},
}

LOG_DIR  = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "api_requests.log"

def _log(endpoint, payload, result):
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"ts": datetime.datetime.utcnow().isoformat(),
                                "endpoint": endpoint, "input": str(payload)[:200],
                                "output": str(result)[:200]}) + '\n')
    except Exception:
        pass


# ─── Auth ─────────────────────────────────────────────────────────────────────
class LoginInput(pydantic.BaseModel):
    username: str
    password: str

class RegisterInput(pydantic.BaseModel):
    username: str
    password: str
    role: str
    display_name: str

@router.post("/api/auth/register", tags=["Auth"])
def register(payload: RegisterInput):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (payload.username,))
    existing_user = cursor.fetchone()
    if existing_user:
        if existing_user["status"] == "rejected":
            cursor.execute("DELETE FROM users WHERE id = ?", (existing_user["id"],))
        else:
            conn.close()
            raise HTTPException(400, "Username already registered")
        
    hashed = get_password_hash(payload.password)
    # Validate role is either admin, analyst, or user
    if payload.role not in ["admin", "analyst", "user", "owner"]:
        raise HTTPException(400, "Invalid role")
        
    cursor.execute(
        "INSERT INTO users (username, hashed_password, role, display_name, status) VALUES (?, ?, ?, ?, ?)",
        (payload.username, hashed, payload.role, payload.display_name, "pending")
    )
    conn.commit()
    conn.close()
    return {"msg": "Registration successful, pending approval by TrustGuard Owner."}

@router.get("/api/auth/requests", tags=["Auth"])
def get_requests(current_user: dict = Depends(get_current_owner)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role, display_name, status FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/api/auth/requests/{user_id}/approve", tags=["Auth"])
def approve_request(user_id: int, current_user: dict = Depends(get_current_owner)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET status = 'approved' WHERE id = ?", (user_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(404, "User not found")
    conn.commit()
    conn.close()
    return {"msg": f"User {user_id} approved."}

@router.post("/api/auth/requests/{user_id}/reject", tags=["Auth"])
def reject_request(user_id: int, current_user: dict = Depends(get_current_owner)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET status = 'rejected' WHERE id = ?", (user_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(404, "User not found")
    conn.commit()
    conn.close()
    return {"msg": f"User {user_id} rejected."}

@router.post("/api/auth/login", tags=["Auth"])
def login(payload: LoginInput):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}, expires_delta=access_token_expires
    )
    
    redirect_url = "/"
    if user["role"] == "user":
        redirect_url = "/trustbuy"
    elif user["role"] == "analyst":
        redirect_url = "/analyst"
    elif user["role"] == "owner":
        redirect_url = "/verification"
        
    return {
        "token": access_token,
        "role": user["role"],
        "username": user["username"],
        "display_name": user["display_name"],
        "redirect": redirect_url
    }


# ─── Health ──────────────────────────────────────────────────────────────────
@router.get("/health")
def health():
    model_path = Path(__file__).parent.parent / "models" / "lr_pipeline.joblib"
    return {
        "status": "online", "model_loaded": model_path.exists(),
        "version": "4.0.0", "engine": "TrustGuard Detection Engine",
    }


# ─── /verify-review ──────────────────────────────────────────────────────────
@router.post("/verify-review", response_model=VerifyReviewOutput, tags=["Core"])
def verify_review(payload: VerifyReviewInput):
    result = compute_trust_score(text=payload.text, rating=payload.rating)
    _stats["total_analyzed"] += 1
    if result['manipulation_probability'] > 0.5:
        _stats["fake_detected"] += 1
        _stats["recent_flags"].insert(0, {
            "text": payload.text[:120], "author": payload.author or "Unknown",
            "tags": result['tags'], "risk": result['risk_level'],
            "evidence": result['evidence'][:150],
            "ts": datetime.datetime.utcnow().isoformat(),
        })
        _stats["recent_flags"] = _stats["recent_flags"][:50]
    else:
        _stats["real_count"] += 1
    _stats["trust_scores"].append(result['trust_score'])
    _log("/verify-review", payload.model_dump(), result)
    return result


# ─── Helper: run full product analysis and cache ─────────────────────────────
def _run_product_analysis(url: str) -> dict:
    """Shared logic for both user and admin product URL analysis."""
    sec = is_malicious_link(url)
    if sec["status"] == "MALICIOUS":
        return {
            "mode": "URL", "url_status": "MALICIOUS",
            "trust_score": 0, "risk_level": "CRITICAL",
            "nlp_score": 1.0,
            "tags": [sec.get("threat_type", "MALICIOUS_URL")],
            "malicious_url_info": sec,
            "flagged_reviews": [], "syndicates": [],
            "price_history": [],
            "reputation": {
                "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
                "pros_and_cons": {"pros": [], "cons": []},
                "ratings_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
                "fake_ratio": {"fake": 0, "genuine": 0, "total_reviews": 0}
            }
        }

    data = scrape_product_data(url, max_pages=30)

    if not data["reviews"]:
        return {
            "mode": "URL", "url_status": sec["status"],
            "trust_score": 50, "risk_level": "MEDIUM",
            "nlp_score": 0.5, "tags": ["NO_REVIEWS_FOUND"],
            "flagged_reviews": [], "syndicates": [],
            "price_history": [], "pages_scraped": 0,
            "reputation": {
                "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
                "pros_and_cons": {"pros": [], "cons": []},
                "ratings_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
                "fake_ratio": {"fake": 0, "genuine": 0, "total_reviews": 0}
            }
        }

    reviews = [ReviewItem(**r) for r in data['reviews']]
    batch_res = analyze_batch(BatchAnalyzeInput(reviews=reviews))

    df = pd.DataFrame([r.model_dump() for r in reviews])
    syndicates = identify_syndicate_leaders(df)

    price_drop_pct   = 0.25 if batch_res.trust_score < 70 else 0.05
    review_spike_pct = (batch_res.fake_count / batch_res.total_reviews) if batch_res.total_reviews else 0
    p_score, p_label = calculate_price_integrity(price_drop_pct, review_spike_pct)
    history          = get_price_history(url)

    pros_cons, sentiment_dist = extract_aspects_and_summarize(data['reviews'])

    ratings_dist = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for rev in data['reviews']:
        r_val = str(int(rev.get('rating', 3)))
        if r_val in ratings_dist:
            ratings_dist[r_val] += 1

    fake_count    = len(batch_res.flagged_reviews)
    total_rev     = len(data['reviews'])
    genuine_count = total_rev - fake_count

    flagged_enriched = []
    raw_by_text = {r['text'][:80]: r for r in data['reviews']}
    for fr in batch_res.flagged_reviews:
        raw = raw_by_text.get(fr.text[:80], {})
        flagged_enriched.append({
            "text": fr.text,
            "author": raw.get("author", fr.author or "Anonymous"),
            "rating": fr.rating,
            "timestamp": raw.get("timestamp", fr.timestamp or ""),
            "platform": raw.get("platform", data.get("platform", "Unknown")),
            "risk_level": fr.risk_level,
            "tags": fr.tags,
            "evidence": fr.evidence,
            "manipulation_probability": fr.manipulation_probability,
            "page": raw.get("page", 1),
        })

    enriched_reviews_for_rep = [{
        **r,
        "is_fake": any(fe['text'][:50] == r['text'][:50] for fe in flagged_enriched)
    } for r in data['reviews']]
    rep_data = compute_reputation_data(enriched_reviews_for_rep, data.get('platform', 'Unknown'))

    result = {
        "mode": "URL",
        "url_status": sec["status"],
        "malicious_url_info": sec,
        "product_name": data.get("product_name"),
        "platform": data.get("platform"),
        "base_price": data.get("current_price"),
        "pages_scraped": data.get("pages_scraped", 0),
        "trust_score": batch_res.trust_score,
        "risk_level": batch_res.risk_level,
        "price_integrity": p_score,
        "price_history": history,
        "nlp_score": 1 - (batch_res.trust_score / 100),
        "tags": batch_res.tags + ([p_label] if p_label != "Stable" else []),
        "flagged_reviews": flagged_enriched,
        "syndicates": syndicates,
        "reputation": {
            "sentiment_distribution": sentiment_dist,
            "pros_and_cons": pros_cons,
            "ratings_distribution": ratings_dist,
            "fake_ratio": {"fake": fake_count, "genuine": genuine_count, "total_reviews": total_rev}
        },
        "rep_data": rep_data,
        "all_reviews": enriched_reviews_for_rep,
    }

    # Update global cache
    _last_analysis_cache.update({
        "reviews": enriched_reviews_for_rep,
        "platform": data.get("platform", "Unknown"),
        "product_name": data.get("product_name", "Unknown Product"),
        "product_url": url,
        "trust_score": batch_res.trust_score,
        "fake_count": fake_count,
        "total_reviews": total_rev,
        "risk_level": batch_res.risk_level,
        "tags": result["tags"],
        "flagged_reviews": flagged_enriched,
        "reputation": result["reputation"],
        "sentiment_distribution": sentiment_dist,
    })

    # Persist to batch history
    add_to_batch_history(
        product_url=url,
        product_name=data.get("product_name", "Unknown"),
        platform=data.get("platform", "Unknown"),
        trust_score=batch_res.trust_score,
        fake_count=fake_count,
        total_reviews=total_rev,
        risk_level=batch_res.risk_level,
        tags=result["tags"],
    )

    return result


# ─── /api/analyze — User Product Analysis ────────────────────────────────────
@router.post("/api/analyze", response_model=AnalyzeOutput, tags=["TrustBuy"])
def analyze_trustbuy(payload: AnalyzeInput):
    if payload.url:
        if payload.dom_reviews:
            sec = is_malicious_link(payload.url)
            data = {
                "reviews": payload.dom_reviews,
                "product_name": payload.product_name or "DOM Scraped Product",
                "platform": payload.platform or "Browser DOM",
                "current_price": 0.0,
                "pages_scraped": 1
            }
            reviews = [ReviewItem(**r) for r in data['reviews']]
            batch_res = analyze_batch(BatchAnalyzeInput(reviews=reviews))
            return JSONResponse(content={
                "mode": "URL", "url_status": sec["status"],
                "trust_score": batch_res.trust_score, "risk_level": batch_res.risk_level,
                "nlp_score": 1 - (batch_res.trust_score / 100),
                "tags": batch_res.tags, "flagged_reviews": [],
                "syndicates": [], "price_history": [],
                "reputation": {"sentiment_distribution": {}, "pros_and_cons": {}, "ratings_distribution": {}, "fake_ratio": {}}
            })

        result = _run_product_analysis(payload.url)
        return JSONResponse(content=result)

    elif payload.raw_text:
        sec = is_malicious_link(payload.raw_text) if payload.raw_text.startswith("http") else {"status": "SECURE", "reason": ""}
        res = compute_trust_score(text=payload.raw_text)
        is_fake = res['manipulation_probability'] > 0.5
        pros_cons, sentiment_dist = extract_aspects_and_summarize([{"text": payload.raw_text, "rating": 3.0}])

        return JSONResponse(content={
            "mode": "TEXT",
            "url_status": sec["status"],
            "malicious_url_info": sec,
            "trust_score": res['trust_score'],
            "risk_level": res['risk_level'],
            "nlp_score": res['manipulation_probability'],
            "tags": res['tags'],
            "flagged_reviews": [{
                "text": payload.raw_text,
                "author": "Manual Input",
                "rating": None,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "platform": "Manual",
                "risk_level": res['risk_level'],
                "tags": res['tags'],
                "evidence": res['evidence'],
                "manipulation_probability": res['manipulation_probability'],
                "page": 1,
            }] if is_fake else [],
            "syndicates": [],
            "price_history": [],
            "reputation": {
                "sentiment_distribution": sentiment_dist,
                "pros_and_cons": pros_cons,
                "ratings_distribution": {"1": 0, "2": 0, "3": 1, "4": 0, "5": 0},
                "fake_ratio": {"fake": 1 if is_fake else 0, "genuine": 0 if is_fake else 1, "total_reviews": 1}
            }
        })

    raise HTTPException(400, "Provide either 'url' or 'raw_text'")


# ─── /analyze-batch ──────────────────────────────────────────────────────────
@router.post("/analyze-batch", response_model=BatchAnalyzeOutput, tags=["Batch"])
def analyze_batch(payload: BatchAnalyzeInput):
    reviews = payload.reviews
    if not reviews:
        raise HTTPException(400, "No reviews provided.")

    flagged: List[FlaggedReview] = []
    timestamps, all_tags = [], set()
    fake_count = 0

    for r in reviews:
        res = compute_trust_score(text=r.text, rating=r.rating)
        if r.timestamp:
            timestamps.append(r.timestamp)
        if res['manipulation_probability'] > 0.5:
            fake_count += 1
            flagged.append(FlaggedReview(
                text=r.text, author=r.author, rating=r.rating, timestamp=r.timestamp,
                risk_level=res['risk_level'], tags=res['tags'], evidence=res['evidence'],
                manipulation_probability=res['manipulation_probability'],
            ))
        all_tags.update(res['tags'])

    behav = analyze_behavior([{"text": r.text, "author": r.author or ""} for r in reviews])
    all_tags.update(behav['tags'])
    temporal = analyze_temporal(timestamps) if timestamps else {}
    if temporal.get('tags'):
        all_tags.update(temporal['tags'])

    total      = len(reviews)
    real_count = total - fake_count
    fake_pct   = round((fake_count / total) * 100, 2) if total else 0.0
    avg_trust  = round(((real_count / total) * 100) if total else 50.0, 1)
    risk_level = "HIGH" if fake_pct > 50 else "MEDIUM" if fake_pct > 25 else "LOW"

    _stats["total_analyzed"] += total
    _stats["fake_detected"]  += fake_count
    _stats["real_count"]     += real_count

    return BatchAnalyzeOutput(
        total_reviews=total, fake_count=fake_count, real_count=real_count,
        fake_percentage=fake_pct, trust_score=avg_trust, risk_level=risk_level,
        tags=list(all_tags), flagged_reviews=flagged,
        temporal_analysis=temporal, behavioral_analysis=behav,
        recommendation=(
            "High fake review activity. Product reputation likely compromised." if risk_level == "HIGH"
            else "Moderate suspicious activity detected. Cross-verify before trust." if risk_level == "MEDIUM"
            else "Reviews appear authentic."
        ),
    )


# ─── /upload-csv ─────────────────────────────────────────────────────────────
@router.post("/upload-csv", tags=["Batch"])
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Only .csv files are accepted.")
    contents = await file.read()
    try:
        reader = csv.DictReader(io.StringIO(contents.decode('utf-8', errors='replace')))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    reviews = []
    for row in reader:
        text = row.get('text_') or row.get('text') or row.get('review_text') or ''
        if not text.strip():
            continue
        reviews.append(ReviewItem(
            text=text.strip(),
            rating=float(row['rating']) if row.get('rating') else None,
            author=row.get('author') or row.get('user_id') or None,
            timestamp=row.get('timestamp') or None,
            category=row.get('category') or None,
        ))

    if not reviews:
        raise HTTPException(400, "CSV contained no valid text rows.")
    return analyze_batch(BatchAnalyzeInput(reviews=reviews))





# ─── /product-trust ──────────────────────────────────────────────────────────
@router.post("/product-trust", response_model=ProductTrustOutput, tags=["Product"])
def product_trust(payload: ProductTrustInput):
    result = analyze_batch(BatchAnalyzeInput(reviews=payload.reviews))
    return ProductTrustOutput(
        product_id=payload.product_id, trust_score=result.trust_score,
        risk_level=result.risk_level, authenticity_meter=result.trust_score,
        total_reviews=result.total_reviews, fake_count=result.fake_count,
        tags=result.tags,
        evidence=f"Processed {result.total_reviews} reviews. {result.fake_percentage}% flagged as suspicious.",
        recommendation=result.recommendation,
    )




# ─── /dashboard-stats ────────────────────────────────────────────────────────
@router.get("/dashboard-stats", response_model=DashboardStatsOutput, tags=["Dashboard"])
def dashboard_stats():
    metrics_path = Path(__file__).parent.parent / "models" / "metrics.json"
    model_metrics = {}
    if metrics_path.exists():
        with open(metrics_path) as f:
            model_metrics = json.load(f)
    avg_trust = (
        round(sum(_stats["trust_scores"]) / len(_stats["trust_scores"]), 1)
        if _stats["trust_scores"] else 72.0
    )
    return DashboardStatsOutput(
        total_analyzed=_stats["total_analyzed"],
        fake_detected=_stats["fake_detected"],
        real_count=_stats["real_count"],
        avg_trust_score=avg_trust,
        model_metrics=model_metrics,
        recent_flags=_stats["recent_flags"][:20],
    )


# ─── Admin: Opinion Manipulation Dashboard ───────────────────────────────────
@router.get("/api/admin/opinion-manipulation", tags=["Admin"])
def opinion_manipulation():
    reviews = _last_analysis_cache.get("reviews", [])
    flagged = [r for r in reviews if r.get('is_fake', False)]

    bot_patterns = []
    from collections import Counter
    author_counts = Counter(r.get('author', '') for r in reviews)
    for r in flagged:
        tags = []
        if author_counts.get(r.get('author', ''), 0) > 1:
            tags.append("AUTHOR_VELOCITY_ABUSE")
        if len(r.get('text', '').split()) < 8:
            tags.append("SUSPICIOUSLY_SHORT")
        if '!!!' in r.get('text', ''):
            tags.append("EXCESSIVE_EXCLAMATIONS")
        bot_patterns.append({
            "author": r.get("author", "Anonymous"),
            "text": r.get("text", "")[:200],
            "timestamp": r.get("timestamp", ""),
            "platform": r.get("platform", "Unknown"),
            "risk_level": r.get("risk_level", "HIGH"),
            "tags": tags or ["SUSPICIOUS_CONTENT"],
            "manipulation_probability": r.get("manipulation_probability", 0.8),
            "page": r.get("page", 1),
        })

    all_words = ' '.join(r.get('text', '') for r in flagged).lower().split()
    stop = {'this', 'that', 'with', 'have', 'from', 'they', 'will', 'your', 'what', 'been', 'more',
            'when', 'very', 'just', 'like', 'also', 'into', 'than', 'then', 'some', 'would'}
    top_phrases = Counter([w for w in all_words if len(w) > 3 and w not in stop]).most_common(20)

    return {
        "product_name": _last_analysis_cache.get("product_name", "Unknown"),
        "platform": _last_analysis_cache.get("platform", "Unknown"),
        "total_reviews": len(reviews),
        "flagged_count": len(flagged),
        "fake_percentage": round(len(flagged) / max(len(reviews), 1) * 100, 1),
        "flagged_reviews": bot_patterns,
        "top_phrases": [{"word": w, "count": c} for w, c in top_phrases],
    }


# ─── Admin: Reputation Management Dashboard ──────────────────────────────────
@router.get("/api/admin/reputation-management", tags=["Admin"])
def reputation_management():
    reviews = _last_analysis_cache.get("reviews", [])
    platform = _last_analysis_cache.get("platform", "Unknown")
    return compute_reputation_data(reviews, platform)


# ─── Admin: Analyze Product URL ──────────────────────────────────────────────
@router.post("/api/admin/analyze-product", tags=["Admin"])
def admin_analyze_product(payload: AnalyzeInput):
    """Admin pastes a product URL → runs full analysis → visual dashboard."""
    if not payload.url:
        raise HTTPException(400, "URL is required")
    result = _run_product_analysis(payload.url)
    return JSONResponse(content=result)


# ─── Admin: Get Current Product Overview ─────────────────────────────────────
@router.get("/api/admin/product-overview", tags=["Admin"])
def admin_product_overview():
    """Returns the cached result of the last analyzed product."""
    cache = _last_analysis_cache
    if not cache.get("product_name") or cache["product_name"] == "Unknown":
        return {"status": "empty", "message": "No product analyzed yet. Paste a URL above to begin."}

    return {
        "status": "ok",
        "product_name": cache["product_name"],
        "product_url":  cache["product_url"],
        "platform":     cache["platform"],
        "trust_score":  cache["trust_score"],
        "fake_count":   cache["fake_count"],
        "total_reviews": cache["total_reviews"],
        "fake_pct":     round(cache["fake_count"] / max(cache["total_reviews"], 1) * 100, 1),
        "risk_level":   cache["risk_level"],
        "tags":         cache["tags"],
        "flagged_reviews": cache["flagged_reviews"][:20],
        "reputation":   cache["reputation"],
        "sentiment_distribution": cache.get("sentiment_distribution", {}),
    }


# ─── Admin: Batch History ─────────────────────────────────────────────────────
@router.get("/api/admin/batch-history", tags=["Admin"])
def admin_batch_history():
    return {"history": get_batch_history()}


# ─── Admin: Request Report from Analyst ──────────────────────────────────────
@router.post("/api/admin/request-analyst-report", tags=["Admin"])
def request_analyst_report(payload: AdminAnalystRequestInput):
    """Admin sends a report request to the data analyst."""
    # Get current analysis summary from cache
    cache = _last_analysis_cache
    analysis_summary = payload.analysis_summary or {
        "trust_score":    cache.get("trust_score", 0),
        "total_reviews":  cache.get("total_reviews", 0),
        "fake_count":     cache.get("fake_count", 0),
        "risk_level":     cache.get("risk_level", "Unknown"),
    }

    entry = add_analyst_request(
        product_url=payload.product_url,
        product_name=payload.product_name,
        admin_note=payload.admin_note,
        analysis_summary=analysis_summary,
    )
    send_analyst_request_from_admin(
        product_url=payload.product_url,
        product_name=payload.product_name,
        admin_note=payload.admin_note,
        analysis_summary=analysis_summary,
    )
    return {"status": "sent", "request_id": entry["id"], "message": "Request sent to data analyst."}


# ─── Admin: View Analyst Reports ─────────────────────────────────────────────
@router.get("/api/admin/analyst-reports", tags=["Admin"])
def admin_analyst_reports():
    reports = get_analyst_reports()
    return {"reports": reports, "unread": sum(1 for r in reports if not r.get("read_by_admin"))}


# ─── Admin: View User Reports ─────────────────────────────────────────────────
@router.get("/api/admin/user-reports", tags=["Admin"])
def admin_user_reports():
    return {"reports": get_user_reports()}

@router.post("/api/admin/user-reports/{report_id}/review", tags=["Admin"])
def admin_mark_user_report_reviewed(report_id: int):
    ok = mark_user_report_reviewed(report_id)
    return {"status": "ok" if ok else "not_found"}


# ─── Admin: Retrain Model ────────────────────────────────────────────────────
@router.post("/api/admin/retrain", tags=["Admin"])
def admin_retrain_model():
    from backend.train_model import train
    try:
        metrics = train(optimize=True)
        return {"status": "success", "message": "Model retrained and optimized with GridSearchCV.", "metrics": metrics}
    except Exception as e:
        log.error(f"Retraining failed: {e}")
        raise HTTPException(500, f"Retraining failed: {e}")


# ─── User: Submit Report to Admin ────────────────────────────────────────────
@router.post("/api/user/report", tags=["User"])
def user_submit_report(payload: UserReportInput):
    """User reports a suspicious product to admin."""
    entry = add_user_report(
        user_name=payload.user_name,
        product_url=payload.product_url,
        message=payload.message,
        user_email=payload.user_email,
    )
    send_user_report_to_admin(
        user_name=payload.user_name,
        product_url=payload.product_url,
        message=payload.message,
        user_email=payload.user_email,
    )
    return {"status": "submitted", "report_id": entry["id"], "message": "Your report has been sent to the admin team. Thank you!"}


# ─── Analyst: Get Pending Report Requests ────────────────────────────────────
@router.get("/api/analyst/pending-requests", tags=["Analyst"])
def analyst_pending_requests():
    pending = get_analyst_requests(status="pending")
    all_reqs = get_analyst_requests()
    return {
        "pending": pending,
        "all": all_reqs,
        "total_pending": len(pending),
    }


# ─── Analyst: Submit Report ───────────────────────────────────────────────────
@router.post("/api/analyst/submit-report", tags=["Analyst"])
def analyst_submit_report(payload: AnalystReportInput):
    """Analyst submits completed detailed report → notifies admin."""
    entry = add_analyst_report(
        request_id=payload.request_id,
        product_url=payload.product_url,
        product_name=payload.product_name,
        analyst_name=payload.analyst_name or "Data Analyst",
        report_content=payload.report_content,
    )
    send_analyst_report_to_admin(
        product_name=payload.product_name,
        product_url=payload.product_url,
        analyst_name=payload.analyst_name or "Data Analyst",
        report_content=payload.report_content,
    )
    return {"status": "submitted", "report_id": entry["id"], "message": "Report submitted successfully. Admin has been notified."}


# ─── Admin: URL Security Check ───────────────────────────────────────────────
@router.post("/api/check-url", tags=["Security"])
def check_url(payload: dict):
    url = payload.get("url", "")
    return is_malicious_link(url)


# ─── Notifications (for in-app mock email) ────────────────────────────────────
@router.get("/api/notifications/{role}", tags=["Utils"])
def get_role_notifications(role: str):
    return {"notifications": get_notifications_for_role(role)}


# ─── WebSocket: Live Analysis ─────────────────────────────────────────────────
@router.websocket("/ws/live-analysis")
async def websocket_live_analysis(websocket: WebSocket):
    await websocket.accept()
    try:
        data = scrape_product_data("https://amazon.com")
        reviews = [ReviewItem(**r) for r in data['reviews']]
        for r in reviews:
            res = compute_trust_score(text=r.text, rating=r.rating)
            prob = res['manipulation_probability'] * 100
            reason = "High-Confidence Bot" if prob > 85 else ("Linguistic Mimicry" if prob > 60 else "Safe")
            await websocket.send_json({
                "text": r.text, "author": r.author, "prob": round(prob, 2),
                "reason": reason, "time": r.timestamp, "id": r.author
            })
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        pass


# ─── Report Generation ────────────────────────────────────────────────────────
@router.post("/api/generate-report", tags=["Reports"])
def generate_report(payload: dict):
    report = TrustBuyReport(
        product_name=payload.get("product_name", "Unknown Product"),
        trust_score=payload.get("trust_score", 0),
        price_status="Stable" if payload.get("price_integrity", 1) > 0.5 else "Fake Sale Detected",
        flagged_count=len(payload.get("flagged_reviews", []))
    )
    filename = report.generate()
    return FileResponse(filename, filename="TrustBuy_Audit.pdf", media_type="application/pdf")


@router.get("/api/currency", tags=["Utils"])
def convert_currency(target: str = "USD"):
    return {"target": target, "rate": get_exchange_rate("USD", target)}
