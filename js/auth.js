/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Authentication (Supabase Auth)
   ═══════════════════════════════════════════════

   SECURITY: No hardcoded passwords. Uses Supabase Auth
   with email/password. Users are created via Supabase
   dashboard (Authentication > Users > Add user).

   To create users:
   1. Go to https://supabase.com/dashboard
   2. Select your project
   3. Go to Authentication > Users
   4. Click "Add user" > "Create new user"
   5. Enter email + password
   ═══════════════════════════════════════════════ */

// Cache the current session
window._currentSession = null;

// ─── TEMPORARY DEV MODE — remove before production deploy ───
var DEV_MODE = true;

function devBypass() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  var badge = document.getElementById('user-badge');
  if (badge) {
    badge.innerHTML = '<span class="user-dot"></span>DEV MODE';
    badge.style.display = 'flex';
  }
  initApp();
}

// ─── Login with Supabase Auth ───
async function doLogin() {
  // DEV MODE: skip auth
  if (DEV_MODE) { devBypass(); return; }

  var emailEl = document.getElementById('lu');
  var passEl = document.getElementById('lp');
  var btn = document.querySelector('.lbtn');

  var email = (emailEl.value || '').trim();
  var pass = passEl.value || '';

  if (!email || !pass) {
    showLoginError('Remplis tous les champs');
    return;
  }

  // Disable button during login
  if (btn) { btn.disabled = true; btn.textContent = 'Connexion...'; }

  try {
    if (!sb) {
      initSupabase();
    }

    if (!sb) {
      showLoginError('Service indisponible');
      return;
    }

    var result = await sb.auth.signInWithPassword({
      email: email,
      password: pass
    });

    if (result.error) {
      showLoginError('Email ou mot de passe incorrect');
      return;
    }

    // Store session
    window._currentSession = result.data.session;

    // Show app
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Update user display in header
    updateUserDisplay(result.data.session.user);

    // Initialize app
    initApp();

  } catch(e) {
    showLoginError('Erreur de connexion');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Accéder au studio \u2192'; }
  }
}

// ─── Logout ───
async function doLogout() {
  if (sb) {
    try { await sb.auth.signOut(); } catch(e) {}
  }
  window._currentSession = null;
  location.reload();
}

// ─── Check existing session on page load ───
async function checkSession() {
  if (!sb) {
    initSupabase();
  }
  if (!sb) return false;

  try {
    var result = await sb.auth.getSession();
    if (result.data && result.data.session) {
      window._currentSession = result.data.session;
      return true;
    }
  } catch(e) {}
  return false;
}

// ─── Show login error ───
function showLoginError(msg) {
  var el = document.getElementById('lerr');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}

// ─── Update header with user info ───
function updateUserDisplay(user) {
  var badge = document.getElementById('user-badge');
  if (badge && user) {
    var name = user.user_metadata && user.user_metadata.name
      ? user.user_metadata.name
      : user.email.split('@')[0];
    badge.innerHTML = '<span class="user-dot"></span>' + escapeHtml(name);
    badge.style.display = 'flex';
  }
}

// ─── Auto-check session on load ───
async function autoLogin() {
  // DEV MODE: auto-enter
  if (DEV_MODE) { devBypass(); return; }

  var hasSession = await checkSession();
  if (hasSession) {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    updateUserDisplay(window._currentSession.user);
    initApp();
  }
}

// ─── Enter key on login form ───
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') {
    doLogin();
  }
});
