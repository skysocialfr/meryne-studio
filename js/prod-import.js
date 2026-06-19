/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Production import
   Lets the user drop a .csv or .xlsx file and bulk-create Production
   tasks (with their scripts) from it.

   Expected columns (case-insensitive, all optional except "Titre") :
     Date · Emoji · Titre · Description · Plateforme · Format · Note ·
     Priorité · Plan 1 · Plan 2 · ... · Plan N
   Any column starting with "Plan " becomes a shot in the script.
   ═══════════════════════════════════════════════ */

var _PROD_IMPORT_PARSED = null;

async function openProdImportModal() {
  if (typeof openModal !== 'function') return;
  _PROD_IMPORT_PARSED = null;
  openModal(_prodImportShellHtml());
}

function _prodImportShellHtml() {
  return '<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>📥 Importer des tâches Production</h2>'
    + '<p style="font-size:12.5px;color:var(--muted);line-height:1.65;margin:0 0 14px;">Importe un fichier Excel <strong>.xlsx</strong> ou <strong>.csv</strong>. Une ligne = une tâche. Toutes les colonnes commençant par <em>Plan 1, Plan 2…</em> deviennent les plans du script.</p>'

    + '<div style="margin-bottom:16px;">'
    +   '<button class="btn-s" onclick="downloadProdImportTemplate()">⬇️ Télécharger le modèle CSV</button>'
    + '</div>'

    + '<label class="prod-import-drop">'
    +   '<input type="file" id="prod-import-file" accept=".csv,.xlsx,.xls" onchange="_handleProdImportFile(event)" style="display:none;">'
    +   '<span class="pid-ic">📄</span>'
    +   '<span class="pid-txt">Clique pour choisir un fichier .csv ou .xlsx</span>'
    + '</label>'

    + '<div id="prod-import-preview"></div>'

    + '<div class="modal-acts" style="margin-top:16px;">'
    +   '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    +   '<button class="btn-p" id="prod-import-confirm" onclick="confirmProdImport()" disabled>Importer</button>'
    + '</div>';
}

function downloadProdImportTemplate() {
  var header = ['Date','Emoji','Titre','Description','Plateforme','Format','Note','Priorité',
                'Script - Titre','Plan 1','Plan 2','Plan 3','Plan 4','Plan 5','Plan 6','Plan 7','Plan 8'];
  var example = ['12/03','🎬','Reel routine matin','Une journée dans ma vie de créatrice','Instagram','Reel','Matériel : trépied + ring light','oui',
                 'Routine matin — script',
                 'Hook : "Voilà comment je commence mes journées"',
                 'Vue d\'ensemble du lit (5s)',
                 'Café + bullet journal — gros plan mains',
                 'Skincare routine accélérée',
                 'Outfit du jour devant miroir',
                 'Sortie de chez moi — extérieur',
                 'CTA : "Abonne-toi pour la routine du soir"',
                 ''];
  var rows = [header, example];
  var csv = rows.map(function(r) {
    return r.map(function(c) {
      var s = String(c || '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');
  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'veyra-import-production.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function _handleProdImportFile(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;
  var name = file.name.toLowerCase();
  var rows = [];
  try {
    if (name.endsWith('.csv')) {
      var text = await file.text();
      rows = _parseCsv(text);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      await _ensureXlsxLoaded();
      var ab = await file.arrayBuffer();
      var wb = window.XLSX.read(ab, { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    } else {
      throw new Error('Format non supporté (.csv ou .xlsx)');
    }
  } catch (e) {
    showSync('❌ ' + (e.message || 'Lecture impossible'), 'rgba(220,38,38,.85)');
    return;
  }
  if (!rows.length) { showSync('⚠️ Fichier vide', 'rgba(245,158,11,.8)'); return; }
  var parsed = _normaliseImportRows(rows);
  _PROD_IMPORT_PARSED = parsed;
  _renderImportPreview(parsed);
  var btn = document.getElementById('prod-import-confirm');
  if (btn) btn.disabled = parsed.length === 0;
}

// SheetJS is heavy (~200 KB) — load only when the user actually opens
// the import modal with an .xlsx file.
function _ensureXlsxLoaded() {
  if (window.XLSX) return Promise.resolve();
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = function () { resolve(); };
    s.onerror = function () { reject(new Error('CDN_unreachable')); };
    document.head.appendChild(s);
  });
}

// Minimal CSV parser that handles quoted fields, escaped quotes and
// embedded newlines — good enough for spreadsheet exports.
function _parseCsv(text) {
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  var rows = [], row = [], cur = '', inQ = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += ch; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Maps the 2-D matrix into proper task objects, recognising the schema.
function _normaliseImportRows(rows) {
  if (!rows.length) return [];
  var header = rows[0].map(function(c) { return String(c || '').trim(); });
  function findCol(re) {
    for (var i = 0; i < header.length; i++) {
      if (re.test(header[i].toLowerCase())) return i;
    }
    return -1;
  }
  var iDate   = findCol(/^date$/);
  var iEmoji  = findCol(/^emoji$/);
  var iTitle  = findCol(/^titre$|^title$/);
  var iDesc   = findCol(/^description$|^d[ée]scription$/);
  var iPlat   = findCol(/^plateforme$|^plate-forme$|^platform$/);
  var iFmt    = findCol(/^format$/);
  var iNote   = findCol(/^note$/);
  var iPrio   = findCol(/^priorit[ée]$|^priority$/);
  var iSTitle = findCol(/^script.*titre|^script.*title/);
  var planCols = [];
  header.forEach(function(h, idx) {
    if (/^plan\s+\d+/i.test(h)) planCols.push({ idx: idx, num: parseInt(h.match(/\d+/)[0], 10) });
  });
  planCols.sort(function(a, b) { return a.num - b.num; });

  var tasks = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r].map(function(c) { return String(c || '').trim(); });
    if (!row.some(function(c) { return c !== ''; })) continue; // skip blank
    var title = iTitle !== -1 ? row[iTitle] : '';
    if (!title) continue;
    var shots = planCols.map(function(pc) {
      var d = (row[pc.idx] || '').trim();
      return d ? { d: d } : null;
    }).filter(Boolean);
    tasks.push({
      date: iDate   !== -1 ? row[iDate]  : '',
      em:   iEmoji  !== -1 ? row[iEmoji] : '',
      title: title,
      desc: iDesc   !== -1 ? row[iDesc]  : '',
      plat: iPlat   !== -1 ? row[iPlat]  : '',
      fmt:  iFmt    !== -1 ? row[iFmt]   : '',
      note: iNote   !== -1 ? row[iNote]  : '',
      launch: iPrio !== -1 ? /^(oui|yes|true|1|✓)$/i.test(row[iPrio]) : false,
      scriptTitle: iSTitle !== -1 ? row[iSTitle] : (shots.length ? title : ''),
      shots: shots
    });
  }
  return tasks;
}

function _renderImportPreview(tasks) {
  var el = document.getElementById('prod-import-preview');
  if (!el) return;
  if (!tasks.length) {
    el.innerHTML = '<div class="prod-import-empty">Aucune tâche trouvée. Vérifie que ton fichier a bien une colonne <strong>Titre</strong>.</div>';
    return;
  }
  var head = '<div class="prod-import-summary">' + tasks.length + ' tâche' + (tasks.length > 1 ? 's' : '') + ' prête' + (tasks.length > 1 ? 's' : '') + ' à importer</div>';
  var rows = tasks.slice(0, 5).map(function(t) {
    return '<div class="prod-import-row">'
      + '<span class="pir-em">' + escapeHtml(t.em || '🎬') + '</span>'
      + '<span class="pir-title">' + escapeHtml(t.title) + '</span>'
      + (t.plat ? '<span class="pir-tag">' + escapeHtml(t.plat) + '</span>' : '')
      + (t.fmt  ? '<span class="pir-tag">' + escapeHtml(t.fmt)  + '</span>' : '')
      + (t.shots.length ? '<span class="pir-shots">' + t.shots.length + ' plans</span>' : '')
      + '</div>';
  }).join('');
  var more = tasks.length > 5 ? '<div class="prod-import-more">… et ' + (tasks.length - 5) + ' autres</div>' : '';
  el.innerHTML = head + rows + more;
}

async function confirmProdImport() {
  if (!Array.isArray(_PROD_IMPORT_PARSED) || !_PROD_IMPORT_PARSED.length) return;
  if (!Array.isArray(PROD)) PROD = [];

  _PROD_IMPORT_PARSED.forEach(function(t) {
    PROD.push({
      id: 'pi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date: t.date, em: t.em, title: t.title, desc: t.desc,
      plat: t.plat, fmt: t.fmt, note: t.note,
      launch: !!t.launch,
      done: false,
      pubId: null,
      script: t.scriptTitle || t.shots.length
        ? { title: t.scriptTitle || t.title, shots: t.shots }
        : { title: '', shots: [] }
    });
  });

  save();
  if (typeof renderProd === 'function') renderProd();
  if (typeof renderKPIs === 'function') renderKPIs();
  closeModal();
  showSync('✅ ' + _PROD_IMPORT_PARSED.length + ' tâche(s) importée(s)', 'rgba(5,150,105,.8)');
}
