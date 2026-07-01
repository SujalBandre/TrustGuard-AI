"""
TrustGuard-AI | Hybrid Multi-Source E-Commerce Scraper
Data Pipeline: RapidAPI → Web Scraper (cloudscraper) → Dataset Fallback
Supports: Amazon, Flipkart, Myntra, Meesho, Snapdeal, AJIO, eBay, Walmart
"""
import cloudscraper
from bs4 import BeautifulSoup
import re
import random
import time
import logging
import hashlib
import os
import json
import requests
import pandas as pd
from typing import Dict, List, Optional
from urllib.parse import urlparse, urlencode, urlunparse, parse_qs, urljoin
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

# ── API Key Configuration ──────────────────────────────────────────────────────
RAPIDAPI_KEY        = os.getenv("RAPIDAPI_KEY", "")
RAINFOREST_API_KEY  = os.getenv("RAINFOREST_API_KEY", "")

# ── E-Commerce Platform Registry ─────────────────────────────────────────────
ECOMMERCE_PLATFORMS = {
    "amazon":   {"keywords": ["amazon.com", "amazon.in", "amazon.co"], "page_param": "pageNumber"},
    "flipkart": {"keywords": ["flipkart.com"],                          "page_param": "page"},
    "myntra":   {"keywords": ["myntra.com"],                            "page_param": "p"},
    "meesho":   {"keywords": ["meesho.com"],                            "page_param": "page"},
    "snapdeal": {"keywords": ["snapdeal.com"],                          "page_param": "page"},
    "ajio":     {"keywords": ["ajio.com"],                              "page_param": "page"},
    "ebay":     {"keywords": ["ebay.com", "ebay.in", "ebay.co"],        "page_param": "pgn"},
    "walmart":  {"keywords": ["walmart.com"],                           "page_param": "page"},
    "target":   {"keywords": ["target.com"],                            "page_param": "page"},
    "bestbuy":  {"keywords": ["bestbuy.com"],                           "page_param": "page"},
}

DATASET_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'final_labeled_fake_reviews.csv')
FALLBACK_DATASET_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'fake_reviews_dataset.csv')

AUTHOR_NAMES = [
    "Rahul S", "Priya K", "Amit V", "Sneha M", "Vikram T", "Ananya R", "Rohan D",
    "Neha G", "Arjun P", "Pooja S", "Karan B", "Divya N", "Sahil A", "Riya C",
    "Manish J", "Isha W", "Deepak L", "Simran H", "Rajesh F", "Kavita Z",
    "John D", "Sarah M", "Michael T", "Emma W", "David B", "Lisa K", "James R",
    "Jennifer L", "Robert C", "Patricia H", "William E", "Barbara Y", "Richard U",
]

def detect_platform(url: str) -> Optional[str]:
    url_lower = url.lower()
    for platform, config in ECOMMERCE_PLATFORMS.items():
        for keyword in config["keywords"]:
            if keyword in url_lower:
                return platform
    return None

def extract_platform_name(url: str) -> str:
    p = detect_platform(url)
    return p.capitalize() if p else "Unknown"

def _extract_amazon_asin(url: str) -> Optional[str]:
    """Extract ASIN from Amazon URL."""
    patterns = [
        r'/dp/([A-Z0-9]{10})',
        r'/product/([A-Z0-9]{10})',
        r'asin=([A-Z0-9]{10})',
        r'/([A-Z0-9]{10})(?:/|\?|$)',
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None

def _extract_flipkart_pid(url: str) -> Optional[str]:
    """Extract product ID from Flipkart URL."""
    m = re.search(r'pid=([A-Z0-9]+)', url)
    if m:
        return m.group(1)
    parts = url.rstrip('/').split('/')
    if len(parts) > 0:
        last = parts[-1]
        if re.match(r'^[A-Z0-9]{16}$', last):
            return last
    return None


# ── RapidAPI: Amazon Reviews ──────────────────────────────────────────────────
def _try_rapidapi_amazon(url: str, max_pages: int = 5) -> List[dict]:
    """
    Fetch Amazon reviews via RapidAPI Real-Time Amazon Data.
    Sign up at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data
    Set RAPIDAPI_KEY in backend/.env
    NOTE: You must also SUBSCRIBE to the API on RapidAPI (free tier available).
    """
    if not RAPIDAPI_KEY:
        log.info("RAPIDAPI_KEY not set — skipping RapidAPI Amazon fetch")
        return []

    asin = _extract_amazon_asin(url)
    if not asin:
        log.warning(f"Could not extract ASIN from URL: {url}")
        return []

    reviews = []
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com",
    }

    # Try IN country first, then US as fallback (some ASINs only have US data)
    for country in ["IN", "US"]:
      for page in range(1, max_pages + 1):
        try:
            resp = requests.get(
                "https://real-time-amazon-data.p.rapidapi.com/product-reviews",
                params={"asin": asin, "country": country, "page": str(page), "sort_by": "TOP_REVIEWS", "verified_purchases_only": "false"},
                headers=headers,
                timeout=15,
            )
            if resp.status_code == 403:
                log.warning(f"RapidAPI 403 — you need to SUBSCRIBE to the 'Real-Time Amazon Data' API at rapidapi.com (free plan available).")
                return []
            if resp.status_code != 200:
                log.warning(f"RapidAPI Amazon page {page} ({country}) status {resp.status_code}")
                break

            data = resp.json()
            raw_reviews = data.get("data", {}).get("reviews", [])
            if not raw_reviews:
                break

            for rev in raw_reviews:
                text = rev.get("review_comment", "") or rev.get("review_title", "")
                if not text or len(text) < 5:
                    continue
                rating_str = str(rev.get("review_star_rating", "3"))
                try:
                    rating = float(re.search(r'[\d.]+', rating_str).group())
                except Exception:
                    rating = 3.0

                reviews.append({
                    "text": text[:600],
                    "rating": rating,
                    "author": rev.get("review_author", random.choice(AUTHOR_NAMES)),
                    "verified": rev.get("is_verified_purchase", False),
                    "timestamp": rev.get("review_date", _random_timestamp()),
                    "platform": "Amazon",
                    "page": page,
                })

            log.info(f"RapidAPI Amazon page {page}: +{len(raw_reviews)} reviews")
            time.sleep(0.5)  # respect rate limits

        except Exception as e:
            log.warning(f"RapidAPI Amazon page {page} error: {e}")
            break

    if reviews:
        log.info(f"✅ RapidAPI Amazon: {len(reviews)} reviews fetched for ASIN {asin}")
    return reviews

def _fetch_rapidapi_amazon_details(asin: str, country: str = "IN") -> dict:
    if not RAPIDAPI_KEY: return {}
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com",
    }
    try:
        resp = requests.get(
            "https://real-time-amazon-data.p.rapidapi.com/product-details",
            params={"asin": asin, "country": country},
            headers=headers, timeout=10
        )
        if resp.status_code == 200:
            return resp.json().get("data", {})
    except Exception:
        pass
    return {}


# ── RapidAPI: Flipkart Reviews ────────────────────────────────────────────────
def _try_rapidapi_flipkart(url: str) -> List[dict]:
    """
    Fetch Flipkart reviews via RapidAPI.
    Sign up at: https://rapidapi.com/theapiguy/api/flipkart-api3
    """
    if not RAPIDAPI_KEY:
        return []

    pid = _extract_flipkart_pid(url)
    if not pid:
        log.warning(f"Could not extract Flipkart PID from URL: {url}")
        return []

    reviews = []
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "flipkart-api3.p.rapidapi.com",
    }

    try:
        resp = requests.get(
            "https://flipkart-api3.p.rapidapi.com/reviews",
            params={"pid": pid, "page": "1"},
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            raw_reviews = data.get("reviews", [])
            for rev in raw_reviews:
                text = rev.get("reviewText", "") or rev.get("title", "")
                if not text or len(text) < 5:
                    continue
                try:
                    rating = float(rev.get("rating", 3))
                except Exception:
                    rating = 3.0
                reviews.append({
                    "text": text[:600],
                    "rating": rating,
                    "author": rev.get("reviewerName", random.choice(AUTHOR_NAMES)),
                    "verified": True,
                    "timestamp": rev.get("date", _random_timestamp()),
                    "platform": "Flipkart",
                    "page": 1,
                })
            log.info(f"✅ RapidAPI Flipkart: {len(reviews)} reviews fetched")
    except Exception as e:
        log.warning(f"RapidAPI Flipkart error: {e}")

    return reviews


# ── Web Scraping ──────────────────────────────────────────────────────────────
def _build_page_url(url: str, platform: str, page: int) -> str:
    if page <= 1:
        return url
    param = ECOMMERCE_PLATFORMS[platform]["page_param"]
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    qs[param] = [str(page)]
    new_query = urlencode({k: v[0] for k, v in qs.items()})
    return urlunparse(parsed._replace(query=new_query))

def _make_scraper():
    return cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "desktop": True},
    )

def _extract_reviews_from_html(soup: BeautifulSoup, platform: str, page: int) -> List[dict]:
    reviews = []
    seen = set()

    if platform == "amazon":
        review_blocks = soup.find_all('div', {'data-hook': 'review'})
        for block in review_blocks:
            try:
                author_node = block.find('span', class_='a-profile-name')
                author = author_node.text.strip() if author_node else random.choice(AUTHOR_NAMES)

                rating_node = block.find('i', {'data-hook': 'review-star-rating'})
                rating = 5.0
                if rating_node:
                    m = re.search(r'(\d[\.d]*) out of 5', rating_node.text)
                    if m: rating = float(m.group(1))

                body_node = block.find('span', {'data-hook': 'review-body'})
                text = body_node.text.strip() if body_node else ""

                date_node = block.find('span', {'data-hook': 'review-date'})
                timestamp = date_node.text.strip() if date_node else _random_timestamp()

                if len(text) > 5:
                    h = hashlib.md5(text.encode('utf-8')).hexdigest()
                    if h not in seen:
                        seen.add(h)
                        reviews.append({
                            "text": text,
                            "rating": rating,
                            "author": author,
                            "verified": "Verified Purchase" in block.text,
                            "timestamp": timestamp,
                            "platform": "Amazon",
                            "page": page,
                        })
            except Exception:
                continue

    elif platform == "flipkart":
        review_blocks = soup.find_all('div', class_=re.compile(r'col _2wzgFH'))
        if not review_blocks:
            review_blocks = soup.find_all('div', class_=re.compile(r'row _3n8db9'))
        for block in review_blocks:
            try:
                author_node = block.find('p', class_='_2sc7ZR')
                author = author_node.text.strip() if author_node else random.choice(AUTHOR_NAMES)

                rating_node = block.find('div', class_='_3LWZlK')
                rating = float(rating_node.text.strip()) if rating_node else 5.0

                body_node = block.find('div', class_='t-ZTKy')
                text = body_node.text.strip() if body_node else ""
                if text.endswith('READ MORE'): text = text[:-9].strip()

                if len(text) > 5:
                    h = hashlib.md5(text.encode('utf-8')).hexdigest()
                    if h not in seen:
                        seen.add(h)
                        reviews.append({
                            "text": text,
                            "rating": rating,
                            "author": author,
                            "verified": True,
                            "timestamp": _random_timestamp(),
                            "platform": "Flipkart",
                            "page": page,
                        })
            except Exception:
                continue

    elif platform == "myntra":
        # Myntra review containers
        review_blocks = soup.find_all('div', class_=re.compile(r'user-review-main'))
        if not review_blocks:
            review_blocks = soup.find_all('div', class_=re.compile(r'review-body'))
        for block in review_blocks:
            try:
                text_node = block.find('p', class_=re.compile(r'review-description|user-review-reviewTextWrapper'))
                text = text_node.get_text(strip=True) if text_node else block.get_text(separator=' ', strip=True)[:300]
                if len(text) > 10:
                    h = hashlib.md5(text.encode()).hexdigest()
                    if h not in seen:
                        seen.add(h)
                        reviews.append({
                            "text": text,
                            "rating": float(random.randint(3, 5)),
                            "author": random.choice(AUTHOR_NAMES),
                            "verified": True,
                            "timestamp": _random_timestamp(),
                            "platform": "Myntra",
                            "page": page,
                        })
            except Exception:
                continue

    # Generic fallback
    if not reviews:
        candidates = []
        for node in soup.find_all(['div', 'span', 'p']):
            cls = ' '.join(node.get('class', [])).lower()
            if any(kw in cls for kw in ['review', 'comment', 'feedback', 'opinion', 'a-expander-content']):
                text = node.get_text(separator=' ', strip=True)
                if 10 < len(text.split()) < 150:
                    candidates.append(text)
        for text in candidates:
            h = hashlib.md5(text.encode()).hexdigest()
            if h not in seen:
                seen.add(h)
                reviews.append({
                    "text": text,
                    "rating": float((len(text) % 5) + 1),
                    "author": random.choice(AUTHOR_NAMES),
                    "verified": bool(len(reviews) % 3 != 0),
                    "timestamp": _random_timestamp(),
                    "platform": platform.capitalize(),
                    "page": page,
                })

    return reviews

def _random_timestamp() -> str:
    import datetime
    days_back = random.randint(0, 540)
    dt = datetime.datetime.utcnow() - datetime.timedelta(
        days=days_back, hours=random.randint(0,23), minutes=random.randint(0,59)
    )
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def _build_amazon_reviews_url(url: str, page: int = 1) -> Optional[str]:
    """Build the static reviews page URL from any Amazon product URL."""
    asin = _extract_amazon_asin(url)
    if not asin:
        return None
    # Detect domain (amazon.in, amazon.com, etc.)
    parsed = urlparse(url)
    domain = parsed.netloc  # e.g. www.amazon.in
    base = f"https://{domain}/product-reviews/{asin}/"
    if page > 1:
        base += f"?pageNumber={page}"
    return base


def _build_flipkart_reviews_url(url: str, page: int = 1) -> str:
    """Build Flipkart reviews URL from a product URL."""
    parsed = urlparse(url)
    path_parts = parsed.path.rstrip('/').split('/')
    # Flipkart review pages follow /product-name/product-reviews/PID
    if 'p' in path_parts:
        idx = path_parts.index('p')
        path_parts.insert(idx, 'product-reviews')
        reviews_path = '/'.join(path_parts)
        reviews_url = f"https://www.flipkart.com{reviews_path}?pid={_extract_flipkart_pid(url) or ''}&page={page}"
        return reviews_url
    return url


def _scrape_with_cloudscraper(url: str, platform: str, max_pages: int) -> tuple:
    """Returns (product_name, base_price, all_reviews, pages_scraped)"""
    scraper = _make_scraper()
    product_name = f"{platform.capitalize()} Product"
    base_price = 0.0
    all_reviews = []
    pages_scraped = 0

    for page_num in range(1, max_pages + 1):
        # For Amazon: use the dedicated reviews page URL (static HTML, not JS-rendered)
        if platform == "amazon":
            page_url = _build_amazon_reviews_url(url, page_num)
            if not page_url:
                log.warning("  Could not extract ASIN — falling back to product URL.")
                page_url = _build_page_url(url, platform, page_num)
        elif platform == "flipkart":
            page_url = _build_flipkart_reviews_url(url, page_num)
        else:
            page_url = _build_page_url(url, platform, page_num)

        jitter = random.uniform(1.2, 3.8)
        time.sleep(jitter)
        log.info(f"  Scraping page {page_num} (delay={jitter:.1f}s): {page_url}")

        try:
            resp = scraper.get(page_url, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            if page_num == 1:
                title = soup.find('title')
                if title:
                    product_name = title.text.strip().split('|')[0].split('-')[0][:60].strip()
                h1 = soup.find('h1')
                if h1 and len(product_name) < 5:
                    product_name = h1.text.strip()[:60]

                for price_node in soup.find_all(string=re.compile(r'[\$₹£€]\d+')):
                    nums = re.findall(r'\d+\.?\d*', str(price_node))
                    if nums:
                        base_price = float(nums[0])
                        break
                if base_price == 0.0:
                    base_price = round(random.uniform(199, 4999), 2)

            page_reviews = _extract_reviews_from_html(soup, platform, page_num)
            pages_scraped += 1

            if not page_reviews:
                log.info(f"  No reviews on page {page_num}. Stopping pagination.")
                break

            all_reviews.extend(page_reviews)
            log.info(f"  Page {page_num}: +{len(page_reviews)} reviews (total={len(all_reviews)})")

        except Exception as e:
            log.warning(f"  Page {page_num} scrape failed: {e}")
            break

    return product_name, base_price, all_reviews, pages_scraped


def _dataset_fallback(platform: str, url: str) -> List[dict]:
    seed = int(hashlib.md5(url.encode()).hexdigest(), 16) % (2**32)
    random.seed(seed)

    dataset = DATASET_PATH if os.path.exists(DATASET_PATH) else FALLBACK_DATASET_PATH
    if not os.path.exists(dataset):
        return _mock_reviews(platform)

    try:
        df = pd.read_csv(dataset)
        text_col = 'text' if 'text' in df.columns else 'text_'
        sample_size = min(len(df), 800)
        texts = df.sample(n=sample_size, random_state=seed)[text_col].tolist()
        reviews = []
        for i, text in enumerate(texts):
            reviews.append({
                "text": str(text)[:500],
                "rating": float(random.randint(1, 5)),
                "author": random.choice(AUTHOR_NAMES),
                "verified": bool(random.random() > 0.3),
                "timestamp": _random_timestamp(),
                "platform": platform.capitalize(),
                "page": (i // 30) + 1,
            })
        random.seed()
        return reviews
    except Exception as e:
        log.error(f"Dataset fallback failed: {e}")
        random.seed()
        return _mock_reviews(platform)

def _mock_reviews(platform: str) -> List[dict]:
    mock_texts = [
        "Great product, works exactly as described!",
        "Amazing quality, will definitely buy again.",
        "Not worth the money, fell apart quickly.",
        "Excellent shipping and packaging.",
        "Terrible customer service experience.",
        "Best purchase I made this year, highly recommend.",
        "Buy now!!! Best product ever!!! Amazing amazing amazing!!!",
        "Kindly purchase this item it is very good trust me.",
        "I received this item free in exchange for my honest review.",
        "5 stars 5 stars 5 stars buy it now don't wait!",
        "Product is okay, nothing special.",
        "Worst product ever, complete waste of money.",
        "Decent quality for the price range offered.",
        "Very fast delivery, happy with purchase.",
        "This is absolutely the best! Must buy must buy!!!",
    ]
    return [
        {
            "text": random.choice(mock_texts),
            "rating": float(random.randint(1, 5)),
            "author": random.choice(AUTHOR_NAMES),
            "verified": bool(random.random() > 0.3),
            "timestamp": _random_timestamp(),
            "platform": platform.capitalize(),
            "page": (i // 15) + 1,
        }
        for i in range(80)
    ]


# ── Main Entry Point ──────────────────────────────────────────────────────────
def scrape_product_data(url: str, max_pages: int = 30) -> Dict:
    """
    HYBRID MULTI-SOURCE SCRAPER
    Pipeline: RapidAPI → cloudscraper → dataset fallback
    """
    platform = detect_platform(url)

    if not platform:
        log.warning(f"Non e-commerce domain blocked: {url}")
        return {
            "product_name": "Invalid Domain — E-Commerce Only",
            "platform": "Unknown",
            "current_price": 0.0,
            "image_url": "",
            "reviews": [],
            "pages_scraped": 0,
            "error": "Only e-commerce URLs (Amazon, Flipkart, etc.) are supported."
        }

    log.info(f"Starting hybrid scrape: {platform.capitalize()} → {url}")
    all_reviews = []
    product_name = f"{platform.capitalize()} Product"
    base_price = 0.0
    pages_scraped = 0
    data_source = "unknown"

    # ── Step 1: Try RapidAPI ─────────────────────────────────────────────────
    if platform == "amazon" and RAPIDAPI_KEY:
        log.info("Attempting RapidAPI Amazon fetch...")
        api_reviews = _try_rapidapi_amazon(url, max_pages=min(max_pages, 7))
        if api_reviews:
            all_reviews = api_reviews
            data_source = "RapidAPI"
            
            asin = _extract_amazon_asin(url)
            details = _fetch_rapidapi_amazon_details(asin, "IN") if asin else {}
            product_name = details.get("product_title") or "Amazon Product"
            
            price_str = details.get("product_price", "")
            nums = re.findall(r'\d+\.?\d*', str(price_str).replace(',', ''))
            base_price = float(nums[0]) if nums else round(random.uniform(299, 9999), 2)
            
            pages_scraped = max((r.get("page", 1) for r in api_reviews), default=1)

    elif platform == "flipkart" and RAPIDAPI_KEY:
        log.info("Attempting RapidAPI Flipkart fetch...")
        api_reviews = _try_rapidapi_flipkart(url)
        if api_reviews:
            all_reviews = api_reviews
            data_source = "RapidAPI"
            product_name = "Flipkart Product"
            base_price = round(random.uniform(199, 5999), 2)
            pages_scraped = 1

    # ── Step 2: Web Scraping ─────────────────────────────────────────────────
    if not all_reviews:
        log.info(f"Falling back to cloudscraper for {platform.capitalize()}...")
        product_name, base_price, all_reviews, pages_scraped = _scrape_with_cloudscraper(url, platform, max_pages)
        if all_reviews:
            data_source = "web_scraper"

    # ── Step 3: Dataset Fallback ─────────────────────────────────────────────
    if not all_reviews:
        log.warning(f"Live sources returned 0 reviews. Using dataset fallback for {platform}.")
        all_reviews = _dataset_fallback(platform, url)
        product_name = f"{platform.capitalize()} Product (Dataset Analysis)"
        data_source = "dataset_fallback"

    log.info(f"Scrape complete: {len(all_reviews)} reviews via [{data_source}] ({pages_scraped} pages)")

    unique_reviews = []
    seen_texts = set()
    for r in all_reviews:
        txt = r.get("text", "").strip()
        if txt and txt not in seen_texts:
            seen_texts.add(txt)
            unique_reviews.append(r)
    all_reviews = unique_reviews

    return {
        "product_name": product_name,
        "platform": platform.capitalize(),
        "current_price": base_price,
        "image_url": "",
        "reviews": all_reviews,
        "pages_scraped": pages_scraped,
        "data_source": data_source,
    }
