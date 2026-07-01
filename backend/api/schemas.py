"""TrustGuard-AI | API Schemas (Pydantic v2)"""
from pydantic import BaseModel, Field
from typing   import Optional, List, Any

# ─── Dual Input Analyzer ────────────────────────────────────────────────────
class AnalyzeInput(BaseModel):
    url:          Optional[str] = None
    raw_text:     Optional[str] = None
    dom_reviews:  Optional[List[dict]] = None
    product_name: Optional[str] = None
    platform:     Optional[str] = None

class AnalyzeOutput(BaseModel):
    mode:             str                  # 'URL' or 'TEXT'
    url_status:       Optional[str] = None # 'MALICIOUS', 'SUSPICIOUS', 'SECURE'
    trust_score:      float
    risk_level:       str
    recommendation:   str
    price_integrity:  Optional[float] = None
    price_history:    List[dict] = []
    nlp_score:        float
    tags:             List[str] = []
    flagged_reviews:  List[dict] = []
    all_reviews:      Optional[List[dict]] = None
    reputation:       Optional[dict] = None
    syndicates:       Optional[List[dict]] = None


# ─── Older Models for BWC ───────────────────────────────────────────────────
class ReviewItem(BaseModel):
    text:      str
    rating:    Optional[float]  = None
    author:    Optional[str]    = None
    user_id:   Optional[str]    = None
    timestamp: Optional[str]    = None
    category:  Optional[str]    = None

class VerifyReviewInput(BaseModel):
    text:      str
    rating:    Optional[float] = None
    author:    Optional[str]   = None
    timestamp: Optional[str]   = None

class VerifyReviewOutput(BaseModel):
    trust_score:              float
    manipulation_probability: float
    risk_level:               str
    tags:                     List[str]
    evidence:                 str
    recommendation:           str
    modules:                  dict

class BatchAnalyzeInput(BaseModel):
    reviews: List[ReviewItem]

class FlaggedReview(BaseModel):
    text:      str
    author:    Optional[str] = None
    rating:    Optional[float] = None
    timestamp: Optional[str]  = None
    risk_level: str
    tags:       List[str]
    evidence:   str
    manipulation_probability: float

class BatchAnalyzeOutput(BaseModel):
    total_reviews:     int
    fake_count:        int
    real_count:        int
    fake_percentage:   float
    trust_score:       float
    risk_level:        str
    tags:              List[str]
    flagged_reviews:   List[FlaggedReview]
    temporal_analysis: dict
    behavioral_analysis: dict
    recommendation:    str

class ProductTrustInput(BaseModel):
    product_id: str
    reviews:    List[ReviewItem]

class ProductTrustOutput(BaseModel):
    product_id:   str
    trust_score:  float
    risk_level:   str
    authenticity_meter: float
    total_reviews: int
    fake_count:   int
    tags:         List[str]
    evidence:     str
    recommendation: str



class DashboardStatsOutput(BaseModel):
    total_analyzed:  int
    fake_detected:   int
    real_count:      int
    avg_trust_score: float
    model_metrics:   dict
    recent_flags:    List[Any]


# ─── NEW: Report / Workflow Schemas ─────────────────────────────────────────

class UserReportInput(BaseModel):
    product_url:  str
    message:      str
    user_name:    Optional[str] = "Anonymous"
    user_email:   Optional[str] = ""

class AdminAnalystRequestInput(BaseModel):
    product_url:      str
    product_name:     str
    admin_note:       str
    analysis_summary: Optional[dict] = None

class AnalystReportInput(BaseModel):
    request_id:     int
    product_url:    str
    product_name:   str
    analyst_name:   Optional[str] = "Data Analyst"
    report_content: str

class ReportOut(BaseModel):
    id:          int
    status:      Optional[str] = None
    ts:          str
    message:     Optional[str] = None
