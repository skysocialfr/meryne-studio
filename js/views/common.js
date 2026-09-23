// ═══ Éléments réutilisés entre les écrans ═══
import { getPost, thumbOf } from '../store.js';
import { icon, esc, fmtWhen, statusBadge, pfBadge, FORMAT_LABEL, isVideoFormat, nf } from '../ui.js';
import { openEditor } from './editor.js';

export function postItem(p) {
  const img = thumbOf(p);
  const views = p.status === 'published' && p.stats?.views ? ` · ${icon('eye')} ${nf(p.stats.views)}` : '';
  return `<button class="pitem" data-open="${p.id}">
    <span class="pt">${img ? `<img src="${img}" alt="" loading="lazy">` : icon(isVideoFormat(p.format) ? 'video' : 'image')}${pfBadge(p.platform)}</span>
    <span style="min-width:0">
      <span class="ttl" style="display:block">${esc(p.title || 'Sans titre')}</span>
      <span class="meta">${FORMAT_LABEL[p.format] || ''} · ${p.status === 'published' && p.published_at ? 'posté ' + fmtWhen(p.published_at).toLowerCase() : fmtWhen(p.scheduled_at)}${views}</span>
    </span>
    ${statusBadge(p)}
  </button>`;
}

export function bindPostItems(root) {
  root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    const p = getPost(b.dataset.open);
    if (p) openEditor(p);
  }));
}
