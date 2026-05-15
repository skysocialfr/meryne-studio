/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Landing
   Public marketing page shown before auth.
   ═══════════════════════════════════════════════ */

function showLandingPage() {
  var land = document.getElementById('landing-page');
  var login = document.getElementById('login-page');
  if (land)  land.style.display  = 'block';
  if (login) login.style.display = 'none';
  document.body.classList.add('on-landing');
}

function hideLandingPage() {
  var land = document.getElementById('landing-page');
  if (land) land.style.display = 'none';
  document.body.classList.remove('on-landing');
}

// Open the auth form (signup or login) from a landing CTA
function goToAuth(mode) {
  if (typeof track === 'function') {
    track(mode === 'signup' ? 'landing_signup_clicked' : 'landing_login_clicked');
  }
  hideLandingPage();
  if (typeof showLoginUI === 'function') {
    showLoginUI(mode === 'signup' ? 'signup' : 'login');
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// "← Retour" link from inside the login form
function backToLanding() {
  var lp = document.getElementById('login-page');
  if (lp) lp.style.display = 'none';
  showLandingPage();
}

// ─── Demo video player ───
// When DEMO_VIDEO_URL is set to a YouTube/Vimeo embed URL, clicking the
// frame swaps the placeholder for the embedded player. While empty, the
// frame falls back to "scroll to signup" so the CTA still works.
var DEMO_VIDEO_URL = ''; // ex: 'https://www.youtube.com/embed/XXXXXXXXXXX?autoplay=1&rel=0'
function playDemo() {
  if (typeof track === 'function') track('landing_demo_clicked');
  var frame = document.getElementById('demo-frame');
  if (!frame) return;
  if (DEMO_VIDEO_URL) {
    frame.classList.add('demo-playing');
    frame.innerHTML = '<iframe src="' + DEMO_VIDEO_URL
      + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    return;
  }
  goToAuth('signup');
}
