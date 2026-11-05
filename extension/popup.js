/**
 * TrustGuard AI — Chrome Extension Popup Script v2.1
 * Aligned with backend /api/analyze endpoint (AnalyzeInput / AnalyzeOutput schemas)
 */

const BACKEND_URL = 'http://localhost:8001';

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM References ──────────────────────────────────────────────
  const scanBtn        = document.getElementById('scanBtn');
  const retryBtn       = document.getElementById('retryBtn');
  const resetBtn       = document.getElementById('resetBtn');
  const viewReportBtn  = document.getElementById('viewReportBtn');

  const loadingState   = document.getElementById('loadingState');
  const resultState    = document.getElementById('resultState');
  const errorState     = document.getElementById('errorState');
  const pulseIndicator = document.getElementById('pulseIndicator');
  const botIcon        = document.getElementById('botIcon');

  const statusText     = document.getElementById('statusText');
  const subText        = document.getElementById('subText');
  const errorMsg       = document.getElementById('errorMsg');

  // Result elements
  const trustScoreEl   = document.getElementById('trustScore');
  const scoreRing      = document.getElementById('scoreRing');
  const riskBadge      = document.getElementById('riskBadge');
  const recommendationEl = document.getElementById('recommendation');
  const productNameEl  = document.getElementById('productName');
  const fakeCountEl    = document.getElementById('fakeCount');
  const genuineCountEl = document.getElementById('genuineCount');
  const botProbEl      = document.getElementById('botProb');
  const pagesScannedEl = document.getElementById('pagesScanned');
  const tagsRow        = document.getElementById('tagsRow');
  const urlStatus      = document.getElementById('urlStatus');
  const urlStatusIcon  = document.getElementById('urlStatusIcon');
  const urlStatusText  = document.getElementById('urlStatusText');

  // ── Scan Trigger ────────────────────────────────────────────────
  const triggerScan = async () => {
    // Show loading state
    loadingState.classList.remove('hidden');
    resultState.classList.add('hidden');
    errorState.classList.add('hidden');
    pulseIndicator.classList.remove('hidden');
    scanBtn.disabled = true;

    botIcon.innerText = '⏳';
    statusText.innerText = 'Extracting Reviews...';
    subText.innerText = 'Connecting to the active tab and scanning for review content.';

    try {
      // 1. Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.startsWith('http')) {
        throw new Error('Cannot scan this page. Please open an e-commerce product page (Amazon, Flipkart, etc.).');
      }

      // 2. Detect platform
      const url = tab.url;
      let platform = 'Unknown';
      if (url.includes('amazon'))   platform = 'Amazon';
      else if (url.includes('flipkart')) platform = 'Flipkart';
      else if (url.includes('myntra'))   platform = 'Myntra';
      else if (url.includes('meesho'))   platform = 'Meesho';
      else if (url.includes('snapdeal')) platform = 'Snapdeal';
      else if (url.includes('ajio'))     platform = 'Ajio';
      else if (url.includes('ebay'))     platform = 'eBay';
      else if (url.includes('walmart'))  platform = 'Walmart';

      statusText.innerText = `Detected: ${platform} · Extracting DOM reviews...`;

      // 3. Inject DOM scraper into the active tab
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractReviewsFromDOM
      });

      const dom_reviews = results[0]?.result || [];

      if (dom_reviews.length === 0) {
        statusText.innerText = 'No reviews found in DOM. Backend will use ML dataset fallback...';
      } else {
        statusText.innerText = `Found ${dom_reviews.length} reviews · Running NLP analysis...`;
      }

      // 4. Call TrustGuard backend /api/analyze
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          dom_reviews: dom_reviews.length > 0 ? dom_reviews : undefined,
          platform: platform,
          product_name: tab.title.substring(0, 120)
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Server error ${response.status}: ${errBody.substring(0, 200)}`);
      }

      const data = await response.json();

      // 5. Store result for content script badge injection
      chrome.storage.local.set({
        lastScanResult: {
          tabId: tab.id,
          url: url,
          trust_score: data.trust_score,
          risk_level: data.risk_level,
          recommendation: data.recommendation
        }
      });

      // 6. Inject badge into the page
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectTrustBadge,
          args: [data.trust_score, data.risk_level, data.recommendation || '']
        });
      } catch (badgeErr) {
        console.warn('Badge injection failed (non-fatal):', badgeErr);
      }

      // 7. Render results in popup
      renderResults(data, platform);

    } catch (err) {
      console.error('TrustGuard scan error:', err);
      errorMsg.innerText = err.message === 'Failed to fetch'
        ? 'Cannot reach TrustGuard server. Make sure the backend is running on localhost:8001.'
        : err.message;
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
    } finally {
      pulseIndicator.classList.add('hidden');
      scanBtn.disabled = false;
    }
  };

  // ── Render Results ──────────────────────────────────────────────
  const renderResults = (data, platform) => {
    loadingState.classList.add('hidden');
    resultState.classList.remove('hidden');

    const score = Math.round(data.trust_score ?? 0);
    trustScoreEl.innerText = score;

    // Determine color scheme based on score
    let scoreColor, badgeText, badgeBg, badgeBorder, verdictColor;
    if (score < 40) {
      scoreColor  = '#EF4444';
      badgeText   = 'HIGH RISK';
      badgeBg     = 'rgba(239, 68, 68, 0.2)';
      badgeBorder = '1px solid rgba(239, 68, 68, 0.4)';
      verdictColor = '#EF4444';
    } else if (score < 70) {
      scoreColor  = '#F59E0B';
      badgeText   = 'MEDIUM RISK';
      badgeBg     = 'rgba(245, 158, 11, 0.2)';
      badgeBorder = '1px solid rgba(245, 158, 11, 0.4)';
      verdictColor = '#F59E0B';
    } else {
      scoreColor  = '#10B981';
      badgeText   = 'LOW RISK';
      badgeBg     = 'rgba(16, 185, 129, 0.2)';
      badgeBorder = '1px solid rgba(16, 185, 129, 0.4)';
      verdictColor = '#10B981';
    }

    // Score ring gradient
    scoreRing.style.background = `conic-gradient(${scoreColor} ${score}%, rgba(255,255,255,0.08) ${score}%)`;
    trustScoreEl.style.color = scoreColor;

    // Risk badge
    riskBadge.innerText = badgeText;
    riskBadge.style.color = scoreColor;
    riskBadge.style.background = badgeBg;
    riskBadge.style.border = badgeBorder;

    // Recommendation / verdict
    const rec = data.recommendation
      || (score >= 70 ? 'TRUSTWORTHY — Reviews appear genuine.'
        : score >= 40 ? 'PROCEED WITH CAUTION — Some suspicious signals.'
        : 'DO NOT TRUST — High manipulation probability detected.');
    recommendationEl.innerText = rec;
    recommendationEl.style.color = verdictColor;

    // Product name
    productNameEl.innerText = data.product_name || platform || 'Unknown Product';

    // Stats
    const fakeCount = data.reputation?.fake_ratio?.fake ?? data.flagged_reviews?.length ?? 0;
    const genuineCount = data.reputation?.fake_ratio?.genuine ?? 0;
    const totalReviews = data.reputation?.fake_ratio?.total_reviews ?? (fakeCount + genuineCount);
    fakeCountEl.innerText = fakeCount;
    genuineCountEl.innerText = genuineCount;
    botProbEl.innerText = `${Math.round((data.nlp_score ?? 0) * 100)}%`;
    pagesScannedEl.innerText = data.pages_scraped ?? 0;

    // URL Security status
    const urlSt = (data.url_status || 'SECURE').toUpperCase();
    urlStatus.className = 'url-status';
    if (urlSt === 'MALICIOUS') {
      urlStatus.classList.add('malicious');
      urlStatusIcon.innerText = '🚨';
      urlStatusText.innerText = 'MALICIOUS URL DETECTED';
    } else if (urlSt === 'SUSPICIOUS') {
      urlStatus.classList.add('suspicious');
      urlStatusIcon.innerText = '⚠️';
      urlStatusText.innerText = 'Suspicious URL — Proceed with caution';
    } else {
      urlStatus.classList.add('secure');
      urlStatusIcon.innerText = '🔒';
      urlStatusText.innerText = 'URL Verified Secure';
    }

    // Tags
    tagsRow.innerHTML = '';
    const tags = data.tags || [];
    tags.slice(0, 6).forEach(tag => {
      const el = document.createElement('span');
      el.className = 'tag';
      el.innerText = tag.replace(/_/g, ' ');
      tagsRow.appendChild(el);
    });
  };

  // ── Event Listeners ─────────────────────────────────────────────
  scanBtn.addEventListener('click', triggerScan);
  retryBtn.addEventListener('click', triggerScan);

  resetBtn.addEventListener('click', () => {
    resultState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    botIcon.innerText = '🛡️';
    statusText.innerText = 'Ready to Scan';
    subText.innerText = 'Click below to analyze this product\'s reviews for manipulation, fake reviews, and bot activity.';
  });

  viewReportBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/trustbuy' });
  });
});


// ═══════════════════════════════════════════════════════════════════
//  DOM Review Extractor — Injected into the active e-commerce page
// ═══════════════════════════════════════════════════════════════════
function extractReviewsFromDOM() {
  const reviews = [];
  const url = window.location.href;

  // ── Amazon ──────────────────────────────────────────────────────
  if (url.includes('amazon')) {
    const blocks = document.querySelectorAll(
      'div[data-hook="review"], div[id^="customer_review-"], div.review, div.a-section.review'
    );
    blocks.forEach(block => {
      const author = block.querySelector('.a-profile-name')?.innerText?.trim() || 'Anonymous';

      let rating = 5.0;
      const rateNode = block.querySelector(
        'i[data-hook="review-star-rating"], i.review-rating, span.a-icon-alt'
      );
      if (rateNode) {
        const m = rateNode.innerText.match(/(\d[\.\d]*)\s*out of/);
        if (m) rating = parseFloat(m[1]);
        else rating = parseFloat(rateNode.innerText) || 5.0;
      }

      const textNode = block.querySelector(
        'span[data-hook="review-body"], span.review-text, span.review-text-content, div.reviewText'
      );
      const text = textNode?.innerText?.trim() || '';

      const dateNode = block.querySelector('span[data-hook="review-date"], span.review-date');
      const timestamp = dateNode?.innerText?.trim() || new Date().toISOString();

      const verified = !!block.querySelector(
        'span[data-hook="avp-badge"], span.a-declarative[data-action="reviews:filter-action:push-state"]'
      );

      if (text.length > 5) {
        reviews.push({ text, author, rating, timestamp, verified, platform: 'Amazon', page: 1 });
      }
    });
  }

  // ── Flipkart ────────────────────────────────────────────────────
  else if (url.includes('flipkart')) {
    // Flipkart's class names change frequently; try multiple selectors
    const blocks = document.querySelectorAll(
      'div._2wzgFH, div._3n8db9, div.col._2wzgFH, div[class*="review"]'
    );
    blocks.forEach(block => {
      const author = (
        block.querySelector('p._2sc7ZR, p[class*="user"]')?.innerText?.trim() || 'Anonymous'
      );
      const rateNode = block.querySelector('div._3LWZlK, div[class*="rating"]');
      let rating = rateNode ? parseFloat(rateNode.innerText) : 5.0;

      let text = (
        block.querySelector('div.t-ZTKy, div[class*="review-text"], div[class*="content"]')?.innerText?.trim() || ''
      );
      if (text.endsWith('READ MORE')) text = text.slice(0, -9).trim();

      if (text.length > 5) {
        reviews.push({
          text, author, rating,
          timestamp: new Date().toISOString(),
          verified: true, platform: 'Flipkart', page: 1
        });
      }
    });
  }

  // ── Generic fallback ────────────────────────────────────────────
  else {
    const blocks = document.querySelectorAll('p, span, div');
    const seen = new Set();
    blocks.forEach(block => {
      const cls = (block.className || '').toString().toLowerCase();
      if (cls.includes('review') || cls.includes('comment') || cls.includes('feedback')) {
        const text = block.innerText?.trim() || '';
        if (text.split(' ').length > 10 && !seen.has(text)) {
          seen.add(text);
          reviews.push({
            text, author: 'User', rating: 4.0,
            timestamp: new Date().toISOString(),
            verified: false, platform: 'Unknown', page: 1
          });
        }
      }
    });
  }

  return reviews;
}


// ═══════════════════════════════════════════════════════════════════
//  In-Page Badge Injection — Shows a floating trust badge on the page
// ═══════════════════════════════════════════════════════════════════
function injectTrustBadge(trustScore, riskLevel, recommendation) {
  // Remove any previously injected badge
  const existing = document.getElementById('trustguard-ai-badge');
  if (existing) existing.remove();

  const score = Math.round(trustScore);
  let bgColor, textColor, emoji;
  if (score < 40) {
    bgColor = 'linear-gradient(135deg, #991b1b, #dc2626)';
    textColor = '#fecaca';
    emoji = '🚨';
  } else if (score < 70) {
    bgColor = 'linear-gradient(135deg, #92400e, #d97706)';
    textColor = '#fef3c7';
    emoji = '⚠️';
  } else {
    bgColor = 'linear-gradient(135deg, #065f46, #059669)';
    textColor = '#d1fae5';
    emoji = '✅';
  }

  const badge = document.createElement('div');
  badge.id = 'trustguard-ai-badge';
  badge.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: ${bgColor};
      color: ${textColor};
      padding: 14px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      cursor: pointer;
      max-width: 280px;
      line-height: 1.4;
      transition: all 0.3s ease;
      border: 1px solid rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">
        ${emoji} TrustGuard AI · ${riskLevel} RISK
      </div>
      <div style="font-size: 22px; font-weight: 900; margin-bottom: 4px;">
        Trust Score: ${score}%
      </div>
      <div style="font-size: 11px; opacity: 0.85;">
        ${recommendation || 'Click for details'}
      </div>
      <div style="font-size: 9px; opacity: 0.5; margin-top: 6px; text-align: right;">
        Click to dismiss
      </div>
    </div>
  `;

  badge.querySelector('div').addEventListener('click', () => badge.remove());
  document.body.appendChild(badge);
}
