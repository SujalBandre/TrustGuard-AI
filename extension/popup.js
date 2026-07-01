document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scanBtn');
  const retryBtn = document.getElementById('retryBtn');
  const resetBtn = document.getElementById('resetBtn');
  const viewReportBtn = document.getElementById('viewReportBtn');
  
  const loadingState = document.getElementById('loadingState');
  const resultState = document.getElementById('resultState');
  const errorState = document.getElementById('errorState');
  const pulseIndicator = document.getElementById('pulseIndicator');

  const statusText = document.getElementById('statusText');
  const errorMsg = document.getElementById('errorMsg');

  // Result Elements
  const trustScoreEl = document.getElementById('trustScore');
  const scoreRing = document.querySelector('.score-ring');
  const riskBadge = document.getElementById('riskBadge');
  const recommendationEl = document.getElementById('recommendation');
  const productNameEl = document.getElementById('productName');
  const fakeCountEl = document.getElementById('fakeCount');
  const botProbEl = document.getElementById('botProb');
  const pagesScannedEl = document.getElementById('pagesScanned');

  const triggerScan = async () => {
    loadingState.classList.remove('hidden');
    resultState.classList.add('hidden');
    errorState.classList.add('hidden');
    pulseIndicator.classList.remove('hidden');
    
    statusText.innerText = "Extracting Reviews...";
    scanBtn.disabled = true;

    try {
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url.includes('http')) {
        throw new Error("Cannot scan this page. Please open an e-commerce product page.");
      }

      statusText.innerText = "Extracting local DOM...";

      // Inject script to extract reviews locally
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractReviewsFromDOM
      });

      const dom_reviews = results[0].result || [];
      
      if (dom_reviews.length === 0) {
        statusText.innerText = `No reviews visible in DOM. Engaging ML Dataset Fallback...`;
      } else {
        statusText.innerText = `Analyzing ${dom_reviews.length} reviews...`;
      }

      // Call local TrustGuard Backend
      // If dom_reviews is empty, the backend will trigger the dataset fallback
      const response = await fetch('http://localhost:8001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: tab.url,
          dom_reviews: dom_reviews,
          platform: tab.url.includes('amazon') ? 'Amazon' : (tab.url.includes('flipkart') ? 'Flipkart' : 'Web Page'),
          product_name: tab.title.substring(0, 100)
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      renderResults(data);

    } catch (err) {
      console.error(err);
      errorMsg.innerText = err.message === "Failed to fetch" 
        ? "Cannot reach TrustGuard server. Ensure backend is running." 
        : err.message;
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
    } finally {
      pulseIndicator.classList.add('hidden');
      scanBtn.disabled = false;
    }
  };

  const renderResults = (data) => {
    loadingState.classList.add('hidden');
    resultState.classList.remove('hidden');

    const score = Math.round(data.trust_score);
    trustScoreEl.innerText = score;

    let color = 'var(--green)';
    let badgeTxt = 'LOW RISK';
    if (score < 40) { color = 'var(--red)'; badgeTxt = 'HIGH RISK'; }
    else if (score < 70) { color = 'var(--amber)'; badgeTxt = 'MEDIUM RISK'; }

    // Update Ring Gradient
    scoreRing.style.background = `conic-gradient(${color} ${score}%, rgba(255,255,255,0.1) ${score}%)`;
    trustScoreEl.style.color = color;
    
    // Update Badge
    riskBadge.innerText = badgeTxt;
    riskBadge.style.color = color;
    riskBadge.style.background = color.replace('var(--', 'rgba(').replace(')', ', 0.2)'); // fake rgba hack works if native color variables were rgb, but we just use CSS trick
    
    if (score < 40) {
      riskBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      riskBadge.style.border = '1px solid rgba(239, 68, 68, 0.4)';
    } else if (score < 70) {
      riskBadge.style.background = 'rgba(245, 158, 11, 0.2)';
      riskBadge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
    } else {
      riskBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      riskBadge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    }

    recommendationEl.innerText = data.recommendation;
    recommendationEl.style.color = color;
    productNameEl.innerText = data.product_name || "Unknown Product";

    fakeCountEl.innerText = data.reputation?.fake_ratio?.fake || 0;
    botProbEl.innerText = `${Math.round(data.nlp_score * 100)}%`;
    pagesScannedEl.innerText = data.pages_scraped || 0;
  };

  scanBtn.addEventListener('click', triggerScan);
  retryBtn.addEventListener('click', triggerScan);
  resetBtn.addEventListener('click', () => {
    resultState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    statusText.innerText = "Ready to Scan";
  });
  viewReportBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/trustbuy' });
  });
});

// Executed inside the target webpage context
function extractReviewsFromDOM() {
  const reviews = [];
  
  // Scraper Logic: Amazon
  if (window.location.href.includes('amazon')) {
    const blocks = document.querySelectorAll('div[data-hook="review"], div[id^="customer_review-"], div.review, div.a-section.review');
    blocks.forEach(block => {
      const author = block.querySelector('.a-profile-name')?.innerText?.trim() || "Anonymous";
      
      const rateNode = block.querySelector('i[data-hook="review-star-rating"], i.review-rating, span.a-icon-alt');
      let rating = 5.0;
      if (rateNode) {
        const m = rateNode.innerText.match(/(\d[\.\d]*)\s*out of/);
        if (m) rating = parseFloat(m[1]);
        else rating = parseFloat(rateNode.innerText) || 5.0;
      }
      
      const textNode = block.querySelector('span[data-hook="review-body"], span.review-text, span.review-text-content, div.reviewText');
      const text = textNode?.innerText?.trim() || "";
      const dateNode = block.querySelector('span[data-hook="review-date"], span.review-date');
      const timestamp = dateNode?.innerText?.trim() || new Date().toISOString();
      const verified = !!block.querySelector('span[data-hook="avp-badge"], span.a-declarative[data-action="reviews:filter-action:push-state"]');
      
      if (text.length > 5) {
        reviews.push({ text, author, rating, timestamp, verified, platform: 'Amazon', page: 1 });
      }
    });
  } 
  // Scraper Logic: Flipkart
  else if (window.location.href.includes('flipkart')) {
    const blocks = document.querySelectorAll('div._2wzgFH, div._3n8db9');
    blocks.forEach(block => {
      const author = block.querySelector('p._2sc7ZR')?.innerText?.trim() || "Anonymous";
      const rateNode = block.querySelector('div._3LWZlK');
      let rating = rateNode ? parseFloat(rateNode.innerText) : 5.0;
      let text = block.querySelector('div.t-ZTKy')?.innerText?.trim() || "";
      if (text.endsWith('READ MORE')) text = text.slice(0, -9).trim();
      
      if (text.length > 5) {
        reviews.push({ text, author, rating, timestamp: new Date().toISOString(), verified: true, platform: 'Flipkart', page: 1 });
      }
    });
  }
  // Generic Fallback
  else {
    const blocks = document.querySelectorAll('p, span, div');
    const seen = new Set();
    blocks.forEach(block => {
      const cls = (block.className || '').toString().toLowerCase();
      if (cls.includes('review') || cls.includes('comment')) {
        const text = block.innerText?.trim() || "";
        if (text.split(' ').length > 10 && !seen.has(text)) {
          seen.add(text);
          reviews.push({ text, author: "Generic_User", rating: 4.0, timestamp: new Date().toISOString(), verified: false, platform: 'Unknown', page: 1 });
        }
      }
    });
  }
  
  return reviews;
}
