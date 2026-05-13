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
