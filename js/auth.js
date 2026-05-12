/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Auth v6
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

  window._VEYRA_UID    = user.id;
  window._USER_EMAIL   = user.email;
  window._IS_ADMIN     = false;
  window._USER_PROFILE = null;

  if (sb) {
    try {
      var { data: profile } = await sb.from('profiles')
        .select('id, role, display_name, niche, location, tagline, ig_handle, tt_handle, ig_goal, tt_goal, ai_persona, onboarded')
        .eq('id', user.id)
        .single();

      if (profile) {
        window._USER_PROFILE = profile;
        if (profile.role === 'admin') window._IS_ADMIN = true;
      } else {
        var inserted = await sb.from('profiles').insert({
          id:           user.id,
          email:        user.email,
          display_name: (user.user_metadata && user.user_metadata.display_name) || '',
          role:         'user'
        }).select().single();
        if (inserted && inserted.data) window._USER_PROFILE = inserted.data;
      }
    } catch (e) {
      // Mode dégradé
    }
  }

  var p = window._USER_PROFILE || {};
  var displayName = p.display_name || (user.user_metadata && user.user_metadata.display_name) || user.email.split('@')[0];

  var badge = document.getElementById('user-badge');
  if (badge) {
    badge.innerHTML = '<span class="user-dot"></span>' + escapeHtml(displayName);
    badge.style.display = 'flex';
  }

  var adminBtn = document.getElementById('admin-nav-btn');
  if (adminBtn && window._IS_ADMIN) adminBtn.style.display = 'flex';

  applyProfileToUI();

  if (!p.onboarded) {
    showOnboardingWizard();
    return;
  }

  initApp();
}

function applyProfileToUI() {
  var p = window._USER_PROFILE || {};

  var hdrBrand = document.querySelector('.hdr-brand');
  if (hdrBrand) hdrBrand.textContent = p.display_name || 'Veyra Studio';

  var hdrSub = document.querySelector('.hdr-sub');
  if (hdrSub) {
    var bits = [p.niche, p.location, p.tagline].filter(function(s){return s && s.trim();});
    hdrSub.textContent = bits.length ? bits.join(' · ') : '';
  }

  var goalEls = document.querySelectorAll('.hdr-goal');
  if (goalEls && goalEls.length >= 2) {
    var igVal = goalEls[0].querySelector('.hg-val');
    var ttVal = goalEls[1].querySelector('.hg-val');
    if (igVal && p.ig_goal != null) igVal.textContent = formatGoal(p.ig_goal);
    if (ttVal && p.tt_goal != null) ttVal.textContent = formatGoal(p.tt_goal);
  }

  var tipGoals = document.getElementById('fw-tip-goals');
  if (tipGoals) {
    if (p.ig_goal || p.tt_goal) {
      var igFmt = p.ig_goal ? formatGoal(p.ig_goal) : '—';
      var ttFmt = p.tt_goal ? formatGoal(p.tt_goal) : '—';
      tipGoals.innerHTML = 'Objectif : Instagram <strong style="color:var(--ink)">'
        + igFmt + '</strong> · TikTok <strong style="color:var(--ink)">' + ttFmt + '</strong>.';
    } else {
      tipGoals.textContent = 'Saisis tes objectifs depuis ton profil pour afficher ta progression.';
    }
  }

  var anaLine = document.getElementById('ana-goals-line');
  if (anaLine) {
    var parts = ['Progression hebdomadaire'];
    if (p.ig_goal) parts.push('Objectif ' + formatGoal(p.ig_goal) + ' IG');
    if (p.tt_goal) parts.push(formatGoal(p.tt_goal) + ' TT');
    anaLine.textContent = parts.join(' · ');
  }
}

function formatGoal(n) {
  if (n == null) return '';
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return String(n);
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
