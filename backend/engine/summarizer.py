import logging
from textblob import TextBlob
import nltk

log = logging.getLogger(__name__)

def extract_aspects_and_summarize(reviews):
    """
    Groups sentences into Pros (positive sentiment) and Cons (negative sentiment).
    Takes a list of review dictionaries containing "text", "author", "prob" (optional)
    """
    pros = []
    cons = []
    
    sentiment_dist = {
        "positive": 0,
        "neutral": 0,
        "negative": 0
    }

    if not reviews:
        return {"pros": [], "cons": []}, sentiment_dist

    # Filter heavily toward genuine reviews (bot prob < 70) if provided 
    for r in reviews:
        # Check sentiment for entire block
        text = r.get("text", "")
        if not text:
            continue
            
        prob = r.get("bot_prob", 0)
        blob = TextBlob(str(text))
        
        # Distribution math
        polarity = blob.sentiment.polarity
        if polarity > 0.1:
            sentiment_dist["positive"] += 1
        elif polarity < -0.1:
            sentiment_dist["negative"] += 1
        else:
            sentiment_dist["neutral"] += 1
            
        # Only extract sentences from somewhat safe reviews
        if prob < 0.7:
            for sentence in blob.sentences:
                sp = sentence.sentiment.polarity
                cleaned = str(sentence).strip()
                if 20 < len(cleaned) < 120:  # Reasonably lengthed sentence that makes an exact point
                    if sp > 0.3:
                        pros.append(cleaned)
                    elif sp < -0.3:
                        cons.append(cleaned)

    unique_pros = list(set(pros))[:6]
    unique_cons = list(set(cons))[:6]

    return {
        "pros": unique_pros,
        "cons": unique_cons,
    }, sentiment_dist
