// ═══ Aujourd'hui : quoi poster, quand ═══
import { S, thumbOf, currentPushSub, pushSupported } from '../store.js';
import { icon, esc, fmtTime, fmtWhen, relative, sameDay, startOfDay, isLate, FORMAT_LABEL, PLATFORMS, isIOS, isStandalone } from '../ui.js';
import { postItem, bindPostItems } from './common.js';
import { openPoster } from './poster.js';
import { openEditor } from './editor.js';
import { openSettings } from './settings.js';

export function renderToday(el) {
  const now = new Date();
  const todo = S.posts.filter((p) => p.status !== 'published');
  const late = todo.filter(isLate);
  const upcoming = todo.filter((p) => p.scheduled_at && !isLate(p));
  const next = late[0] || upcoming[0];
  const todays = todo.filter((p) => p.scheduled_at && sameDay(p.scheduled_at, now) && p !== next);
  const ideas = todo.filter((p) => !p.scheduled_at);
  const needStats = S.posts.filter((p) => p.status === 'published' && !p.stats?.views && p.published_at && Date.now() - new Date(p.published_at) > 36 * 3600_000);

  const hour = now.getHours();
  const hello = hour < 5 ? 'Bonne nuit' : hour < 18 ? 'Bonjour' : 'Bonsoir';
  const name = S.profile?.display_name || '';

  el.innerHTML = `
    <header class="topbar"><h1><small>${esc(capitalize(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })))}</small>${hello}${name ? ' ' + esc(name) : ''} ✨</h1>
      <button class="icon-btn" data-settings aria-label="Réglages">${icon('settings')}</button></header>
    <div class="view">
      ${next ? heroCard(next) : calmHero()}
      <div id="push-slot"></div>
      ${late.length > 1 ? section('En retard', late.slice(1), late.length - 1) : ''}
      ${todays.length ? section("Encore aujourd'hui", todays) : ''}
      <section class="section">
        <div class="section-h"><h2>Ma semaine</h2><a class="small faint" href="#/instagram">Voir le planning</a></div>
        ${weekStrip()}
      </section>
      ${upcomingSection(upcoming.filter((p) => p !== next && !sameDay(p.scheduled_at, now)))}
      ${needStats.length ? `<section class="section"><div class="section-h"><h2>Stats à compléter</h2><a class="small faint" href="#/stats">Ouvrir les stats</a></div>
        <p class="small muted" style="margin:-4px 0 10px">Note les vues de ces posts pour savoir ce qui marche.</p>
        <div class="plist">${needStats.slice(0, 3).map((p) => postItem(p)).join('')}</div></section>` : ''}
      ${ideas.length ? section('Idées & brouillons sans date', ideas.slice(0, 5), ideas.length) : ''}
    </div>`;

  el.querySelector('[data-settings]').addEventListener('click', openSettings);
  el.querySelector('[data-post-now]')?.addEventListener('click', () => openPoster(next));
  el.querySelector('[data-edit-next]')?.addEventListener('click', () => openEditor(next));
  el.querySelector('[data-new-first]')?.addEventListener('click', () => openEditor(null, { platform: 'tiktok' }));
  bindPostItems(el);
  pushNotice(el.querySelector('#push-slot'));
}

function heroCard(p) {
  const img = thumbOf(p);
  const late = isLate(p);
  const ready = p.status === 'ready';
  return `<article class="hero">
    <div class="thumb">${img ? `<img src="${img}" alt="">` : ''}</div>
    <div>
      <div class="when">${icon(late ? 'alert' : 'clock')} ${late ? `Prévu ${fmtWhen(p.scheduled_at).toLowerCase()}` : `${sameDay(p.scheduled_at, new Date()) ? "Aujourd'hui" : fmtWhen(p.scheduled_at).split(' · ')[0]} à ${fmtTime(p.scheduled_at)} · ${relative(p.scheduled_at)}`}</div>
      <h2>${esc(p.title || FORMAT_LABEL[p.format])}</h2>
      <div class="row wrap">
        ${ready || late ? `<button class="btn btn-lg" data-post-now>${icon('send')} Poster maintenant</button>` : `<button class="btn btn-lg" data-edit-next>Finir de préparer</button>`}
        <span class="small" style="opacity:.8">${PLATFORMS[p.platform].label} · ${FORMAT_LABEL[p.format]}</span>
      </div>
    </div>
  </article>`;
}

function calmHero() {
  const any = S.posts.length > 0;
  return `<article class="hero calm"><div>
    <div class="when">${icon('sparkle')} Rien de prévu</div>
    <h2>${any ? 'Tout est posté. Bravo !' : 'Prépare ton premier post'}</h2>
    <p>${any ? 'Prépare le prochain : médias, légende, hashtags et heure. Je te préviens quand c’est le moment.' : 'Ajoute ta vidéo ou tes photos, écris la légende et choisis l’heure. Je t’envoie une notif quand c’est le moment de poster.'}</p>
    <button class="btn btn-lg" data-new-first>${icon('plus')} Nouveau post</button>
  </div></article>`;
}

function section(title, posts, count) {
  return `<section class="section"><div class="section-h"><h2>${title}</h2>${count ? `<span class="count">${count}</span>` : ''}</div>
    <div class="plist">${posts.map((p) => postItem(p)).join('')}</div></section>`;
}

function upcomingSection(list) {
  if (!list.length) return '';
  const groups = [];
  list.slice(0, 12).forEach((p) => {
    const k = startOfDay(p.scheduled_at).getTime();
    const g = groups.find((x) => x.k === k);
    g ? g.items.push(p) : groups.push({ k, d: p.scheduled_at, items: [p] });
  });
  return `<section class="section"><div class="section-h"><h2>À venir</h2><span class="count">${list.length}</span></div>
    ${groups.map((g) => `<div class="day-h">${fmtWhen(g.d).split(' · ')[0]}</div><div class="plist">${g.items.map((p) => postItem(p)).join('')}</div>`).join('')}</section>`;
}

function weekStrip() {
  const start = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
  return `<div class="week">${days.map((d, i) => {
    const posts = S.posts.filter((p) => p.scheduled_at && sameDay(p.scheduled_at, d));
    const label = posts.map((p) => `${PLATFORMS[p.platform].label} ${fmtTime(p.scheduled_at)}`).join(', ');
    return `<div class="day ${i === 0 ? 'today' : ''}" title="${esc(label || 'Rien de prévu')}">
      <span class="dn">${d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
      <span class="dd">${d.getDate()}</span>
      <span class="dots">${posts.map((p) => `<i class="dot ${p.platform} ${p.status === 'published' ? 'done' : ''}"></i>`).join('')}</span>
      <span class="sr-only">${posts.length} post(s)</span>
    </div>`;
  }).join('')}</div>
  <div class="legend" style="margin-top:10px"><span><i style="background:var(--series-ig);height:8px;width:8px;border-radius:50%"></i>Instagram</span><span><i style="background:var(--series-tt);height:8px;width:8px;border-radius:50%"></i>TikTok</span></div>`;
}

async function pushNotice(slot) {
  if (!slot || localStorage.getItem('vs-push-dismiss')) return;
  if (!pushSupported()) {
    if (isIOS() && !isStandalone()) {
      slot.innerHTML = notice('Installe l’app pour recevoir les rappels', 'Sur iPhone : touche <b>Partager</b> puis <b>« Sur l’écran d’accueil »</b>. Ouvre ensuite Veyra depuis l’icône.', null);
      bindDismiss(slot);
    }
    return;
  }
  if (await currentPushSub()) return;
  slot.innerHTML = notice('Active les rappels', 'Je t’envoie une notification quand c’est l’heure de poster.', 'Activer');
  bindDismiss(slot);
  slot.querySelector('[data-enable]')?.addEventListener('click', openSettings);
}
const notice = (t, p, cta) => `<div class="notice section">${icon('bell')}<div class="grow"><strong>${t}</strong><p>${p}</p>
  <div class="row">${cta ? `<button class="btn btn-primary btn-sm" data-enable>${cta}</button>` : ''}<button class="btn btn-ghost btn-sm" data-dismiss>Plus tard</button></div></div></div>`;
const bindDismiss = (slot) => slot.querySelector('[data-dismiss]')?.addEventListener('click', () => { try { localStorage.setItem('vs-push-dismiss', '1'); } catch {} slot.innerHTML = ''; });
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
