import random
from functools import lru_cache
import logging

log = logging.getLogger(__name__)

@lru_cache(maxsize=32)
def get_exchange_rate(base: str = "USD", target: str = "USD") -> float:
    """Mock implementation of the Currency API (Fixer.io)"""
    if base == target:
        return 1.0
        
    rates = {
        "INR": 83.15,
        "EUR": 0.92,
        "GBP": 0.79,
        "CAD": 1.35
    }
    
    # If targeting USD from something else
    if target == "USD" and base in rates:
        return 1.0 / rates[base]
        
    # If targeting something from USD
    if base == "USD" and target in rates:
        return rates[target]
        
    # Arbitrary fallback
    return random.uniform(0.5, 100.0)

def verify_url_safety(url: str) -> str:
    """Mock implementation of Google Web Risk / Phishing checks"""
    if not url:
        return "SECURE"
        
    url_lower = url.lower()
    if "login" in url_lower or "secure" in url_lower:
        return "MALICIOUS"
        
    # Example of a known bad mock
    if "login-amozon-secure" in url_lower:
        return "MALICIOUS"
        
    return "SECURE"

def get_price_history(product_id: str) -> list:
    """Mock implementation of Keepa API / RainForest API"""
    import datetime
    
    history = []
    base_price = random.uniform(20, 200)
    today = datetime.datetime.utcnow()
    
    for i in range(30, -1, -1):
        day_date = (today - datetime.timedelta(days=i)).strftime('%Y-%m-%d')
        # Introduce a fake drop roughly 10 days ago
        if i == 10:
            base_price = base_price * 0.7
        else:
            base_price += random.uniform(-2, 2)
            
        history.append({
            "date": day_date,
            "price": round(max(1.0, base_price), 2)
        })
        
    return history
