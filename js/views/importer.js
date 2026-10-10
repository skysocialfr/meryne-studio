// ═══ Import Excel : la feuille « Posts » devient des posts programmés ═══
// Une ligne = un post par plateforme. Clé : id de la ligne + plateforme (script.import_key),
// donc réimporter le même fichier met à jour au lieu de dupliquer.
// Ne touche jamais aux médias, stats, lien ni au statut « Publié », et ne publie rien.
import { S, savePost, newId } from '../store.js';
import { icon, esc, openSheet, toast } from '../ui.js';

const SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const SLOT_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', stories: 'Story Instagram' };
// Statut détaillé du fichier → statut de l'app
const STAGE = {
  'idee': 'idea', 'a ecrire': 'draft', 'a tourner': 'draft', 'tourne': 'draft', 'en montage': 'draft',
  'pret': 'ready', 'programme': 'ready', 'publie': 'ready',
};

export function openImporter() {
  let plan = null, busy = false;
  const sheet = openSheet({
    title: 'Importer depuis Excel', body: '', footer: '<span></span>',
    beforeClose: async () => !busy,
  });
  renderPick();

  function renderPick(err = '') {
    sheet.setBody(`
      <div class="form-grid">
        <p class="small muted">Choisis ton fichier <b>Veyra_import_posts</b> (onglet « Posts »). Tu verras un aperçu avant que quoi que ce soit soit enregistré.<br>
        Réimporter le même fichier met à jour les posts existants (même <b>id</b>), sans doublon. Rien n’est publié sur Instagram ou TikTok.</p>
        <button class="btn btn-lg" data-pick>${icon('download')} Choisir un fichier .xlsx</button>
        <input type="file" id="imp-file" accept=".xlsx,.xls" hidden>
        ${err ? `<p class="small" style="color:var(--danger)">${icon('alert')} ${esc(err)}</p>` : ''}
      </div>`);
    sheet.setFooter('<span></span>');
    sheet.el.querySelector('[data-pick]').addEventListener('click', () => sheet.el.querySelector('#imp-file').click());
    sheet.el.querySelector('#imp-file').addEventListener('change', (e) => e.target.files[0] && read(e.target.files[0]));
  }

  async function read(file) {
    sheet.setBody(`<p class="small muted"><span class="spinner"></span> Lecture de ${esc(file.name)}…</p>`);
    try {
      const XLSX = await loadSheetJS();
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
      plan = planImport(readRows(XLSX, wb), S.posts);
      plan.fileName = file.name;
      renderPreview();
    } catch (e) { renderPick(e.message || String(e)); }
  }

  function renderPreview() {
    const c = { new: 0, upd: 0, same: 0, skip: 0 };
    plan.items.forEach((it) => { if (it.kind === 'skip') c.skip++; else it.ops.forEach((o) => c[o.kind]++); });
    const chip = { new: ['st-ready', 'Nouveau'], upd: ['st-idea', 'Mis à jour'], same: ['st-draft', 'Inchangé'], skip: ['st-late', 'Ignorée'] };
    const rows = plan.items.map((it) => {
      const k = it.kind === 'skip' ? 'skip' : it.ops.some((o) => o.kind === 'new') ? 'new' : it.ops.some((o) => o.kind === 'upd') ? 'upd' : 'same';
      const sub = it.kind === 'skip' ? it.reason
        : [it.when ? it.when.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sans date',
          it.ops.map((o) => SLOT_LABEL[o.slot]).join(' + ')].join(' · ');
      return `<div class="row" style="align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)">
        <span class="badge ${chip[k][0]}" style="flex-shrink:0">${chip[k][1]}</span>
        <div class="grow" style="min-width:0"><b>${esc(it.id || '—')}</b> ${esc(it.title || '')}
          <div class="small muted">Ligne ${it.line} · ${esc(sub)}</div>
          ${it.warns.length ? `<div class="small" style="color:var(--danger)">${esc(it.warns.join(' · '))}</div>` : ''}</div></div>`;
    }).join('');
    const total = c.new + c.upd;
    sheet.setBody(`
      <div class="stack">
        <p class="small muted">${esc(plan.fileName)} · ${plan.items.length} ligne${plan.items.length > 1 ? 's' : ''}${plan.examples ? ` · ${plan.examples} ligne d’exemple ignorée` : ''}</p>
        <div class="row wrap" style="gap:6px">
          <span class="badge st-ready">${c.new} nouveau${c.new > 1 ? 'x' : ''}</span>
          <span class="badge st-idea">${c.upd} mis à jour</span>
          <span class="badge st-draft">${c.same} inchangé${c.same > 1 ? 's' : ''}</span>
          ${c.skip ? `<span class="badge st-late">${c.skip} ligne${c.skip > 1 ? 's' : ''} ignorée${c.skip > 1 ? 's' : ''}</span>` : ''}
        </div>
        <div>${rows || '<p class="small muted">Aucune ligne trouvée.</p>'}</div>
      </div>`);
    sheet.setFooter(`<button class="btn btn-ghost btn-lg" data-back>Autre fichier</button>
      <button class="btn btn-rose btn-lg" data-go ${total ? '' : 'disabled'}>${total ? `Importer ${total} post${total > 1 ? 's' : ''}` : 'Rien à importer'}</button>`);
    sheet.el.querySelector('[data-back]').addEventListener('click', () => renderPick());
    sheet.el.querySelector('[data-go]').addEventListener('click', apply);
  }

  async function apply() {
    // Recalcule sur l'état le plus récent avant d'écrire.
    const fresh = planImport(plan.rows, S.posts);
    const ops = fresh.items.flatMap((it) => it.ops || []).filter((o) => o.kind !== 'same');
    busy = true;
    const btn = sheet.el.querySelector('[data-go]');
    let done = 0;
    try {
      for (const o of ops) {
        btn.innerHTML = `<span class="spinner"></span> ${++done} / ${ops.length}`;
        btn.disabled = true;
        await savePost(o.row);
      }
      busy = false;
      sheet.close(true);
      toast(`${ops.length} post${ops.length > 1 ? 's' : ''} importé${ops.length > 1 ? 's' : ''} ✨`);
    } catch (e) {
      busy = false;
      toast(`Arrêt après ${done - 1} post(s) : ${e.message}`, 'alert');
      const fileName = plan.fileName;
      plan = planImport(plan.rows, S.posts); plan.fileName = fileName;
      renderPreview();
    }
  }
}

function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SHEETJS;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('Impossible de charger le lecteur Excel. Vérifie ta connexion.'));
    document.head.appendChild(s);
  });
}

const norm = (v) => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const key = (v) => norm(v).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const str = (v) => (v == null ? '' : String(v).replace(/\r\n?/g, '\n').trim());

function readRows(XLSX, wb) {
  const name = wb.SheetNames.find((n) => key(n) === 'posts')
    || wb.SheetNames.find((n) => (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] || []).some((c) => key(c) === 'id'));
  if (!name) throw new Error('Onglet « Posts » introuvable dans ce fichier.');
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: false });
  const hi = aoa.findIndex((r) => r.some((c) => key(c) === 'id'));
  if (hi < 0) throw new Error('Colonne « id » introuvable.');
  const heads = aoa[hi].map(key);
  return aoa.slice(hi + 1).map((r, i) => {
    const o = { _line: hi + i + 2 };
    heads.forEach((h, j) => { if (h) o[h] = r[j]; });
    return o;
  });
}

// Date + heure Excel (nombre ou texte) → Date locale
function parseWhen(dv, hv, warns) {
  let d = null;
  if (typeof dv === 'number') {
    const x = new Date(Date.UTC(1899, 11, 30) + Math.round(dv) * 86_400_000);
    d = [x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()];
  } else if (str(dv)) {
    const s = str(dv); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) d = [+m[1], +m[2] - 1, +m[3]];
    else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/))) d = [m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear(), +m[2] - 1, +m[1]];
    if (d) { const t = new Date(d[0], d[1], d[2]); if (t.getMonth() !== d[1]) d = null; }
    if (!d) warns.push(`date illisible « ${s} »`);
  }
  if (!d) return null;
  let h = 18, mi = 0;
  if (typeof hv === 'number') { const t = Math.round((hv % 1) * 1440); h = Math.floor(t / 60) % 24; mi = t % 60; }
  else if (str(hv)) {
    const m = norm(hv).match(/^(\d{1,2})\s*(?:h|:)\s*(\d{2})?/);
    if (m && +m[1] < 24 && (!m[2] || +m[2] < 60)) { h = +m[1]; mi = m[2] ? +m[2] : 0; }
    else warns.push(`heure illisible « ${str(hv)} », 18h00 utilisé`);
  }
  return new Date(d[0], d[1], d[2], h, mi);
}

function parseSlots(v, warns) {
  const out = [], bad = [];
  str(v).split(/[,;+/&\n]|\bet\b/i).forEach((t) => {
    const k = key(t); if (!k) return;
    const s = /stor/.test(k) ? 'stories' : /insta|^ig$/.test(k) ? 'instagram' : /tik|^tt$/.test(k) ? 'tiktok' : null;
    if (s) { if (!out.includes(s)) out.push(s); } else bad.push(str(t));
  });
  if (bad.length) warns.push(`plateforme inconnue : ${bad.join(', ')}`);
  return out;
}

// Format libre du fichier → format de l'app, selon la plateforme
function formatFor(slot, f) {
  const k = norm(f);
  if (slot === 'stories') return 'story';
  const photos = /carrousel|carousel|photo/.test(k);
  if (slot === 'tiktok') return photos ? 'photos' : 'video';
  if (/story/.test(k)) return 'story';
  if (/carrousel|carousel/.test(k)) return 'carousel';
  if (/photo|post/.test(k)) return 'post';
  return 'reel';
}

const shotsOf = (v) => str(v).split('\n')
  .map((l) => l.replace(/^\s*(?:plan\s*)?(?:\d+\s*[.)\-:]|[-•*–])\s*/i, '').trim()).filter(Boolean)
  .map((text) => ({ text }));

export function planImport(rows, posts) {
  const seen = {}, items = [];
  let examples = 0;
  for (const r of rows) {
    if (!Object.keys(r).some((k) => k !== '_line' && str(r[k]))) continue;
    const id = str(r.id), warns = [];
    const it = { line: r._line, id, title: str(r.titre) || str(r.hook), warns, ops: [] };
    if (/^exemple/i.test(id)) { examples++; continue; }
    if (!id) { items.push({ ...it, kind: 'skip', reason: 'id manquant' }); continue; }
    if (seen[id]) { items.push({ ...it, kind: 'skip', reason: `id en double (déjà ligne ${seen[id]})` }); continue; }
    seen[id] = r._line;
    const slots = parseSlots(r.plateformes, warns);
    if (!slots.length) { items.push({ ...it, kind: 'skip', reason: 'aucune plateforme (Instagram, TikTok ou Stories)' }); continue; }
    it.when = parseWhen(r.date, r.heure, warns);
    const stage = str(r.statut);
    const status = stage ? STAGE[norm(stage)] : 'idea';
    if (stage && !status) warns.push(`statut inconnu « ${stage} »`);

    for (const slot of slots) {
      const importKey = `${id}:${slot}`;
      const old = posts.find((p) => p.script?.import_key === importKey);
      const platform = slot === 'tiktok' ? 'tiktok' : 'instagram';
      const row = structuredClone(old || {
        id: newId(), platform, format: formatFor(slot, r.format), title: '', caption: '', hashtags: '', first_comment: '',
        script: {}, media: [], cover_path: null, scheduled_at: null, status: 'idea', stats: {}, post_url: '',
      });
      row.script ||= {};
      // Une cellule vide ne remplace jamais ce qui existe déjà.
      const set = (obj, k, v) => { if (v) obj[k] = v; };
      set(row, 'title', str(r.titre) || (!old && (str(r.hook) || id)));
      set(row, 'caption', str(r.legende));
      set(row, 'hashtags', str(r.hashtags));
      if (str(r.format)) row.format = formatFor(slot, r.format);
      if (it.when) row.scheduled_at = it.when.toISOString();
      if (status && row.status !== 'published') row.status = status;
      Object.assign(row.script, { import_key: importKey });
      set(row.script, 'hook', str(r.hook));
      set(row.script, 'narration', str(r.script_narrateur));
      set(row.script, 'lines', str(r.repliques_mey));
      set(row.script, 'sound', str(r.musique));
      set(row.script, 'notes', str(r.notes));
      set(row.script, 'pillar', str(r.pilier));
      set(row.script, 'stage', stage);
      set(row.script, 'format_label', str(r.format));
      const shots = shotsOf(r.plans_a_tourner);
      if (shots.length) row.script.shots = shots;
      const kind = !old ? 'new' : JSON.stringify(strip(row)) !== JSON.stringify(strip(old)) ? 'upd' : 'same';
      it.ops.push({ slot, kind, row: strip(row) });
    }
    if (!it.when) warns.push('sans date');
    items.push(it);
  }
  return { items, rows, examples };
}
// Champs gérés par la base, jamais renvoyés
function strip(p) {
  const { created_at, updated_at, notified_at, user_id, ...rest } = p;
  return rest;
}
