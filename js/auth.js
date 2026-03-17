/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Authentification locale
   (pas de dépendance Supabase pour le login)

   Pour changer le mot de passe :
   1. Ouvre ce fichier
   2. Modifie la valeur de APP_PASS ci-dessous
   ═══════════════════════════════════════════════ */

// ─── Identifiants ───
var APP_USER = 'meryne';
var APP_PASS = 'Studio2024!';

// ─── Login ───
function doLogin() {
  var loginEl = document.getElementById('lu');
  var passEl  = document.getElementById('lp');
  var btn     = document.querySelector('.lbtn');

  var login = (loginEl ? loginEl.value : '').trim().toLowerCase();
  var pass  = passEl  ? passEl.value  : '';

  if (!login || !pass) {
    showLoginError('Remplis tous les champs');
    return;
  }

  if (login !== APP_USER || pass !== APP_PASS) {
    showLoginError('Identifiant ou mot de passe incorrect');
    if (btn) { btn.disabled = false; btn.textContent = 'Accéder au studio →'; }
    return;
  }

  // Session valide — on mémorise dans localStorage (30 jours)
  var expire = Date.now() + 30 * 24 * 60 * 60 * 1000;
  localStorage.setItem('ms_session', JSON.stringify({ user: login, exp: expire }));

  _enterApp();
}

// ─── Auto-check session au chargement ───
function autoLogin() {
  try {
    var raw = localStorage.getItem('ms_session');
    if (raw) {
      var sess = JSON.parse(raw);
      if (sess && sess.exp > Date.now()) {
        _enterApp();
        return;
      }
    }
  } catch(e) {}
  // Pas de session — affiche login
  var lp = document.getElementById('login-page');
  if (lp) lp.style.display = 'flex';
}

// ─── Entrer dans l'app ───
function _enterApp() {
  var lp  = document.getElementById('login-page');
  var app = document.getElementById('app');
  if (lp)  lp.style.display  = 'none';
  if (app) app.style.display = 'block';
  var badge = document.getElementById('user-badge');
  if (badge) {
    badge.innerHTML = '<span class="user-dot"></span>Meryne';
    badge.style.display = 'flex';
  }
  initApp();
}

// ─── Logout ───
function doLogout() {
  localStorage.removeItem('ms_session');
  location.reload();
}

// ─── Afficher erreur ───
function showLoginError(msg) {
  var el = document.getElementById('lerr');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}

// ─── Touche Entrée sur le formulaire ───
document.addEventListener('keydown', function(e) {
  var lp = document.getElementById('login-page');
  if (e.key === 'Enter' && lp && lp.style.display !== 'none') {
    doLogin();
  }
});
