// ═══ Veyra Studio v2 — point d'entrée ═══
import { sb, S, loadAll, onChange, getPost, AUTH_LINK } from './store.js';
import { icon, esc, toast, sheetOpen } from './ui.js';
import { renderToday } from './views/today.js';
import { renderPlatform } from './views/platform.js';
import { renderStats } from './views/stats.js';
import { openEditor } from './views/editor.js';
import { openPoster } from './views/poster.js';
import { openSettings } from './views/settings.js';

const app = document.getElementById('app');
const ROUTES = {
  today: { label: "Aujourd'hui", icon: 'home', render: renderToday },
  instagram: { label: 'Instagram', icon: 'instagram', render: (el) => renderPlatform(el, 'instagram') },
  tiktok: { label: 'TikTok', icon: 'tiktok', render: (el) => renderPlatform(el, 'tiktok') },
  stats: { label: 'Stats', icon: 'chart', render: renderStats },
};
const route = () => { const r = location.hash.replace(/^#\/?/, '').split('?')[0]; return ROUTES[r] ? r : 'today'; };

// ─── Service worker (notifications + installation) ───
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'open-post' && S.user) openFromUrl(e.data.url);
  });
}

// ─── Authentification ───
let authReady = false;
let recovering = false;
sb.auth.onAuthStateChange((event, session) => {
  // Lien « mot de passe oublié » : on reste sur le formulaire de nouveau mot de passe,
  // même si supabase-js annonce d'abord la session comme une connexion normale.
  if (event === 'PASSWORD_RECOVERY' || (AUTH_LINK.recovery && session)) {
    S.user = session?.user || S.user;
    authReady = true;
    if (!recovering) { recovering = true; setTimeout(renderNewPassword, 0); }
    return;
  }
  if (recovering) return;
  const next = session?.user || null;
  if (authReady && next?.id === S.user?.id) return;
  authReady = true;
  S.user = next;
  // Hors du callback : supabase-js se bloque si on l'appelle depuis onAuthStateChange.
  setTimeout(() => (next ? boot() : renderLogin(linkErrorMessage(), true)), 0);
});

function linkErrorMessage() {
  if (!AUTH_LINK.error) return '';
  const code = AUTH_LINK.error;
  AUTH_LINK.error = '';
  history.replaceState(null, '', location.pathname);
  return /expired|otp|access_denied/i.test(code)
    ? 'Ce lien a expiré ou a déjà servi. Entre ton email et touche « Mot de passe oublié » pour en recevoir un nouveau (il est valable 1 h, utilise le dernier reçu).'
    : 'Ce lien ne fonctionne pas. Redemande un email avec « Mot de passe oublié ».';
}

async function boot() {
  app.innerHTML = `<div class="boot"><div class="boot-logo">Veyra <em>Studio</em></div></div>`;
  try {
    await loadAll();
  } catch (e) {
    app.innerHTML = `<div class="login"><div class="login-card"><h1>Oups</h1><p class="sub">${esc(e.message || e)}</p>
      <button class="btn btn-primary btn-block" onclick="location.reload()">Réessayer</button></div></div>`;
    return;
  }
  renderShell();
  openFromUrl(location.href);
}

function openFromUrl(href) {
  const u = new URL(href, location.origin);
  const id = u.searchParams.get('poster');
  if (!id) return;
  u.searchParams.delete('poster');
  history.replaceState(null, '', u.pathname + u.search + u.hash);
  const p = getPost(id);
  if (p) openPoster(p); else toast('Ce post n’existe plus', 'alert');
}

function renderShell() {
  app.innerHTML = `
    <nav class="nav" aria-label="Navigation principale">
      <div class="brand">Veyra <em>Studio</em></div>
      ${navLink('today')}${navLink('instagram')}
      <button class="nav-add" data-new aria-label="Nouveau post">${icon('plus')}<span>Nouveau post</span></button>
      ${navLink('tiktok')}${navLink('stats')}
      <a href="#" class="nav-settings" data-settings>${icon('settings')}<span>Réglages</span></a>
    </nav>
    <div class="shell"><main id="view"></main></div>`;
  app.querySelector('[data-new]').addEventListener('click', () => {
    const r = route();
    openEditor(null, { platform: r === 'tiktok' ? 'tiktok' : 'instagram' });
  });
  app.querySelector('[data-settings]').addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
  renderView();
}
const navLink = (r) => `<a href="#/${r}" data-route="${r}">${icon(ROUTES[r].icon)}<span>${ROUTES[r].label}</span></a>`;

function renderView() {
  const view = document.getElementById('view');
  if (!view) return;
  const r = route();
  app.querySelectorAll('[data-route]').forEach((a) => a.setAttribute('aria-current', a.dataset.route === r ? 'page' : 'false'));
  const scroll = view.dataset.route === r ? window.scrollY : 0;
  view.dataset.route = r;
  ROUTES[r].render(view);
  window.scrollTo(0, scroll);
}

window.addEventListener('hashchange', renderView);
onChange(() => renderView());

// Rafraîchit les données quand on revient sur l'app (autre appareil, notif…)
let lastSync = Date.now();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !S.user || Date.now() - lastSync < 30_000 || sheetOpen()) return;
  lastSync = Date.now();
  try { await loadAll(); } catch { /* hors ligne : on garde l'état actuel */ }
});
// Les badges "en retard" / compte à rebours se mettent à jour chaque minute.
setInterval(() => { if (S.user && !sheetOpen()) renderView(); }, 60_000);

// ─── Écrans de connexion ───
function renderLogin(msg = '', isErr = false) {
  app.innerHTML = `
    <div class="login"><div class="login-card">
      <h1>Veyra <em style="color:var(--rose)">Studio</em></h1>
      <p class="sub">Ton studio de posts Instagram & TikTok</p>
      <form id="login-form">
        <div class="field"><label for="em">Email</label><input class="input" id="em" type="email" autocomplete="email" required></div>
        <div class="field"><label for="pw">Mot de passe</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-rose btn-lg btn-block" type="submit">Se connecter</button>
        <button class="btn btn-ghost btn-sm" type="button" id="forgot">Mot de passe oublié ?</button>
        <p class="login-msg${isErr && msg ? ' err' : ''}" id="lmsg">${esc(msg)}</p>
      </form>
    </div></div>`;
  const f = document.getElementById('login-form'), m = document.getElementById('lmsg');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; m.className = 'login-msg'; m.textContent = 'Connexion…';
    const { error } = await sb.auth.signInWithPassword({ email: f.em.value.trim(), password: f.pw.value });
    if (error) { m.className = 'login-msg err'; m.textContent = 'Email ou mot de passe incorrect.'; btn.disabled = false; }
  });
  document.getElementById('forgot').addEventListener('click', async () => {
    const email = f.em.value.trim();
    if (!email) { m.className = 'login-msg err'; m.textContent = 'Entre ton email d’abord.'; return; }
    m.className = 'login-msg'; m.textContent = 'Envoi…';
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (error) {
      m.className = 'login-msg err';
      m.textContent = error.status === 429 || /rate limit|security purposes|seconds/i.test(error.message)
        ? 'Trop de demandes d’email d’affilée. Attends environ 1 h, puis réessaie une seule fois.'
        : `L’email n’a pas pu partir : ${error.message}`;
      return;
    }
    m.className = 'login-msg'; m.textContent = 'Email envoyé : regarde aussi dans les spams, puis clique sur le lien du dernier email reçu.';
  });
}

function renderNewPassword() {
  app.innerHTML = `
    <div class="login"><div class="login-card">
      <h1>Nouveau mot de passe</h1><p class="sub">Choisis-en un que tu retiendras 😉</p>
      <form id="np"><div class="field"><label for="p1">Mot de passe</label><input class="input" id="p1" type="password" minlength="8" autocomplete="new-password" required></div>
      <button class="btn btn-rose btn-lg btn-block">Enregistrer</button><p class="login-msg" id="npm"></p></form>
    </div></div>`;
  document.getElementById('np').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = document.getElementById('npm'), btn = e.target.querySelector('button');
    btn.disabled = true; m.className = 'login-msg'; m.textContent = 'Enregistrement…';
    const { error } = await sb.auth.updateUser({ password: e.target.p1.value });
    if (error) {
      m.className = 'login-msg err';
      m.textContent = /session/i.test(error.message) ? 'Ce lien a expiré. Retourne à la connexion et redemande « Mot de passe oublié ».'
        : /different/i.test(error.message) ? 'Choisis un mot de passe différent de l’ancien.'
        : /at least|characters|weak/i.test(error.message) ? 'Mot de passe trop court ou trop simple (8 caractères minimum).'
        : error.message;
      btn.disabled = false;
      return;
    }
    toast('Mot de passe mis à jour');
    recovering = false; AUTH_LINK.recovery = false;
    history.replaceState(null, '', location.pathname);
    const { data } = await sb.auth.getSession();
    S.user = data.session?.user || null;
    if (S.user) boot(); else renderLogin('Mot de passe mis à jour : connecte-toi avec le nouveau.');
  });
}
