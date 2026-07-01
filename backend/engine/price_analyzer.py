import datetime
import random

def generate_price_trust_history(current_price: float, current_trust: float, dates: int = 30) -> list:
    """
    Simultaneously produces simulated history arrays for Price and Trust Score over N days.
    Usually we would query a historical DB or API.
    We introduce a specific manipulation signature (fake sale + review burst) if the current trust is low.
    """
    history = []
    base_price = current_price * 1.5 if random.random() > 0.5 else current_price
    
    # We work backwards from today
    today = datetime.datetime.utcnow()
    
    # If the user has a low trust score now, we simulate a recent drop in trust coinciding with a price drop.
    manipulated = current_trust < 50
    manipulation_start_day = random.randint(3, 10) # 3 to 10 days ago 

    curr_p = base_price
    curr_t = 80.0 # historical baseline trust is usually okay

    for i in range(dates, -1, -1):
        day_date = (today - datetime.timedelta(days=i)).strftime('%Y-%m-%d')
        
        if manipulated and i == manipulation_start_day:
            # Drop price by 30% suddenly! And trust drops as fake reviews pour in over next days.
            curr_p = base_price * 0.65
            curr_t = current_trust + 10 # start dropping
            
        elif manipulated and i < manipulation_start_day:
            curr_t = max(current_trust, curr_t - random.uniform(2, 5))
            curr_p = curr_p + random.uniform(-1, 2)
        else:
            # Stable variations
            curr_t = min(100, max(0, curr_t + random.uniform(-2, 2)))
            curr_p = max(0, curr_t + random.uniform(-1, 1)) * (base_price / 80)
            
        history.append({
            "date": day_date,
            "price": round(curr_p, 2),
            "trust": round(curr_t, 1)
        })
        
    return history


def calculate_price_integrity(price_drop_pct: float, review_spike_pct: float) -> float:
    """
    Price Integrity Score (Pi) = 1 - (Review Spike % / Price Drop %)
    If result is negative or near zero, it signifies a promotional bias scam.
    Returns: integrity_score, label
    """
    if price_drop_pct <= 0:
        return 1.0, "Stable"
        
    pi = 1.0 - (review_spike_pct / price_drop_pct)
    
    label = "Price Manipulation Detected" if pi <= 0.2 else "Stable"
    return round(pi, 4), label
