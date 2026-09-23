// ═══ Briques d'interface partagées ═══

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.4 4.6 5 5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="3"/><path d="m17 10 5-3v10l-5-3z"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  layers: '<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  dup: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  swap: '<path d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  script: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
export const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`;

export const PLATFORMS = {
  instagram: { label: 'Instagram', formats: [['post', 'Post'], ['carousel', 'Carrousel'], ['reel', 'Reel'], ['story', 'Story']], captionMax: 2200, tagMax: 30, tagTip: '3 à 5 hashtags ciblés suffisent', url: 'https://www.instagram.com/' },
  tiktok: { label: 'TikTok', formats: [['video', 'Vidéo'], ['photos', 'Carrousel photo']], captionMax: 4000, tagMax: 10, tagTip: '3 à 5 hashtags, dont 1-2 de niche', url: 'https://www.tiktok.com/' },
};
export const FORMAT_LABEL = { post: 'Post', carousel: 'Carrousel', reel: 'Reel', story: 'Story', video: 'Vidéo', photos: 'Carrousel photo' };
export const isVideoFormat = (f) => f === 'reel' || f === 'video' || f === 'story';
export const STATUS = {
  idea: 'Idée',
  draft: 'En préparation',
  ready: 'Prêt à poster',
  published: 'Publié',
};

export const pfBadge = (platform) => `<span class="pf pf-${platform}" title="${PLATFORMS[platform].label}">${icon(platform)}</span>`;
export function statusBadge(post) {
  if (isLate(post)) return `<span class="badge st-late">En retard</span>`;
  return `<span class="badge st-${post.status}">${STATUS[post.status]}</span>`;
}
export const isLate = (p) => p.status !== 'published' && p.scheduled_at && new Date(p.scheduled_at) < new Date(Date.now() - 5 * 60_000);

// ─── Dates ───
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const fmtTime = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
export function fmtDay(d) {
  const x = new Date(d), today = startOfDay(new Date());
  const diff = Math.round((startOfDay(x) - today) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  const s = x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const fmtWhen = (d) => d ? `${fmtDay(d)} · ${fmtTime(d)}` : 'Pas de date';
export const fmtShort = (d) => { const x = new Date(d); return `${DAYS[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}`; };
export function toLocalInput(d) {
  if (!d) return '';
  const x = new Date(d), p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}
export function relative(d) {
  const m = Math.round((new Date(d) - Date.now()) / 60_000);
  if (Math.abs(m) < 1) return 'maintenant';
  const abs = Math.abs(m), u = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} j`;
  return m > 0 ? `dans ${u}` : `il y a ${u}`;
}
export const nf = (n) => n == null || n === '' ? '—' : new Intl.NumberFormat('fr-FR', { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);

export const countTags = (s) => (String(s || '').match(/#[\p{L}\p{N}_]+/gu) || []).length;
export function normalizeTags(s) {
  return String(s || '').split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t)).join(' ');
}
export const fullCaption = (p) => [p.caption?.trim(), normalizeTags(p.hashtags)].filter(Boolean).join('\n\n');

// ─── Toast ───
let toastTimer;
export function toast(msg, ico = 'check') {
  const root = document.getElementById('toast-root');
  root.innerHTML = `<div class="toast" role="status">${icon(ico)}<span>${esc(msg)}</span></div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (root.innerHTML = ''), 2600);
}

// ─── Sheet (fenêtre plein écran sur mobile) ───
const stack = [];
export function openSheet({ title, body, footer = '', onMount, onClose, beforeClose }) {
  const root = document.getElementById('sheet-root');
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="sheet-h"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button></header>
      <div class="sheet-b">${body}</div>
      ${footer ? `<footer class="sheet-f">${footer}</footer>` : ''}
    </section>`;
  root.appendChild(wrap);
  document.body.style.overflow = 'hidden';
  const api = {
    el: wrap.querySelector('.sheet'),
    body: wrap.querySelector('.sheet-b'),
    footer: wrap.querySelector('.sheet-f'),
    setBody(html) { this.body.innerHTML = html; },
    setFooter(html) { if (this.footer) this.footer.innerHTML = html; },
    async close(force) {
      if (!force && beforeClose && !(await beforeClose())) return;
      wrap.remove();
      stack.splice(stack.indexOf(api), 1);
      if (!stack.length) document.body.style.overflow = '';
      onClose?.();
    },
  };
  stack.push(api);
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => api.close());
  wrap.querySelector('[data-close]').addEventListener('click', () => api.close());
  onMount?.(api);
  return api;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
export const sheetOpen = () => stack.length > 0;

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isMobile = () => matchMedia('(pointer: coarse)').matches;
