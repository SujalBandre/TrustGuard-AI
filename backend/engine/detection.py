"""
TrustGuard-AI | Detection Engine
Multi-Factor Trust Score combining three weighted layers:
  40% Text NLP (TF-IDF LR + linguistic heuristics)
  30% Behavioral (account patterns, duplicates, velocity)
  30% Temporal   (review burst / velocity spike detection)
"""
import re
import math
import logging
import hashlib
import numpy as np
from pathlib import Path
from datetime import datetime
from collections import Counter

# Required for joblib to deserialize the model bundle correctly
from backend.engine.feature_extractor import HybridFeatureExtractor  # noqa: F401

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
_vader = SentimentIntensityAnalyzer()

log = logging.getLogger(__name__)

import nltk
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

_lemmatizer = WordNetLemmatizer()

# ── Negation-preserving stopwords — must match train_model.py exactly ─────────
_NEGATION_WORDS = {
    'not', 'no', 'nor', 'never', 'none', 'nobody', 'nothing',
    'neither', 'nowhere', 'hardly', 'barely', 'scarcely',
    'cannot', "can't", "won't", "don't", "didn't", "isn't",
    "wasn't", "aren't", "weren't", "hasn't", "haven't", "hadn't"
}
_stop_words = set(stopwords.words('english')) - _NEGATION_WORDS

# ─── Preprocessing ───────────────────────────────────────────────────────────
def preprocess_text(text: str) -> str:
    """Negation-aware preprocessor — must match the ensemble training pipeline."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    tokens = text.split()
    tokens = [_lemmatizer.lemmatize(t) for t in tokens if t not in _stop_words and len(t) > 1]
    return ' '.join(tokens)


# ─── Load ML Model ────────────────────────────────────────────────────────────
_MODEL_PATH = Path(__file__).parent.parent / "models" / "lr_pipeline.joblib"
_model_bundle = None

def _load_model():
    global _model_bundle
    if _model_bundle is None:
        try:
            import joblib
            loaded = joblib.load(_MODEL_PATH)
            _model_bundle = loaded
            log.info(f"Model bundle loaded from {_MODEL_PATH}")
        except Exception as e:
            log.warning(f"Model not found ({e}). Run 'python -m backend.train_model' first.")
    return _model_bundle


def _predict_fake_prob(text: str, clean: str) -> float:
    """Use the model bundle to predict fake probability."""
    bundle = _load_model()
    if not bundle or not clean:
        return _heuristic_fallback_prob(text)

    # New bundle format: dict with extractor + lr + sgd + nb
    if isinstance(bundle, dict) and 'extractor' in bundle:
        try:
            extractor     = bundle['extractor']
            lr            = bundle['lr']
            sgd           = bundle['sgd']
            nb            = bundle['nb']
            word_tfidf_nb = bundle['word_tfidf_nb']

            X_feat = extractor.transform([text])
            X_nb   = word_tfidf_nb.transform([clean])

            lr_prob  = lr.predict_proba(X_feat)[0][1]
            sgd_prob = sgd.predict_proba(X_feat)[0][1]
            nb_prob  = nb.predict_proba(X_nb)[0][1]
            prob = (4 * lr_prob + 2 * sgd_prob + 1 * nb_prob) / 7
            log.info(f"✅ HybridEnsemble: '{text[:25]}...' → PROB={prob:.3f} (LR={lr_prob:.2f} SGD={sgd_prob:.2f} NB={nb_prob:.2f})")
            return float(prob)
        except Exception as e:
            log.error(f"Bundle prediction error: {e}")
            return _heuristic_fallback_prob(text)
    else:
        # Legacy single pipeline
        try:
            prob = float(bundle.predict_proba([clean])[0][1])
            log.info(f"✅ Legacy pipeline: '{text[:25]}...' → PROB={prob:.3f}")
            return float(prob)
        except Exception as e:
            log.error(f"Legacy pipeline error: {e}")
            return _heuristic_fallback_prob(text)


# ─── Layer 1: Text / NLP Analysis ────────────────────────────────────────────
def analyze_text(text: str, rating: float = None) -> dict:
    """
    Returns:
      fake_prob: 0-1 probability the review is fake
      tags: list of reasoning tags
      evidence: human-readable evidence snippet
    """
    if not text or not text.strip():
        return {"fake_prob": 0.5, "tags": [], "evidence": "No text provided.", "heuristics": {}}

    clean = preprocess_text(text)
    # ── ML prediction ──
    prob = _predict_fake_prob(text, clean)

    # ── Linguistic heuristics ──
    heuristics = compute_linguistic_heuristics(text)

    # Boost probability based on heuristics
    excl_boost      = min(heuristics['exclamation_freq'] * 0.15, 0.2)
    caps_boost      = min(heuristics['caps_ratio'] * 0.1,        0.1)
    div_penalty     = max(0, (0.4 - heuristics['lexical_diversity']) * 0.3)
    short_boost     = 0.1 if heuristics['word_count'] < 6 else 0.0
    all_caps_boost  = min(heuristics.get('all_caps_ratio', 0) * 0.2, 0.15)
    url_boost       = 0.1 if heuristics.get('url_count', 0) > 0 else 0.0
    superl_boost    = min(heuristics.get('superlative_ratio', 0) * 0.25, 0.12)

    prob = min(1.0, prob + excl_boost + caps_boost + div_penalty + short_boost
               + all_caps_boost + url_boost + superl_boost)

    # ── Sentiment-rating alignment ──
    alignment_tag = None
    if rating is not None:
        sentiment = _simple_sentiment(text)
        if rating >= 4.0 and sentiment < -0.2:
            alignment_tag = "SENTIMENT_MISMATCH"
            prob = min(1.0, prob + 0.15)
        elif rating <= 2.0 and sentiment > 0.3:
            alignment_tag = "SENTIMENT_MISMATCH"
            prob = min(1.0, prob + 0.15)

    # ── Build tags ──
    tags = []
    if prob > 0.7:                              tags.append("HIGH_FAKE_PROBABILITY")
    if excl_boost > 0.1:                        tags.append("EXCESSIVE_EXCLAMATIONS")
    if caps_boost > 0.05:                       tags.append("CAPS_OVERUSE")
    if all_caps_boost > 0.05:                   tags.append("ALL_CAPS_SHOUTING")
    if div_penalty > 0.15:                      tags.append("LOW_LEXICAL_DIVERSITY")
    if short_boost > 0:                         tags.append("SUSPICIOUSLY_SHORT")
    if url_boost > 0:                           tags.append("SPAM_URL_IN_REVIEW")
    if superl_boost > 0.06:                     tags.append("SUPERLATIVE_OVERUSE")
    if alignment_tag:                           tags.append(alignment_tag)
    if heuristics.get('repeated_phrases'):      tags.append("REPEATED_PHRASES")

    evidence = _build_evidence(text, prob, heuristics)

    return {
        "fake_prob":  round(prob, 4),
        "tags":       tags,
        "evidence":   evidence,
        "heuristics": heuristics,
    }


def compute_linguistic_heuristics(text: str) -> dict:
    words      = text.split()
    word_count = len(words)
    unique     = set(w.lower() for w in words)
    lex_div    = len(unique) / word_count if word_count > 0 else 0
    excl_freq  = text.count('!') / max(word_count, 1)
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)

    # Over-lexicalization: unusual density of long or technical words
    long_words = sum(1 for w in words if len(w) > 8)
    over_lexicalization = long_words / max(word_count, 1)

    # All-caps words (SHOUTING indicator)
    all_caps_words = sum(1 for w in words if w.isupper() and len(w) > 1)
    all_caps_ratio = all_caps_words / max(word_count, 1)

    # URL presence in review (spam signal)
    url_count = len(re.findall(r'http[s]?://|www\.', text))

    # Superlative overuse: best, worst, amazing, perfect, terrible
    superlatives = {'best', 'worst', 'amazing', 'perfect', 'terrible', 'greatest',
                    'awful', 'horrible', 'excellent', 'fantastic', 'outstanding',
                    'superb', 'brilliant', 'disgusting', 'incredible', 'phenomenal'}
    superlative_count = sum(1 for w in words if w.lower().strip('!.,') in superlatives)
    superlative_ratio = superlative_count / max(word_count, 1)

    # Repeated bi-grams (spam indicator)
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
    bg_counts = Counter(bigrams)
    repeated  = [bg for bg, cnt in bg_counts.items() if cnt > 1]

    return {
        "word_count":         word_count,
        "lexical_diversity":  round(lex_div, 4),
        "exclamation_freq":   round(excl_freq, 4),
        "caps_ratio":         round(caps_ratio, 4),
        "over_lexicalization": round(over_lexicalization, 4),
        "all_caps_ratio":     round(all_caps_ratio, 4),
        "url_count":          url_count,
        "superlative_ratio":  round(superlative_ratio, 4),
        "repeated_phrases":   repeated[:3],
    }


def _simple_sentiment(text: str) -> float:
    """Uses VaderSentiment for robust polarity scoring."""
    scores = _vader.polarity_scores(text)
    return scores['compound']


def _heuristic_fallback_prob(text: str) -> float:
    h = compute_linguistic_heuristics(text)
    prob = 0.35
    prob += min(h['exclamation_freq'] * 2, 0.3)
    prob += min(h['caps_ratio'] * 0.5, 0.15)
    prob += max(0, (0.4 - h['lexical_diversity']) * 0.5)
    return min(1.0, prob)


def _build_evidence(text: str, prob: float, heuristics: dict) -> str:
    parts = []
    if prob > 0.7:
        parts.append(f"ML model assigned {prob*100:.0f}% fake probability.")
    if heuristics['exclamation_freq'] > 0.05:
        parts.append(f"High exclamation frequency ({heuristics['exclamation_freq']*100:.1f}% of words).")
    if heuristics['lexical_diversity'] < 0.4:
        parts.append(f"Low lexical diversity ({heuristics['lexical_diversity']*100:.0f}%) — typical of templated reviews.")
    if heuristics['caps_ratio'] > 0.15:
        parts.append(f"Excessive capitalization ({heuristics['caps_ratio']*100:.0f}% of characters).")
    if heuristics['repeated_phrases']:
        parts.append(f"Repeated phrases detected: {heuristics['repeated_phrases'][:2]}.")
    if not parts:
        parts.append("Pattern analysis found no strong manipulation signals.")
    return " ".join(parts)


# ─── Layer 2: Behavioral Analysis ────────────────────────────────────────────
def analyze_behavior(reviews: list[dict]) -> dict:
    """
    Analyzes behavioral patterns across a batch of reviews.
    Each review dict should have keys: text, author, user_id (optional).
    Returns bot_probability and per-review flags.
    """
    if not reviews:
        return {"bot_prob": 0.0, "tags": [], "detected_bots": []}

    texts   = [r.get('text', '') for r in reviews]
    authors = [r.get('author', '') for r in reviews]

    flags  = [False] * len(reviews)
    tags   = set()

    # ── 1: Exact duplicates ──
    hashes    = [hashlib.md5(t.encode()).hexdigest() for t in texts]
    seen_hash = {}
    for i, h in enumerate(hashes):
        if h in seen_hash:
            flags[i] = True
            tags.add("EXACT_DUPLICATE")
        else:
            seen_hash[h] = i

    # ── 2: High cosine similarity (simplified via TF-IDF top words) ──
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        if len(texts) > 1:
            tfidf = TfidfVectorizer(max_features=500).fit_transform(texts)
            sim   = cosine_similarity(tfidf)
            for i in range(len(texts)):
                for j in range(i+1, len(texts)):
                    if sim[i, j] > 0.85 and not flags[i]:
                        flags[j] = True
                        tags.add("HIGH_SIMILARITY_CLONE")
    except Exception:
        pass

    # ── 3: Author velocity ──
    author_counts = Counter(authors)
    for i, auth in enumerate(authors):
        if auth and author_counts[auth] > 1:
            flags[i] = True
            tags.add("AUTHOR_VELOCITY_ABUSE")

    # ── 4: Syndicate detection (same short author names, low variance) ──
    name_lengths = [len(a) for a in authors if a]
    if name_lengths and np.std(name_lengths) < 1.5 and len(set(authors)) < len(authors) * 0.6:
        tags.add("SYNDICATE_REVIEWER_PATTERN")

    bot_count = sum(flags)
    bot_prob  = bot_count / len(reviews)

    return {
        "bot_prob":      round(bot_prob, 4),
        "tags":          list(tags),
        "flags":         flags,
        "detected_bots": bot_count,
    }


# ─── Layer 3: Temporal Analysis ──────────────────────────────────────────────
def analyze_temporal(timestamps: list[str]) -> dict:
    """
    Detects review bursts (sudden spikes in review velocity).
    timestamps: ISO format string list, e.g. ['2024-01-01T10:00:00', ...]
    """
    if len(timestamps) < 3:
        return {"burst_detected": False, "velocity_score": 0.0, "tags": []}

    parsed = []
    for ts in timestamps:
        try:
            parsed.append(datetime.fromisoformat(str(ts)))
        except Exception:
            pass

    if len(parsed) < 3:
        return {"burst_detected": False, "velocity_score": 0.0, "tags": []}

    parsed.sort()

    # Compute inter-arrival times in minutes
    deltas = [(parsed[i+1] - parsed[i]).total_seconds() / 60 for i in range(len(parsed)-1)]
    mean_delta = np.mean(deltas)
    std_delta  = np.std(deltas)

    # Detect windows where reviews arrive faster than mean - 2σ
    threshold  = max(1.0, mean_delta - 2 * std_delta)
    burst_idx  = [i for i, d in enumerate(deltas) if d < threshold]
    burst_pct  = len(burst_idx) / len(deltas) if deltas else 0

    velocity_score = min(1.0, burst_pct * 2)
    burst_detected = burst_pct > 0.25

    tags = []
    if burst_detected:
        tags.append("REVIEW_BURST_DETECTED")
    if mean_delta < 5:
        tags.append("RAPID_FIRE_REVIEWS")
    if velocity_score > 0.7:
        tags.append("COMPETITOR_BOMBING_PATTERN")

    return {
        "burst_detected":  burst_detected,
        "velocity_score":  round(velocity_score, 4),
        "tags":            tags,
        "mean_interval_m": round(mean_delta, 2),
        "burst_windows":   len(burst_idx),
    }


# ─── Final Fusion: Multi-Factor Trust Score ───────────────────────────────────
def compute_trust_score(
    text: str            = None,
    rating: float        = None,
    reviews_batch: list  = None,
    timestamps: list     = None,
) -> dict:
    """
    Computes the unified Multi-Factor Trust Score (0-100%).
    Weights: 40% Text NLP | 30% Behavioral | 30% Temporal
    """
    all_tags      = []
    all_evidence  = []
    modules       = {}

    # ── Text layer (40%) ──
    text_fake_prob = 0.3
    if text:
        t_result        = analyze_text(text, rating)
        text_fake_prob  = t_result['fake_prob']
        all_tags       += t_result['tags']
        all_evidence.append(t_result['evidence'])
        modules['text'] = {
            "fake_prob":  text_fake_prob,
            "heuristics": t_result['heuristics'],
        }

    # ── Behavioral layer (30%) ──
    behav_bot_prob = 0.1
    if reviews_batch:
        b_result        = analyze_behavior(reviews_batch)
        behav_bot_prob  = b_result['bot_prob']
        all_tags       += b_result['tags']
        modules['behavior'] = b_result

    # ── Temporal layer (30%) ──
    temporal_score = 0.0
    if timestamps:
        ts_result      = analyze_temporal(timestamps)
        temporal_score = ts_result['velocity_score']
        all_tags      += ts_result['tags']
        modules['temporal'] = ts_result

    # ── Fuse: weighted fake score ──
    weights   = [0.4 if text else 0, 0.3 if reviews_batch else 0, 0.3 if timestamps else 0]
    total_w   = sum(weights)
    if total_w == 0:
        integrated_fake = 0.4
    else:
        w = [x / total_w for x in weights]
        integrated_fake = w[0]*text_fake_prob + w[1]*behav_bot_prob + w[2]*temporal_score

    trust_score = round((1 - integrated_fake) * 100, 1)
    risk_level  = (
        "HIGH"   if integrated_fake > 0.65 else
        "MEDIUM" if integrated_fake > 0.40 else
        "LOW"
    )

    manipulation_probability = round(integrated_fake, 4)

    return {
        "trust_score":              trust_score,            # 0-100%
        "manipulation_probability": manipulation_probability,
        "risk_level":               risk_level,
        "tags":                     list(set(all_tags)),
        "evidence":                 " | ".join(all_evidence) if all_evidence else "No strong manipulation signals detected.",
        "modules":                  modules,
        "recommendation": (
            "DO NOT TRUST — High manipulation probability detected. Avoid purchase based on these reviews."
            if risk_level == "HIGH" else
            "PROCEED WITH CAUTION — Some suspicious signals detected."
            if risk_level == "MEDIUM" else
            "TRUSTWORTHY — Reviews appear genuine."
        ),
    }
