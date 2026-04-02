/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Auth v6
   Authentification via Supabase Auth (email + mdp)
   ═══════════════════════════════════════════════ */

// ─── Login ───
async function doLogin() {
  var emailEl = document.getElementById('lu');
  var passEl  = document.getElementById('lp');
  var btn     = document.querySelector('.lbtn');

  var email = emailEl ? emailEl.value.trim() : '';
  var pass  = passEl  ? passEl.value : '';

  if (!email || !pass) { showLoginError('Remplis tous les champs'); return; }
  if (!sb) { showLoginError('Erreur serveur — réessaie'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Connexion…'; }

  var result = await sb.auth.signInWithPassword({ email: email, password: pass });

  if (result.error) {
    showLoginError('Email ou mot de passe incorrect');
    if (btn) { btn.disabled = false; btn.textContent = 'Accéder au studio →'; }
    return;
  }

  await _enterApp(result.data.user);
}

// ─── Auto-check session au chargement ───
async function autoLogin() {
  if (!sb) { _showLoginPage(); return; }

  try {
    var result = await sb.auth.getSession();
    var session = result.data && result.data.session;
    if (session && session.user) {
      await _enterApp(session.user);
      return;
    }
  } catch (e) {}

  _showLoginPage();
}

function _showLoginPage() {
  var lp = document.getElementById('login-page');
  if (lp) lp.style.display = 'flex';
}

// ─── Entrer dans l'app ───
async function _enterApp(user) {
  var lp  = document.getElementById('login-page');
  var app = document.getElementById('app');
  if (lp)  lp.style.display  = 'none';
  if (app) app.style.display = 'block';

  window._MERYNE_UID   = user.id;
  window._USER_EMAIL   = user.email;
  window._IS_ADMIN     = false;

  // Charger le profil depuis Supabase (role admin ?)
  if (sb) {
    try {
      var { data: profile } = await sb.from('profiles')
        .select('id, role, display_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.role === 'admin') window._IS_ADMIN = true;
      } else {
        // Créer le profil si absent
        await sb.from('profiles').insert({
          id:           user.id,
          email:        user.email,
          display_name: (user.user_metadata && user.user_metadata.display_name) || '',
          role:         'user'
        });
      }
    } catch (e) {
      // La table profiles n'existe pas encore — mode dégradé
    }
  }

  // Badge utilisateur
  var badge = document.getElementById('user-badge');
  if (badge) {
    var meta = user.user_metadata;
    var displayName = (meta && meta.display_name) ? meta.display_name : user.email.split('@')[0];
    badge.innerHTML = '<span class="user-dot"></span>' + escapeHtml(displayName);
    badge.style.display = 'flex';
  }

  // Onglet admin visible uniquement pour les admins
  var adminBtn = document.getElementById('admin-nav-btn');
  if (adminBtn && window._IS_ADMIN) adminBtn.style.display = 'flex';

  initApp();
}

// ─── Logout ───
async function doLogout() {
  if (sb) await sb.auth.signOut();
  localStorage.removeItem('ms_session'); // nettoyage legacy
  location.reload();
}

// ─── Afficher erreur ───
function showLoginError(msg) {
  var el = document.getElementById('lerr');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, 3500);
}

// ─── Touche Entrée ───
document.addEventListener('keydown', function (e) {
  var lp = document.getElementById('login-page');
  if (e.key === 'Enter' && lp && lp.style.display !== 'none') {
    doLogin();
  }
});
