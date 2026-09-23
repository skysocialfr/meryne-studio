// ═══ Mode « Poster maintenant » : enregistrer, copier, ouvrir l'app, c'est posté ═══
import { patchPost, fetchMediaFiles, signedUrls, cachedUrl } from '../store.js';
import { icon, esc, openSheet, toast, copyText, fullCaption, PLATFORMS, FORMAT_LABEL, isMobile, fmtWhen } from '../ui.js';
import { openEditor } from './editor.js';

export async function openPoster(post) {
  const P = PLATFORMS[post.platform];
  const done = new Set();
  let files = null, fileErr = null, progress = 0;
  const caption = fullCaption(post);

  const sheet = openSheet({ title: `Poster sur ${P.label}`, body: '' });
  await signedUrls(post.media.map((m) => m.path));
  render();

  // Prépare les fichiers tout de suite : le bouton « Enregistrer » est alors instantané
  // (sur iPhone, le partage doit suivre immédiatement le toucher).
  if (post.media.length) {
    fetchMediaFiles(post, (x) => { progress = x; renderStep1(); })
      .then((f) => { files = f; renderStep1(); })
      .catch((e) => { fileErr = e.message; renderStep1(); });
  }

  function render() {
    sheet.setBody(`
      <div class="poster">
        <div>
          ${post.media.length ? `<div class="carousel">${post.media.map((m) => m.type === 'video'
            ? `<video src="${cachedUrl(m.path)}" controls playsinline preload="metadata"></video>`
            : `<img src="${cachedUrl(m.path)}" alt="">`).join('')}</div>
          ${post.media.length > 1 ? `<p class="carousel-count">${post.media.length} médias · fais glisser →</p>` : ''}`
          : `<div class="empty">Pas de média dans ce post.</div>`}
          <p class="small faint" style="margin-top:10px;text-align:center">${FORMAT_LABEL[post.format]} · prévu ${fmtWhen(post.scheduled_at).toLowerCase()}</p>
        </div>
        <div class="steps">
          <div class="step" id="st1"></div>
          <div class="step ${done.has(2) ? 'done' : ''}">
            <span class="k">${done.has(2) ? icon('check') : 2}</span>
            <div><h3>Copier la légende</h3>
              ${caption ? `<div class="pre">${esc(caption)}</div>
              <button class="btn btn-primary btn-block" data-copy>${icon('copy')} Copier légende + hashtags</button>` : `<p>Pas de légende. <button class="btn btn-ghost btn-sm" data-edit>Ajouter</button></p>`}
            </div>
          </div>
          ${post.first_comment ? `<div class="step ${done.has(3) ? 'done' : ''}">
            <span class="k">${done.has(3) ? icon('check') : 3}</span>
            <div><h3>Premier commentaire</h3><p>À coller en commentaire juste après la publication.</p>
              <div class="pre">${esc(post.first_comment)}</div>
              <button class="btn btn-block" data-copy-fc>${icon('copy')} Copier le commentaire</button></div>
          </div>` : ''}
          <div class="step">
            <span class="k">${post.first_comment ? 4 : 3}</span>
            <div><h3>Ouvrir ${P.label}</h3><p>Choisis ${post.media.length > 1 ? 'les médias' : 'le média'} dans ta galerie et colle la légende.</p>
              <a class="btn btn-block" href="${P.url}" target="_blank" rel="noopener">${icon(post.platform)} Ouvrir ${P.label} ${icon('external')}</a></div>
          </div>
          <button class="btn btn-rose btn-lg btn-block" data-done>${icon('check')} C’est posté !</button>
          <button class="btn btn-ghost btn-sm" data-edit>Modifier le post</button>
        </div>
      </div>`);
    renderStep1();
    const $ = (s) => sheet.el.querySelector(s);
    $('[data-copy]')?.addEventListener('click', async (e) => { if (await copyText(caption)) { done.add(2); toast('Légende copiée'); tick(e.currentTarget); } });
    $('[data-copy-fc]')?.addEventListener('click', async (e) => { if (await copyText(post.first_comment)) { done.add(3); toast('Commentaire copié'); tick(e.currentTarget); } });
    sheet.el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { sheet.close(true); openEditor(post); }));
    $('[data-done]').addEventListener('click', markDone);
  }

  function tick(btn) {
    const st = btn.closest('.step');
    st.classList.add('done');
    st.querySelector('.k').innerHTML = icon('check');
  }

  function renderStep1() {
    const el = sheet.el.querySelector('#st1');
    if (!el) return;
    const n = post.media.length;
    const canShare = files && navigator.canShare?.({ files });
    const ready = !!files;
    el.className = `step ${done.has(1) ? 'done' : ''}`;
    el.innerHTML = `<span class="k">${done.has(1) ? icon('check') : 1}</span>
      <div><h3>${isMobile() ? 'Enregistrer sur le téléphone' : 'Télécharger'} ${n > 1 ? `les ${n} médias` : n ? 'le média' : ''}</h3>
        <p>${!n ? 'Aucun média à enregistrer.' : fileErr ? `Erreur : ${esc(fileErr)}` : !ready ? `Préparation… ${Math.round(progress * 100)} %`
          : canShare && isMobile() ? `Choisis « Enregistrer ${n > 1 ? 'les images' : post.media[0].type === 'video' ? 'la vidéo' : 'l’image'} », ou envoie directement à ${PLATFORMS[post.platform].label}.` : 'Qualité originale, dans l’ordre du carrousel.'}</p>
        ${n ? `<div class="row wrap">
          <button class="btn btn-primary grow" data-save-media ${ready ? '' : 'disabled'}>${ready ? icon(canShare && isMobile() ? 'share' : 'download') : '<span class="spinner"></span>'} ${canShare && isMobile() ? 'Enregistrer / partager' : 'Télécharger'}</button>
          ${canShare && isMobile() ? `<button class="btn btn-sm btn-ghost" data-dl>${icon('download')} Fichier</button>` : ''}
        </div>` : ''}
      </div>`;
    el.querySelector('[data-save-media]')?.addEventListener('click', saveMedia);
    el.querySelector('[data-dl]')?.addEventListener('click', () => downloadAll());
  }

  async function saveMedia() {
    if (!files) return;
    if (isMobile() && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        done.add(1); renderStep1();
      } catch (e) {
        if (e.name !== 'AbortError') { toast('Partage impossible, téléchargement à la place', 'alert'); downloadAll(); }
      }
      return;
    }
    downloadAll();
  }

  function downloadAll() {
    files.forEach((f, i) => setTimeout(() => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }, i * 400));
    done.add(1); renderStep1();
    toast(files.length > 1 ? `${files.length} fichiers téléchargés` : 'Fichier téléchargé', 'download');
  }

  function markDone(e) {
    const btn = e.currentTarget;
    const box = document.createElement('div');
    box.className = 'step done';
    box.innerHTML = `<span class="k">${icon('check')}</span><div class="stack">
      <h3>Bravo ! 🎉</h3>
      <div class="field"><label for="p-url">Lien du post <span class="faint" style="text-transform:none;font-weight:500">(optionnel)</span></label>
        <input class="input" id="p-url" type="url" placeholder="https://…" autocomplete="off"></div>
      <button class="btn btn-rose btn-lg btn-block" data-confirm>Marquer comme publié</button></div>`;
    btn.replaceWith(box);
    box.querySelector('[data-confirm]').addEventListener('click', async (ev) => {
      ev.currentTarget.disabled = true;
      try {
        await patchPost(post.id, { status: 'published', published_at: new Date().toISOString(), post_url: box.querySelector('#p-url').value.trim() || null });
        sheet.close(true);
        toast('Posté ! Pense à noter les vues demain 📈', 'sparkle');
      } catch (err) { toast(err.message, 'alert'); ev.currentTarget.disabled = false; }
    });
  }
}
