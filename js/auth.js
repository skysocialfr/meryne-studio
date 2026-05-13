/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Auth v6
   Authentification via Supabase Auth (email + mdp)
   ═══════════════════════════════════════════════ */

// ─── Auth mode toggle ───
var AUTH_MODE = 'login'; // 'login' | 'signup'

function setAuthMode(mode) {
  AUTH_MODE = mode === 'signup' ? 'signup' : 'login';

  var tabs       = document.getElementById('auth-tabs');
  var tabLogin   = document.getElementById('auth-tab-login');
  var tabSignup  = document.getElementById('auth-tab-signup');
  var submitBtn  = document.getElementById('auth-submit');
  var passInput  = document.getElementById('lp');
  var pass2Wrap  = document.getElementById('lp2-wrap');
  var pass2Input = document.getElementById('lp2');
  var strength   = document.getElementById('lp-strength');
  var hint       = document.getElementById('lp-hint');
  var sub        = document.getElementById('auth-sub');
  var err        = document.getElementById('lerr');

  if (tabs)      tabs.setAttribute('data-mode', AUTH_MODE);
  if (tabLogin)  tabLogin.classList.toggle('active',  AUTH_MODE === 'login');
  if (tabSignup) tabSignup.classList.toggle('active', AUTH_MODE === 'signup');
  if (err) { err.classList.remove('show'); err.classList.remove('success'); }

  if (AUTH_MODE === 'signup') {
    if (submitBtn) submitBtn.textContent = 'Créer mon compte →';
    if (passInput) passInput.setAttribute('autocomplete', 'new-password');
    if (pass2Wrap) pass2Wrap.style.display = 'block';
    if (strength)  strength.style.display = 'block';
    if (hint)      hint.style.display = 'block';
    if (sub)       sub.textContent = 'Crée ton studio en 30 secondes';
    onPasswordInput();
  } else {
    if (submitBtn) submitBtn.textContent = 'Accéder au studio →';
    if (passInput) passInput.setAttribute('autocomplete', 'current-password');
    if (pass2Wrap) pass2Wrap.style.display = 'none';
    if (strength)  strength.style.display = 'none';
    if (hint)      hint.style.display = 'none';
    if (pass2Input) pass2Input.value = '';
    if (sub)       sub.textContent = 'Le studio des créateurs ambitieux';
  }
}

function submitAuth() {
  return AUTH_MODE === 'signup' ? doSignup() : doLogin();
}

// Show / hide password field
function togglePassword(inputId, toggleId) {
  var inp = document.getElementById(inputId);
  var btn = document.getElementById(toggleId);
  if (!inp) return;
  var shown = inp.type === 'text';
  inp.type = shown ? 'password' : 'text';
  if (btn) btn.classList.toggle('shown', !shown);
}

// Real-time password strength scoring (0..3)
function _scorePassword(pw) {
  if (!pw) return 0;
  if (pw.length < 8) return 0;
  var score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  // bonus for variety: lower + upper + digit + symbol
  var variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/[0-9]/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  if (variety >= 3) score++;
  return Math.min(score, 3); // 0,1,2,3
}

function onPasswordInput() {
  if (AUTH_MODE !== 'signup') return;
  var inp = document.getElementById('lp');
  var bar = document.getElementById('lp-strength');
  if (!inp || !bar) return;
  var pw = inp.value;
  bar.classList.remove('weak', 'medium', 'strong');
  if (!pw) return;
  var s = _scorePassword(pw);
  if (s >= 3)      bar.classList.add('strong');
  else if (s === 2) bar.classList.add('medium');
  else              bar.classList.add('weak');
  // Re-check confirm match if user typed both fields
  onPasswordConfirmInput();
}

function onPasswordConfirmInput() {
  if (AUTH_MODE !== 'signup') return;
  var p1 = document.getElementById('lp');
  var p2 = document.getElementById('lp2');
  var hint = document.getElementById('lp2-hint');
  if (!p1 || !p2 || !hint) return;
  hint.classList.remove('success', 'error');
  if (!p2.value) { hint.textContent = ''; return; }
  if (p1.value === p2.value) {
    hint.textContent = 'Les mots de passe correspondent';
    hint.classList.add('success');
  } else {
    hint.textContent = 'Les mots de passe ne correspondent pas';
    hint.classList.add('error');
  }
}

// ─── Login ───
async function doLogin() {
  var emailEl = document.getElementById('lu');
  var passEl  = document.getElementById('lp');
  var btn     = document.getElementById('auth-submit');

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

// ─── Signup ───
async function doSignup() {
  var emailEl  = document.getElementById('lu');
  var passEl   = document.getElementById('lp');
  var pass2El  = document.getElementById('lp2');
  var btn      = document.getElementById('auth-submit');

  var email  = emailEl  ? emailEl.value.trim() : '';
  var pass   = passEl   ? passEl.value : '';
  var pass2  = pass2El  ? pass2El.value : '';

  if (!email || !pass)          { showLoginError('Remplis tous les champs'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showLoginError('Email invalide'); return; }
  if (pass.length < 8)          { showLoginError('Mot de passe : 8 caractères minimum'); return; }
  if (pass !== pass2)           { showLoginError('Les mots de passe ne correspondent pas'); return; }
  if (!sb)                      { showLoginError('Erreur serveur — réessaie'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Création…'; }

  var result = await sb.auth.signUp({ email: email, password: pass });

  if (result.error) {
    var msg = result.error.message || '';
    if (/already registered|already exists|user already/i.test(msg)) {
      showLoginError('Cet email a déjà un compte — connecte-toi');
    } else if (/pwned|breached|compromised/i.test(msg)) {
      showLoginError('Ce mot de passe est compromis — choisis-en un autre');
    } else if (/weak password|password should/i.test(msg)) {
      showLoginError('Mot de passe trop faible');
    } else {
      showLoginError('Erreur : ' + msg);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Créer mon compte →'; }
    return;
  }

  // If email confirmation is enabled, signUp does NOT return a session
  if (!result.data.session) {
    showLoginSuccess('Compte créé ! Vérifie ta boîte mail pour confirmer.');
    if (btn) { btn.disabled = false; btn.textContent = 'Créer mon compte →'; }
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
      // After we've loaded the profile, react to ?checkout=success|cancel from Stripe
      if (typeof handleCheckoutReturn === 'function') handleCheckoutReturn();
      return;
    }
  } catch (e) {}

  _showLoginPage();
}

// No active session: show the marketing landing page (login form opens on CTA click).
function _showLoginPage() {
  if (typeof showLandingPage === 'function') {
    showLandingPage();
  } else {
    // Fallback if landing.js failed to load: jump straight to login form
    showLoginUI('login');
  }
}

// Show the auth form (called from landing.js goToAuth or as fallback)
function showLoginUI(mode) {
  if (typeof hideLandingPage === 'function') hideLandingPage();
  var lp = document.getElementById('login-page');
  if (lp) lp.style.display = 'flex';
  if (typeof setAuthMode === 'function') setAuthMode(mode === 'signup' ? 'signup' : 'login');
}

// ─── Entrer dans l'app ───
var PROFILE_COLUMNS = 'id, email, role, display_name, niche, location, tagline, '
  + 'ig_handle, tt_handle, ig_goal, tt_goal, ai_persona, onboarded, '
  + 'stripe_customer_id, subscription_id, subscription_status, subscription_price_id, '
  + 'current_period_end, trial_end, cancel_at_period_end';

async function _enterApp(user) {
  if (typeof hideLandingPage === 'function') hideLandingPage();
  var lp  = document.getElementById('login-page');
  if (lp)  lp.style.display  = 'none';

  window._VEYRA_UID    = user.id;
  window._USER_EMAIL   = user.email;
  window._IS_ADMIN     = false;
  window._USER_PROFILE = null;

  if (sb) {
    try {
      var { data: profile } = await sb.from('profiles')
        .select(PROFILE_COLUMNS)
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
        }).select(PROFILE_COLUMNS).single();
        if (inserted && inserted.data) window._USER_PROFILE = inserted.data;
      }
    } catch (e) {
      // Mode dégradé
    }
  }

  _routeAfterAuth();
}

// Routes the user to the right surface after we have a profile.
// onboarding wizard → paywall → app
function _routeAfterAuth() {
  var p = window._USER_PROFILE || {};
  var app = document.getElementById('app');

  if (!p.onboarded) {
    if (app) app.style.display = 'none';
    showOnboardingWizard();
    return;
  }

  if (!_isEntitled(p)) {
    if (app) app.style.display = 'none';
    showPaywall();
    return;
  }

  // Entitled → enter the app
  if (app) app.style.display = 'block';

  var displayName = p.display_name || (window._USER_EMAIL || '').split('@')[0];
  var badge = document.getElementById('user-badge');
  if (badge) {
    badge.innerHTML = '<span class="user-dot"></span>' + escapeHtml(displayName);
    badge.style.display = 'flex';
  }

  var adminBtn = document.getElementById('admin-nav-btn');
  if (adminBtn && window._IS_ADMIN) adminBtn.style.display = 'flex';

  applyProfileToUI();
  renderSubscriptionBadge();
  initApp();
}

// Is the user currently entitled to use the app?
// Admins always pass; otherwise must be trialing or active and within current_period_end.
function _isEntitled(p) {
  if (!p) return false;
  if (p.role === 'admin') return true;
  if (p.subscription_status !== 'trialing' && p.subscription_status !== 'active') return false;
  if (p.current_period_end) {
    return new Date(p.current_period_end).getTime() > Date.now();
  }
  return true;
}

// Re-fetch profile from DB and re-route. Used after onboarding finish or checkout return.
async function refreshProfileAndRoute() {
  if (!sb || !window._VEYRA_UID) return;
  try {
    var { data: profile } = await sb.from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', window._VEYRA_UID)
      .single();
    if (profile) window._USER_PROFILE = profile;
  } catch (e) {}
  _routeAfterAuth();
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
  el.classList.remove('success');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, 4500);
}

function showLoginSuccess(msg) {
  var el = document.getElementById('lerr');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  el.classList.add('success');
  setTimeout(function () { el.classList.remove('show'); el.classList.remove('success'); }, 6000);
}

// ─── Touche Entrée ───
document.addEventListener('keydown', function (e) {
  var lp = document.getElementById('login-page');
  if (e.key === 'Enter' && lp && lp.style.display !== 'none') {
    submitAuth();
  }
});
