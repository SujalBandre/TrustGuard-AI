"""
TrustGuard-AI | URL Security Engine
Detects malicious URLs, phishing sites, typosquatting, and fake e-commerce clones.
"""
import re
import logging
try:
    import tldextract
    _HAS_TLDEXTRACT = True
except ImportError:
    _HAS_TLDEXTRACT = False

log = logging.getLogger(__name__)

TRUSTED_DOMAINS = ["amazon", "flipkart", "ebay", "walmart", "bestbuy", "target",
                   "myntra", "meesho", "snapdeal", "ajio"]

PHISHING_PATTERNS = [
    r"login", r"verify", r"update-account", r"auth", r"confirm", r"secure",
    r"signin", r"account-verify", r"password-reset", r"billing",
]

FAKE_ECOMMERCE_SIGNALS = [
    r"shop-deals", r"best-price", r"official-store", r"buy-now-cheap",
    r"discount-store", r"sale-online", r"mega-deals", r"free-stuff",
    r"ebay-shop", r"amazon-shop", r"flipkart-deals",
]

RISKY_TLDS = ["xyz", "top", "pw", "click", "cc", "club", "stream", "gq", "tk",
              "ml", "ga", "cf", "bid", "men", "loan", "party"]

def is_malicious_link(url: str) -> dict:
    """
    Full malicious URL check.
    Returns {status: 'MALICIOUS'|'SUSPICIOUS'|'SECURE', reason: str, threat_type: str}
    """
    if not url:
        return {"status": "SECURE", "reason": "No URL provided", "threat_type": None}

    url_lower = url.lower()

    # Check 1: Protocol
    if not url_lower.startswith("http://") and not url_lower.startswith("https://"):
        return {
            "status": "MALICIOUS",
            "reason": "Missing or insecure protocol. Only HTTP/HTTPS permitted.",
            "threat_type": "INVALID_PROTOCOL"
        }

    # Check 2: HTTP (not HTTPS) on trusted domains is suspicious
    if url_lower.startswith("http://"):
        if any(td in url_lower for td in TRUSTED_DOMAINS):
            return {
                "status": "SUSPICIOUS",
                "reason": "Trusted domain accessed over HTTP (not HTTPS). Could be a man-in-the-middle attack.",
                "threat_type": "INSECURE_PROTOCOL"
            }

    # Extract domain parts
    if _HAS_TLDEXTRACT:
        ext = tldextract.extract(url)
        domain = ext.domain.lower()
        subdomain = ext.subdomain.lower()
        tld = ext.suffix.lower()
    else:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            parts = parsed.netloc.lower().split('.')
            domain = parts[-2] if len(parts) >= 2 else parts[0]
            subdomain = '.'.join(parts[:-2])
            tld = parts[-1] if len(parts) >= 1 else ''
        except Exception:
            return {"status": "SUSPICIOUS", "reason": "Could not parse URL", "threat_type": "PARSE_ERROR"}

    # Check 3: Phishing patterns in URL path
    if any(re.search(p, url_lower) for p in PHISHING_PATTERNS):
        return {
            "status": "MALICIOUS",
            "reason": f"Phishing keyword detected in URL (login/verify/signin/secure pattern).",
            "threat_type": "PHISHING"
        }

    # Check 4: Fake e-commerce signals
    if any(re.search(p, url_lower) for p in FAKE_ECOMMERCE_SIGNALS):
        return {
            "status": "MALICIOUS",
            "reason": "URL matches known fake e-commerce site pattern.",
            "threat_type": "FAKE_ECOMMERCE"
        }

    # Check 5: Direct trusted domain check
    if domain in TRUSTED_DOMAINS:
        if subdomain and len(subdomain.split('.')) > 2:
            return {
                "status": "SUSPICIOUS",
                "reason": "Trusted domain with excessive subdomains — possible subdomain spoofing.",
                "threat_type": "SUBDOMAIN_SPOOFING"
            }
        return {"status": "SECURE", "reason": "Verified trusted e-commerce domain.", "threat_type": None}

    # Check 6: Typosquatting — domain *contains* trusted name but isn't exactly it
    for td in TRUSTED_DOMAINS:
        if td in domain and domain != td:
            return {
                "status": "MALICIOUS",
                "reason": f"Typosquatting detected: '{domain}' mimics '{td}'.",
                "threat_type": "TYPOSQUATTING"
            }
        # 1-character diff (e.g., amaz0n, amozon)
        if len(domain) == len(td):
            diffs = sum(1 for a, b in zip(domain, td) if a != b)
            if diffs == 1:
                return {
                    "status": "MALICIOUS",
                    "reason": f"Typosquatting detected: '{domain}' is 1 character off from '{td}'.",
                    "threat_type": "TYPOSQUATTING"
                }

    # Check 7: Risky TLD
    if tld in RISKY_TLDS:
        return {
            "status": "MALICIOUS",
            "reason": f"High-risk TLD detected (.{tld}) — commonly used for phishing.",
            "threat_type": "RISKY_TLD"
        }

    # Check 8: IP address URL
    if re.match(r'https?://\d+\.\d+\.\d+\.\d+', url):
        return {
            "status": "MALICIOUS",
            "reason": "IP address used as host — direct IP URLs are a common phishing indicator.",
            "threat_type": "IP_HOST"
        }

    # Check 9: Very long URLs (often phishing)
    if len(url) > 200:
        return {
            "status": "SUSPICIOUS",
            "reason": "Excessively long URL — potential obfuscation technique.",
            "threat_type": "URL_OBFUSCATION"
        }

    return {
        "status": "SUSPICIOUS",
        "reason": "Domain not in trusted e-commerce list. Verify before proceeding.",
        "threat_type": "UNKNOWN_DOMAIN"
    }
