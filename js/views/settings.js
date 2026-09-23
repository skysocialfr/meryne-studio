// ═══ Réglages : profil, rappels, thème ═══
import { S, sb, saveProfile, uploadFile, makeThumb, signedUrls, cachedUrl, pushSupported, currentPushSub, enablePush, disablePush } from '../store.js';
import { icon, esc, openSheet, toast, isIOS, isStandalone } from '../ui.js';

export function openSettings() {
  const pr = { ...S.profile };
  const sheet = openSheet({
    title: 'Réglages', body: '',
    footer: `<button class="btn btn-primary btn-lg" data-save>Enregistrer</button>`,
  });
  render();

  async function render() {
    const avatar = pr.avatar_path ? cachedUrl(pr.avatar_path) : null;
    const theme = document.documentElement.dataset.theme || 'auto';
    sheet.setBody(`
      <div class="form-grid">
        <section class="stack">
          <h3 class="label">Profil</h3>
          <div class="row">
            <button class="avatar" data-avatar aria-label="Changer la photo de profil" style="width:72px;height:72px"><div>${avatar ? `<img src="${avatar}" alt="">` : icon('image')}</div></button>
            <div class="field grow"><label for="st-name">Prénom / nom affiché</label><input class="input" id="st-name" value="${esc(pr.display_name)}" placeholder="Meryne"></div>
          </div>
          <input type="file" id="st-av" accept="image/*" hidden>
          <div class="two">
            <div class="field"><label for="st-ig">Instagram</label><input class="input" id="st-ig" value="${esc(pr.ig_handle)}" placeholder="@toncompte" autocapitalize="off"></div>
            <div class="field"><label for="st-tt">TikTok</label><input class="input" id="st-tt" value="${esc(pr.tt_handle)}" placeholder="@toncompte" autocapitalize="off"></div>
          </div>
          <div class="field"><label for="st-igbio">Bio Instagram (pour l’aperçu)</label><textarea class="input" id="st-igbio" rows="2" style="min-height:64px">${esc(pr.ig_bio)}</textarea></div>
          <div class="field"><label for="st-ttbio">Bio TikTok</label><textarea class="input" id="st-ttbio" rows="2" style="min-height:64px">${esc(pr.tt_bio)}</textarea></div>
        </section>

        <section class="stack">
          <h3 class="label">Rappels « C’est l’heure de poster »</h3>
          <div class="card stack" id="push-box"><span class="small muted">Vérification…</span></div>
          <div class="field"><label for="st-rem">Me prévenir</label>
            <select class="input" id="st-rem">
              ${[[0, 'À l’heure prévue'], [5, '5 min avant'], [15, '15 min avant'], [30, '30 min avant'], [60, '1 h avant']].map(([v, l]) => `<option value="${v}" ${+pr.reminder_minutes === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select></div>
        </section>

        <section class="stack">
          <h3 class="label">Apparence</h3>
          <div class="seg full" role="group" aria-label="Thème">
            ${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button data-theme="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}
          </div>
        </section>

        <section class="stack">
          <p class="small faint">Connectée : ${esc(S.user.email)}</p>
          <button class="btn btn-ghost" data-logout style="justify-self:start">${icon('logout')} Se déconnecter</button>
        </section>
      </div>`);
    bind();
    renderPush();
  }

  async function renderPush() {
    const box = sheet.el.querySelector('#push-box');
    if (!box) return;
    if (!pushSupported()) {
      box.innerHTML = isIOS() && !isStandalone()
        ? `<strong>Installe d’abord l’app</strong><p class="small muted">Sur iPhone, les notifications marchent uniquement depuis l’icône sur l’écran d’accueil :<br>1. Touche ${icon('share')} <b>Partager</b> en bas de Safari<br>2. Choisis <b>« Sur l’écran d’accueil »</b><br>3. Ouvre Veyra depuis l’icône et reviens ici.</p>`
        : `<strong>Notifications indisponibles</strong><p class="small muted">Ce navigateur ne gère pas les notifications. Essaie Chrome, Safari ou Edge à jour.</p>`;
      return;
    }
    const sub = await currentPushSub();
    const blocked = Notification.permission === 'denied';
    box.innerHTML = sub
      ? `<div class="row"><span class="badge st-ready">Activés sur cet appareil</span></div>
         <div class="row wrap"><button class="btn btn-sm" data-test>${icon('bell')} Tester</button><button class="btn btn-sm btn-ghost" data-off>Désactiver ici</button></div>
         <p class="small faint">Active-les aussi sur ton ordi ou ta tablette si tu veux y être prévenue.</p>`
      : blocked
        ? `<strong>Notifications bloquées</strong><p class="small muted">Autorise-les dans les réglages du navigateur / du téléphone pour Veyra, puis reviens ici.</p>`
        : `<p class="small muted">Reçois une notif sur cet appareil quand un post doit partir, même app fermée.</p><button class="btn btn-rose" data-on>${icon('bell')} Activer les rappels</button>`;
    box.querySelector('[data-on]')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try { await enablePush(); toast('Rappels activés 🔔'); } catch (err) { toast(err.message, 'alert'); }
      renderPush();
    });
    box.querySelector('[data-off]')?.addEventListener('click', async () => { await disablePush(); toast('Rappels désactivés sur cet appareil'); renderPush(); });
    box.querySelector('[data-test]')?.addEventListener('click', async () => {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('C’est l’heure de poster ✨', { body: 'Ceci est un test : tes rappels fonctionnent.', icon: '/icon-192.png', badge: '/favicon-32x32.png', tag: 'test' });
    });
  }

  function bind() {
    const $ = (s) => sheet.el.querySelector(s);
    const link = { '#st-name': 'display_name', '#st-ig': 'ig_handle', '#st-tt': 'tt_handle', '#st-igbio': 'ig_bio', '#st-ttbio': 'tt_bio' };
    Object.entries(link).forEach(([sel, k]) => $(sel).addEventListener('input', (e) => (pr[k] = e.target.value)));
    $('#st-rem').addEventListener('change', (e) => (pr.reminder_minutes = +e.target.value));
    $('[data-avatar]').addEventListener('click', () => $('#st-av').click());
    $('#st-av').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const t = await makeThumb(f);
        const path = `${S.user.id}/profile/avatar-${Date.now()}.jpg`;
        await uploadFile(path, t?.blob || f);
        await signedUrls([path]);
        pr.avatar_path = path;
        render();
      } catch (err) { toast(err.message, 'alert'); }
    });
    sheet.el.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.theme;
      try { t === 'auto' ? localStorage.removeItem('vs-theme') : localStorage.setItem('vs-theme', t); } catch {}
      if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
      sheet.el.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    }));
    $('[data-logout]').addEventListener('click', async () => { sheet.close(true); await sb.auth.signOut(); });
    sheet.el.querySelector('[data-save]').onclick = async () => {
      try {
        ['ig_handle', 'tt_handle'].forEach((k) => { pr[k] = (pr[k] || '').trim().replace(/^@?/, pr[k]?.trim() ? '@' : ''); });
        await saveProfile(pr);
        sheet.close(true);
        toast('Réglages enregistrés');
      } catch (err) { toast(err.message, 'alert'); }
    };
  }
}
