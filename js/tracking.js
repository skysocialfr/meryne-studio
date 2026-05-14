/* ═══════════════════════════════════════════════
   VEYRA STUDIO — GA4 tracking + RGPD cookie banner
   Lazy-loads Google Analytics only after explicit consent.
   ═══════════════════════════════════════════════ */

// Google Analytics 4 measurement ID — Veyra Studio property.
var VEYRA_GA_ID = 'G-PGWDPGRBF0';

var CONSENT_KEY = 'veyra_cookie_consent'; // 'granted' | 'denied'

// ─── Public API ──────────────────────────────────
// Call this from anywhere in the app to track an event.
// Safe to call even before consent: it simply no-ops.
function track(eventName, params) {
  if (typeof window.gtag === 'function') {
    try { window.gtag('event', eventName, params || {}); } catch (e) {}
  }
}

// ─── Consent flow ────────────────────────────────
function _veyraGetConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
}

function _veyraSetConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
}

function _veyraLoadGA() {
  if (window._veyraGaLoaded) return;
  if (!VEYRA_GA_ID || VEYRA_GA_ID === 'G-PLACEHOLDER') return;
  window._veyraGaLoaded = true;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + VEYRA_GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', VEYRA_GA_ID, { anonymize_ip: true });
}

function veyraAcceptCookies() {
  _veyraSetConsent('granted');
  _veyraLoadGA();
  _veyraHideBanner();
  track('consent_granted');
}

function veyraDeclineCookies() {
  _veyraSetConsent('denied');
  _veyraHideBanner();
}

function _veyraHideBanner() {
  var b = document.getElementById('cookie-banner');
  if (b) {
    b.classList.remove('show');
    setTimeout(function () { b.style.display = 'none'; }, 250);
  }
}

function _veyraShowBanner() {
  var b = document.getElementById('cookie-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'cookie-banner';
    b.innerHTML =
        '<div class="cb-text">'
      +   '<strong>Cookies &amp; vie priv&eacute;e</strong>'
      +   ' Veyra utilise Google Analytics 4 (anonymis&eacute;) pour comprendre comment am&eacute;liorer le service. '
      +   '<a href="/confidentialite.html">En savoir plus</a>'
      + '</div>'
      + '<div class="cb-actions">'
      +   '<button class="cb-btn cb-btn-decline" onclick="veyraDeclineCookies()">Refuser</button>'
      +   '<button class="cb-btn cb-btn-accept"  onclick="veyraAcceptCookies()">Accepter</button>'
      + '</div>';
    document.body.appendChild(b);
  }
  b.style.display = 'flex';
  requestAnimationFrame(function () { b.classList.add('show'); });
}

// ─── Boot ────────────────────────────────────────
function _veyraTrackingInit() {
  var consent = _veyraGetConsent();
  if (consent === 'granted') {
    _veyraLoadGA();
  } else if (consent === null) {
    _veyraShowBanner();
  }
  // consent === 'denied' → load nothing
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _veyraTrackingInit);
} else {
  setTimeout(_veyraTrackingInit, 0);
}
