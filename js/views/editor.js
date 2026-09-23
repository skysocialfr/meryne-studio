// ═══ Fiche post : tout préparer au même endroit ═══
import { S, savePost, deletePost, newId, uploadFile, makeThumb, removeFiles, signedUrls, cachedUrl } from '../store.js';
import { icon, esc, openSheet, toast, PLATFORMS, FORMAT_LABEL, STATUS, isVideoFormat, toLocalInput, countTags, normalizeTags } from '../ui.js';
import { openPoster } from './poster.js';

export function openEditor(existing, defaults = {}) {
  const isNew = !existing;
  const d = structuredClone(existing || {
    id: newId(), platform: defaults.platform || 'instagram', format: defaults.platform === 'tiktok' ? 'video' : 'reel',
    title: '', caption: '', hashtags: '', first_comment: '', script: {}, media: [], cover_path: null,
    scheduled_at: null, status: 'draft', stats: {}, post_url: '',
  });
  d.script ||= {}; d.stats ||= {}; d.media ||= [];
  const initial = JSON.stringify(d);
  const uploadedNow = [];       // fichiers envoyés pendant cette session (à nettoyer si on annule un nouveau post)
  const removed = [];           // fichiers retirés (supprimés du stockage à l'enregistrement)
  let uploading = 0;
  let sheet;

  const dirty = () => JSON.stringify(d) !== initial;
  const missing = d.media.map((m) => m.thumb || m.path).filter((p) => !cachedUrl(p));
  if (missing.length) signedUrls(missing).then(() => updateProgress());

  sheet = openSheet({
    title: isNew ? 'Nouveau post' : (existing.status === 'published' ? 'Post publié' : 'Modifier le post'),
    body: '',
    footer: '<span></span>',
    beforeClose: async () => {
      if (uploading) { toast('Envoi en cours… patiente une seconde', 'clock'); return false; }
      if (!dirty()) return true;
      if (!confirm('Fermer sans enregistrer tes modifications ?')) return false;
      if (isNew) removeFiles(uploadedNow);
      return true;
    },
  });

  function render() {
    const P = PLATFORMS[d.platform];
    const video = isVideoFormat(d.format);
    const tags = countTags(d.hashtags);
    const showScript = video || d.script.hook || d.script.shots?.length;
    sheet.setBody(`
      <div class="form-grid">
        <div class="seg full" role="group" aria-label="Réseau">
          ${Object.entries(PLATFORMS).map(([k, v]) => `<button data-platform="${k}" aria-pressed="${d.platform === k}">${icon(k)} ${v.label}</button>`).join('')}
        </div>
        <div class="chips" role="group" aria-label="Format">
          ${P.formats.map(([k, l]) => `<button class="chip" data-format="${k}" aria-pressed="${d.format === k}">${l}</button>`).join('')}
        </div>

        <div class="field">
          <span class="label">${video ? 'Vidéo' : d.format === 'post' ? 'Photo' : 'Photos'}${d.media.length > 1 ? ` · ${d.media.length}` : ''}</span>
          <div class="media-row" id="media-row">${mediaRow()}</div>
          ${video ? `<div class="row small muted">${d.cover_path ? `${icon('check')} Couverture ajoutée · <button class="btn btn-ghost btn-sm" data-cover-rm>Retirer</button>` : `<button class="btn btn-ghost btn-sm" data-cover>${icon('image')} Ajouter une couverture</button>`}</div>` : ''}
          <input type="file" id="f-media" accept="${video ? 'video/*,image/*' : 'image/*,video/*'}" ${video && d.format !== 'story' ? '' : 'multiple'} hidden>
          <input type="file" id="f-cover" accept="image/*" hidden>
        </div>

        <div class="field"><label for="e-title">Titre (pour toi)</label>
          <input class="input" id="e-title" value="${esc(d.title)}" placeholder="Ex. GRWM soirée, Routine du matin…"></div>

        <div class="field"><label for="e-when">Date et heure de publication</label>
          <input class="input" id="e-when" type="datetime-local" value="${toLocalInput(d.scheduled_at)}">
          <div class="chips">${quickDates().map(([l, v]) => `<button class="chip soft" data-when="${v}">${l}</button>`).join('')}${d.scheduled_at ? `<button class="chip soft" data-when="">Sans date</button>` : ''}</div>
        </div>

        <div class="field"><span class="label">Statut</span>
          <div class="chips">${Object.entries(STATUS).map(([k, l]) => `<button class="chip" data-status="${k}" aria-pressed="${d.status === k}">${l}</button>`).join('')}</div>
        </div>

        <div class="field"><label for="e-caption">Légende</label>
          <textarea class="input" id="e-caption" rows="5" placeholder="Accroche en 1re ligne, puis ton texte…">${esc(d.caption)}</textarea>
          <div class="hint"><span>La 1re ligne est la seule visible sans « plus »</span><span id="cap-count" class="${d.caption.length > P.captionMax ? 'over' : ''}">${d.caption.length} / ${P.captionMax}</span></div>
        </div>

        <div class="field"><label for="e-tags">Hashtags</label>
          <textarea class="input" id="e-tags" rows="2" style="min-height:64px" placeholder="#grwm #routine…">${esc(d.hashtags)}</textarea>
          <div class="hint"><span>${P.tagTip}</span><span id="tag-count" class="${tags > P.tagMax ? 'over' : ''}">${tags} / ${P.tagMax}</span></div>
          ${suggestions()}
        </div>

        ${d.platform === 'instagram' ? `<div class="field"><label for="e-fc">Premier commentaire <span class="faint" style="text-transform:none;font-weight:500">(optionnel)</span></label>
          <textarea class="input" id="e-fc" rows="2" style="min-height:64px" placeholder="Question pour lancer les commentaires, lien…">${esc(d.first_comment)}</textarea></div>` : ''}

        <details class="fold" ${showScript ? 'open' : ''}>
          <summary>${icon('script')} Script ${d.script.shots?.length ? `<span class="faint small">· ${d.script.shots.length} plan${d.script.shots.length > 1 ? 's' : ''}</span>` : ''}${icon('down', 'chev')}</summary>
          <div class="fold-b">
            <div class="field"><label for="s-hook">Accroche (3 premières secondes)</label>
              <textarea class="input" id="s-hook" rows="2" style="min-height:64px" placeholder="La phrase ou l’image qui arrête le scroll">${esc(d.script.hook || '')}</textarea></div>
            <div class="field"><span class="label">Plans</span><div class="stack" id="shots">${(d.script.shots || []).map(shotRow).join('')}</div>
              <button class="btn btn-ghost btn-sm" data-add-shot style="justify-self:start">${icon('plus')} Ajouter un plan</button></div>
            <div class="field"><label for="s-cta">Fin / appel à l’action</label>
              <input class="input" id="s-cta" value="${esc(d.script.cta || '')}" placeholder="Abonne-toi pour la partie 2, enregistre…"></div>
            <div class="two">
              <div class="field"><label for="s-sound">Son / musique</label><input class="input" id="s-sound" value="${esc(d.script.sound || '')}" placeholder="Son tendance, voix off…"></div>
              <div class="field"><label for="s-place">Lieu / tenue</label><input class="input" id="s-place" value="${esc(d.script.place || '')}" placeholder="Salle de bain, look beige…"></div>
            </div>
            <div class="field"><label for="s-notes">Notes de tournage</label>
              <textarea class="input" id="s-notes" rows="2" style="min-height:64px">${esc(d.script.notes || '')}</textarea></div>
          </div>
        </details>

        ${d.status === 'published' ? `<details class="fold" open>
          <summary>${icon('chart')} Résultats${icon('down', 'chev')}</summary>
          <div class="fold-b">
            <div class="stat-in">${[['views', 'Vues'], ['likes', 'J’aime'], ['comments', 'Comm.'], ['shares', 'Partages'], ['saves', 'Enreg.']].map(([k, l]) =>
              `<label>${l}<input class="input" inputmode="numeric" data-stat="${k}" value="${d.stats[k] ?? ''}" placeholder="—"></label>`).join('')}</div>
            <div class="field"><label for="e-url">Lien du post</label><input class="input" id="e-url" type="url" value="${esc(d.post_url || '')}" placeholder="https://…"></div>
          </div></details>` : ''}
      </div>`);

    renderFooter();
    bind();
  }

  function renderFooter() {
    sheet.setFooter(`
      ${!isNew ? `<button class="icon-btn" data-del aria-label="Supprimer" title="Supprimer" style="color:var(--danger)">${icon('trash')}</button>
        <button class="icon-btn" data-dup aria-label="Dupliquer vers ${d.platform === 'instagram' ? 'TikTok' : 'Instagram'}" title="Dupliquer vers ${d.platform === 'instagram' ? 'TikTok' : 'Instagram'}">${icon('dup')}</button>` : ''}
      <button class="btn btn-primary btn-lg" data-save ${uploading ? 'disabled' : ''}>${uploading ? '<span class="spinner"></span> Envoi…' : 'Enregistrer'}</button>
      ${!isNew && d.status !== 'published' ? `<button class="btn btn-rose btn-lg" data-post ${uploading ? 'disabled' : ''}>${icon('send')} Poster</button>` : ''}`);
    bindFooter();
  }

  function mediaRow() {
    return d.media.map((m, i) => {
      const src = m._local || cachedUrl(m.thumb) || (m.type === 'image' ? cachedUrl(m.path) : null);
      return `<div class="media-it">
        ${src ? `<img src="${src}" alt="">` : `<div class="prog" style="background:var(--surface-3);color:var(--ink-2)">${icon(m.type === 'video' ? 'video' : 'image')}</div>`}
        ${d.media.length > 1 ? `<span class="n">${i + 1}</span>` : ''}
        ${m.type === 'video' ? `<span class="vid">${icon('play')}</span>` : ''}
        ${m._progress != null ? `<div class="prog">${Math.round(m._progress * 100)} %</div>` : ''}
        ${m._progress == null ? `<button class="x" data-rm="${i}" aria-label="Retirer">${icon('x')}</button>` : ''}
        ${d.media.length > 1 && m._progress == null ? `<div class="mv"><button data-mv="${i}" data-dir="-1" aria-label="Avant" ${i === 0 ? 'style="visibility:hidden"' : ''}>${icon('left')}</button><button data-mv="${i}" data-dir="1" aria-label="Après" ${i === d.media.length - 1 ? 'style="visibility:hidden"' : ''}>${icon('right')}</button></div>` : ''}
      </div>`;
    }).join('') + `<button class="media-add" data-add-media>${icon('plus')}${d.media.length ? 'Ajouter' : isVideoFormat(d.format) ? 'Ajouter la vidéo' : 'Ajouter des photos'}</button>`;
  }

  const shotRow = (s, i) => `<div class="shot"><span class="num">${i + 1}</span>
    <textarea class="input" data-shot="${i}" rows="1" placeholder="Ce qu’on voit / ce que tu dis">${esc(s.text || '')}</textarea>
    <button class="icon-btn" data-rm-shot="${i}" aria-label="Supprimer le plan">${icon('x')}</button></div>`;

  function suggestions() {
    const have = new Set(normalizeTags(d.hashtags).toLowerCase().split(' '));
    const freq = new Map();
    S.posts.filter((p) => p.platform === d.platform && p.id !== d.id).forEach((p) =>
      normalizeTags(p.hashtags).split(' ').filter(Boolean).forEach((t) => freq.set(t.toLowerCase(), (freq.get(t.toLowerCase()) || 0) + 1)));
    const top = [...freq.entries()].filter(([t]) => !have.has(t)).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return top.length ? `<div class="tagcloud" aria-label="Hashtags déjà utilisés">${top.map(([t]) => `<button type="button" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '';
  }

  function quickDates() {
    const at = (days, h) => { const x = new Date(); x.setDate(x.getDate() + days); x.setHours(h, 0, 0, 0); return x; };
    const out = [];
    const now = new Date();
    if (now.getHours() < 12) out.push(["Aujourd'hui 12h", at(0, 12)]);
    if (now.getHours() < 18) out.push(["Aujourd'hui 18h", at(0, 18)]);
    out.push(['Demain 12h', at(1, 12)], ['Demain 18h', at(1, 18)], ['Demain 20h', at(1, 20)]);
    return out.map(([l, v]) => [l, v.toISOString()]);
  }

  // ─── Événements ───
  function bind() {
    const $ = (s) => sheet.el.querySelector(s);
    const $$ = (s) => sheet.el.querySelectorAll(s);
    const P = PLATFORMS[d.platform];

    $$('[data-platform]').forEach((b) => b.addEventListener('click', () => {
      if (d.platform === b.dataset.platform) return;
      d.platform = b.dataset.platform;
      d.format = PLATFORMS[d.platform].formats.find(([k]) => isVideoFormat(k) === isVideoFormat(d.format))?.[0] || PLATFORMS[d.platform].formats[0][0];
      render();
    }));
    $$('[data-format]').forEach((b) => b.addEventListener('click', () => { d.format = b.dataset.format; render(); }));
    $$('[data-status]').forEach((b) => b.addEventListener('click', () => {
      d.status = b.dataset.status;
      if (d.status === 'published' && !d.published_at) d.published_at = new Date().toISOString();
      if (d.status !== 'published') d.published_at = null;
      render();
    }));
    $$('[data-when]').forEach((b) => b.addEventListener('click', () => {
      d.scheduled_at = b.dataset.when || null;
      if (d.scheduled_at && d.status === 'idea') d.status = 'draft';
      render();
    }));
    $('#e-when').addEventListener('change', (e) => { d.scheduled_at = e.target.value ? new Date(e.target.value).toISOString() : null; });
    $('#e-title').addEventListener('input', (e) => (d.title = e.target.value));
    $('#e-caption').addEventListener('input', (e) => {
      d.caption = e.target.value;
      const c = $('#cap-count'); c.textContent = `${d.caption.length} / ${P.captionMax}`; c.classList.toggle('over', d.caption.length > P.captionMax);
    });
    $('#e-tags').addEventListener('input', (e) => {
      d.hashtags = e.target.value;
      const n = countTags(d.hashtags), c = $('#tag-count'); c.textContent = `${n} / ${P.tagMax}`; c.classList.toggle('over', n > P.tagMax);
    });
    $$('[data-tag]').forEach((b) => b.addEventListener('click', () => {
      d.hashtags = (d.hashtags.trim() + ' ' + b.dataset.tag).trim();
      $('#e-tags').value = d.hashtags; b.remove();
      $('#e-tags').dispatchEvent(new Event('input'));
    }));
    $('#e-fc')?.addEventListener('input', (e) => (d.first_comment = e.target.value));
    $('#e-url')?.addEventListener('input', (e) => (d.post_url = e.target.value.trim()));
    $$('[data-stat]').forEach((i) => i.addEventListener('input', () => {
      const v = i.value.replace(/[^\d]/g, ''); i.value = v;
      if (v === '') delete d.stats[i.dataset.stat]; else d.stats[i.dataset.stat] = Number(v);
    }));

    // script
    const sc = { '#s-hook': 'hook', '#s-cta': 'cta', '#s-sound': 'sound', '#s-place': 'place', '#s-notes': 'notes' };
    Object.entries(sc).forEach(([sel, k]) => $(sel)?.addEventListener('input', (e) => { d.script[k] = e.target.value; }));
    $$('[data-shot]').forEach((t) => t.addEventListener('input', () => { d.script.shots[t.dataset.shot].text = t.value; }));
    $$('[data-rm-shot]').forEach((b) => b.addEventListener('click', () => { d.script.shots.splice(+b.dataset.rmShot, 1); render(); }));
    $('[data-add-shot]')?.addEventListener('click', () => {
      d.script.shots ||= []; d.script.shots.push({ text: '' }); render();
      const all = sheet.el.querySelectorAll('[data-shot]'); all[all.length - 1]?.focus();
    });

    bindMedia();
    $('#f-media').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
    $('[data-cover]')?.addEventListener('click', () => $('#f-cover').click());
    $('#f-cover')?.addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      uploading++; render();
      try {
        const t = await makeThumb(f);
        const path = `${S.user.id}/${d.id}/cover-${Date.now()}.jpg`;
        await uploadFile(path, t?.blob || f);
        uploadedNow.push(path);
        if (d.cover_path) removed.push(d.cover_path);
        d.cover_path = path;
        await signedUrls([path]);
      } catch (err) { toast(err.message, 'alert'); }
      uploading--; render();
    });
    $('[data-cover-rm]')?.addEventListener('click', () => { removed.push(d.cover_path); d.cover_path = null; render(); });

  }

  function bindMedia() {
    const $ = (s) => sheet.el.querySelector(s);
    const $$ = (s) => sheet.el.querySelectorAll(s);
    $('[data-add-media]')?.addEventListener('click', () => $('#f-media').click());
    $$('[data-rm]').forEach((b) => b.addEventListener('click', () => {
      const [m] = d.media.splice(+b.dataset.rm, 1);
      removed.push(m.path, m.thumb);
      render();
    }));
    $$('[data-mv]').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.mv, j = i + +b.dataset.dir;
      [d.media[i], d.media[j]] = [d.media[j], d.media[i]];
      render();
    }));
  }

  function bindFooter() {
    const $ = (s) => sheet.el.querySelector(s);
    $('[data-save]').addEventListener('click', () => save());
    $('[data-post]')?.addEventListener('click', async () => { const p = await save(true); if (p) openPoster(p); });
    $('[data-del]')?.addEventListener('click', async () => {
      if (!confirm('Supprimer ce post et ses médias ? C’est définitif.')) return;
      try { await deletePost(existing); removeFiles(uploadedNow); sheet.close(true); toast('Post supprimé', 'trash'); } catch (e) { toast(e.message, 'alert'); }
    });
    $('[data-dup]')?.addEventListener('click', async () => {
      const to = d.platform === 'instagram' ? 'tiktok' : 'instagram';
      const copy = structuredClone(d);
      Object.assign(copy, {
        id: newId(), platform: to, status: d.status === 'published' ? 'ready' : d.status, published_at: null, post_url: '', stats: {}, notified_at: null,
        format: PLATFORMS[to].formats.find(([k]) => isVideoFormat(k) === isVideoFormat(d.format))?.[0] || PLATFORMS[to].formats[0][0],
      });
      // Les fichiers sont partagés : on les recopie pour que chaque post reste indépendant.
      try {
        const { sb } = await import('../store.js');
        for (const m of copy.media) {
          for (const key of ['path', 'thumb']) {
            if (!m[key]) continue;
            const np = m[key].replace(d.id, copy.id);
            await sb.storage.from('vs-media').copy(m[key], np);
            m[key] = np;
          }
        }
        if (copy.cover_path) { const np = copy.cover_path.replace(d.id, copy.id); await sb.storage.from('vs-media').copy(copy.cover_path, np); copy.cover_path = np; }
        const saved = await savePost(copy);
        sheet.close(true);
        toast(`Copié vers ${PLATFORMS[to].label}`, 'dup');
        openEditor(saved);
      } catch (e) { toast(e.message, 'alert'); }
    });
  }

  async function addFiles(files) {
    if (!files.length) return;
    if (isVideoFormat(d.format) && d.format !== 'story') {
      const vids = files.filter((f) => f.type.startsWith('video/'));
      if (vids.length && d.media.some((m) => m.type === 'video')) { d.media.filter((m) => m.type === 'video').forEach((m) => removed.push(m.path, m.thumb)); d.media = d.media.filter((m) => m.type !== 'video'); }
    }
    const items = files.map((f) => ({ type: f.type.startsWith('video/') ? 'video' : 'image', name: f.name, size: f.size, mime: f.type, _progress: 0, _file: f }));
    d.media.push(...items);
    uploading += items.length;
    updateProgress(); renderFooter();
    for (const m of items) {
      const f = m._file;
      try {
        const t = await makeThumb(f);
        if (t) { m._local = URL.createObjectURL(t.blob); m.w = t.w; m.h = t.h; if (t.dur) m.dur = Math.round(t.dur); }
        updateProgress();
        const ext = (f.name.split('.').pop() || (m.type === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
        const base = `${S.user.id}/${d.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (t) { m.thumb = `${base}-thumb.jpg`; await uploadFile(m.thumb, t.blob); uploadedNow.push(m.thumb); }
        m.path = `${base}.${ext}`;
        await uploadFile(m.path, f, (x) => { m._progress = x; updateProgress(); });
        uploadedNow.push(m.path);
        await signedUrls([m.thumb || m.path]);
      } catch (e) {
        toast(`${f.name} : ${e.message}`, 'alert');
        d.media.splice(d.media.indexOf(m), 1);
      }
      delete m._progress; delete m._file;
      uploading--;
      updateProgress(); renderFooter();
    }
  }

  let raf;
  function updateProgress() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const row = sheet.el.querySelector('#media-row'); if (row) row.innerHTML = mediaRow(); bindMedia(); });
  }

  async function save(keepOpen) {
    if (uploading) return toast('Attends la fin de l’envoi', 'clock');
    const btn = sheet.el.querySelector('[data-save]');
    btn.disabled = true;
    if (d.script.shots) d.script.shots = d.script.shots.filter((s) => s.text?.trim());
    const row = { ...d, media: d.media.map(({ _local, _progress, _file, ...m }) => m) };
    if (!row.title.trim() && row.caption) row.title = row.caption.split('\n')[0].slice(0, 60);
    if (row.status === 'idea' && row.media.length && row.scheduled_at) row.status = 'draft';
    try {
      const saved = await savePost(row);
      const gone = removed.filter(Boolean).filter((p) => !JSON.stringify(saved).includes(p));
      removeFiles(gone);
      sheet.close(true);
      if (!keepOpen) toast(isNew ? (saved.scheduled_at ? 'Post programmé ✨' : 'Post enregistré') : 'Modifications enregistrées');
      return saved;
    } catch (e) {
      toast(e.message, 'alert');
      btn.disabled = false;
    }
  }

  render();
}
