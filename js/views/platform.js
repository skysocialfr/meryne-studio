// ═══ Espace Instagram / TikTok : aperçu du profil, planning, idées ═══
import { S, thumbOf, cachedUrl, signedUrls, patchPost, latestFollowers, getPost } from '../store.js';
import { icon, esc, PLATFORMS, fmtShort, fmtTime, fmtWhen, startOfDay, isLate, nf, toast, isVideoFormat } from '../ui.js';
import { postItem, bindPostItems } from './common.js';
import { openEditor } from './editor.js';
import { openSettings } from './settings.js';

const tabState = { instagram: 'grid', tiktok: 'grid' };
let swapMode = false, swapPick = null;

export function renderPlatform(el, platform) {
  const P = PLATFORMS[platform];
  const tab = tabState[platform];
  const posts = S.posts.filter((p) => p.platform === platform);
  const ideas = posts.filter((p) => !p.scheduled_at && p.status !== 'published');
  const planned = posts.filter((p) => p.scheduled_at && p.status !== 'published');

  el.innerHTML = `
    <header class="topbar"><h1><small>${planned.length} prévu${planned.length > 1 ? 's' : ''} · ${ideas.length} idée${ideas.length > 1 ? 's' : ''}</small>${P.label}</h1>
      <button class="icon-btn" data-settings aria-label="Réglages">${icon('settings')}</button></header>
    <div class="view">
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Affichage">
          ${segBtn('grid', 'grid', 'Grille', tab)}${segBtn('plan', 'calendar', 'Planning', tab)}${segBtn('ideas', 'bulb', 'Idées', tab)}
        </div>
      </div>
      <div id="pf-body"></div>
    </div>`;

  el.querySelector('[data-settings]').addEventListener('click', openSettings);
  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tabState[platform] = b.dataset.tab; swapMode = false; renderPlatform(el, platform); }));
  const body = el.querySelector('#pf-body');
  if (tab === 'grid') renderGrid(body, platform, posts);
  if (tab === 'plan') renderPlan(body, platform, posts);
  if (tab === 'ideas') renderIdeas(body, platform, ideas);
  bindPostItems(body);
}
const segBtn = (id, ico, label, cur) => `<button data-tab="${id}" aria-pressed="${cur === id}">${icon(ico)}${label}</button>`;

// ─── Aperçu du profil ───
function renderGrid(body, platform, posts) {
  const inGrid = posts
    .filter((p) => p.format !== 'story' && (p.scheduled_at || p.published_at))
    .sort((a, b) => dateOf(b) - dateOf(a));
  const published = posts.filter((p) => p.status === 'published').length;
  const planned = posts.filter((p) => p.status !== 'published' && p.scheduled_at).length;
  const pr = S.profile || {};
  const handle = platform === 'instagram' ? pr.ig_handle : pr.tt_handle;
  const bio = platform === 'instagram' ? pr.ig_bio : pr.tt_bio;
  const avatar = pr.avatar_path ? cachedUrl(pr.avatar_path) : null;
  const initial = (pr.display_name || handle || 'V').replace('@', '').charAt(0).toUpperCase();
  const av = `<div class="avatar"><div>${avatar ? `<img src="${avatar}" alt="">` : esc(initial)}</div></div>`;
  const stats = `<div class="ig-stats"><div><b>${published}</b><span>publiés</span></div><div><b>${nf(latestFollowers(platform))}</b><span>abonnés</span></div><div><b>${planned}</b><span>prévus</span></div></div>`;
  const head = platform === 'instagram'
    ? `<div class="ig-head"><div class="top">${av}${stats}</div><div class="ig-name">${esc(pr.display_name || handle || 'Ton nom')}</div><div class="ig-bio">${esc(bio || '')}</div></div>`
    : `<div class="tt-head">${av}<div class="handle">@${esc((handle || 'ton_pseudo').replace('@', ''))}</div>${stats}<div class="ig-bio">${esc(bio || '')}</div></div>`;

  body.innerHTML = `
    <div class="pv-layout">
      <div class="phone">
        <button style="display:block;width:100%;text-align:inherit" data-edit-profile aria-label="Modifier le profil">${head}</button>
        <div class="pv-tabs"><span class="on">${icon('grid')}</span><span>${icon(platform === 'instagram' ? 'video' : 'layers')}</span></div>
        ${inGrid.length ? `<div class="grid">${inGrid.map(tile).join('')}</div>` : `<div class="empty" style="margin:16px;border-radius:16px"><h3>Ta grille est vide</h3><p>Ajoute un post avec une date : il apparaîtra ici pour voir le rendu de ton profil.</p></div>`}
      </div>
      <div class="pv-side stack">
        <div class="card stack">
          <strong>Comment ça marche</strong>
          <p class="small muted">La grille montre ton profil tel qu’il sera : les posts prévus en haut (avec leur date), puis ceux déjà publiés. Touche une case pour la modifier.</p>
          <button class="btn ${swapMode ? 'btn-rose' : ''}" data-swap>${icon('swap')} ${swapMode ? (swapPick ? 'Touche la 2e case…' : 'Touche une 1re case…') : 'Échanger deux posts'}</button>
          ${swapMode ? `<button class="btn btn-ghost btn-sm" data-swap-cancel>Annuler</button>` : `<p class="small faint">Pour changer l’ordre : « Échanger deux posts », puis touche deux cases prévues. Leurs dates sont inversées.</p>`}
        </div>
      </div>
    </div>`;

  body.querySelector('[data-edit-profile]').addEventListener('click', openSettings);
  body.querySelector('[data-swap]').addEventListener('click', () => { swapMode = !swapMode; swapPick = null; renderGrid(body, platform, posts); });
  body.querySelector('[data-swap-cancel]')?.addEventListener('click', () => { swapMode = false; swapPick = null; renderGrid(body, platform, posts); });
  body.querySelectorAll('[data-tile]').forEach((t) => t.addEventListener('click', async () => {
    const p = getPost(t.dataset.tile);
    if (!swapMode) return openEditor(p);
    if (p.status === 'published') return toast('Un post déjà publié ne peut pas bouger', 'alert');
    if (!swapPick) { swapPick = p.id; t.classList.add('pick'); body.querySelector('[data-swap]').innerHTML = `${icon('swap')} Touche la 2e case…`; return; }
    if (swapPick === p.id) { swapPick = null; t.classList.remove('pick'); return; }
    const a = getPost(swapPick), b = p;
    swapMode = false; swapPick = null;
    try {
      await Promise.all([patchPost(a.id, { scheduled_at: b.scheduled_at }), patchPost(b.id, { scheduled_at: a.scheduled_at })]);
      toast('Posts échangés');
    } catch (e) { toast(e.message, 'alert'); }
  }));
}

const dateOf = (p) => new Date(p.published_at || p.scheduled_at).getTime();

function tile(p) {
  const img = thumbOf(p);
  const fmt = p.format === 'carousel' || p.format === 'photos' ? icon('layers') : isVideoFormat(p.format) ? icon('play') : '';
  const pub = p.status === 'published';
  const label = pub ? (p.stats?.views ? `<span class="views">${icon('play')}${nf(p.stats.views)}</span>` : '')
    : `<span class="when"><span class="${p.status === 'ready' ? 'ready' : ''}">${isLate(p) ? '⚠ ' : ''}${fmtShort(p.scheduled_at)} ${fmtTime(p.scheduled_at)}</span></span>`;
  return `<button class="tile ${pub ? 'published' : ''} ${swapMode && pub ? 'dim' : ''} ${swapPick === p.id ? 'pick' : ''}" data-tile="${p.id}" aria-label="${esc(p.title || 'Post')} – ${fmtWhen(p.scheduled_at)}">
    ${img ? `<img src="${img}" alt="" loading="lazy">` : `<span class="ph">${esc(p.title || 'Sans visuel')}</span>`}
    ${fmt ? `<span class="fmt">${fmt}</span>` : ''}${label}
  </button>`;
}

// ─── Planning ───
function renderPlan(body, platform, posts) {
  const upcoming = posts.filter((p) => p.scheduled_at && p.status !== 'published');
  const done = posts.filter((p) => p.status === 'published').sort((a, b) => dateOf(b) - dateOf(a)).slice(0, 12);
  const groups = [];
  upcoming.forEach((p) => {
    const k = startOfDay(p.scheduled_at).getTime();
    const g = groups.find((x) => x.k === k);
    g ? g.items.push(p) : groups.push({ k, d: p.scheduled_at, items: [p] });
  });
  body.innerHTML = `
    ${groups.length ? groups.map((g) => `<div class="day-h">${fmtWhen(g.d).split(' · ')[0]}</div><div class="plist">${g.items.map(postItem).join('')}</div>`).join('')
      : `<div class="empty"><h3>Rien de prévu</h3><p>Programme ton prochain ${PLATFORMS[platform].label} pour ne plus y penser.</p><button class="btn btn-primary" data-new>${icon('plus')} Nouveau post</button></div>`}
    ${done.length ? `<section class="section"><div class="section-h"><h2>Déjà publiés</h2></div><div class="plist">${done.map(postItem).join('')}</div></section>` : ''}`;
  body.querySelector('[data-new]')?.addEventListener('click', () => openEditor(null, { platform }));
}

// ─── Idées ───
function renderIdeas(body, platform, ideas) {
  body.innerHTML = `
    <form class="row" data-quick style="margin-bottom:14px">
      <input class="input grow" name="t" placeholder="Nouvelle idée de ${PLATFORMS[platform].label}…" aria-label="Nouvelle idée" autocomplete="off">
      <button class="btn btn-primary" style="min-height:48px">${icon('plus')}<span class="sr-only">Ajouter</span></button>
    </form>
    ${ideas.length ? `<div class="plist">${ideas.map(postItem).join('')}</div>`
      : `<div class="empty"><h3>Ta boîte à idées</h3><p>Note une idée dès qu’elle arrive : tu ajouteras le script, les médias et la date plus tard.</p></div>`}`;
  body.querySelector('[data-quick]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = e.target.t.value.trim();
    if (!t) return;
    const { savePost, newId } = await import('../store.js');
    await savePost({ id: newId(), platform, format: platform === 'tiktok' ? 'video' : 'reel', title: t, status: 'idea' });
    toast('Idée ajoutée 💡');
  });
}
