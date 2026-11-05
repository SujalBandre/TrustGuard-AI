/**
 * TrustGuard AI — Content Script v2.1
 * Auto-runs on supported e-commerce pages.
 * Listens for badge injection messages from the popup and
 * shows a subtle indicator that TrustGuard is available.
 */

(() => {
  // Show a small "TrustGuard Ready" indicator on page load
  const indicator = document.createElement('div');
  indicator.id = 'trustguard-ready-indicator';
  indicator.innerHTML = `
    <div class="trustguard-ready-dot"></div>
    <span>TrustGuard AI Ready</span>
  `;
  document.body.appendChild(indicator);

  // Auto-hide the indicator after 4 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 500);
  }, 4000);
})();
