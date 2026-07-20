/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Production import (with upsert + Planning auto-link)

   Schema (all columns optional except Titre):
     ID · Date tournage · Emoji · Titre · Description · Plateforme · Format ·
     Note · Priorité · Assignée à · Date publication · Heure publication ·
     Script - Titre · Plan 1 · Plan 2 · … · Plan N

   Re-import logic:
     - Empty ID  → new PROD task (a fresh id is generated)
     - ID present and matches → that task is UPDATED in place (no doublons)

   Auto-link to Planning:
     - If a row carries "Date publication" we also create (or update) a PUB
       in Planning, with the same title / platform / format, scheduled at
       that date + heure, and link the prod task to it via prod.pubId.

   "Exporter CSV" dumps the current PROD list with IDs so the user can
   keep editing in Excel and re-import without losing the link.
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
    + '<p style="font-size:12.5px;color:var(--muted);line-height:1.65;margin:0 0 14px;">Importe un fichier <strong>.csv</strong> ou <strong>.xlsx</strong>. Une ligne = une tâche. La colonne <strong>ID</strong> permet la mise à jour : ré-importe le même fichier édité, les rubriques existantes sont mises à jour, pas dupliquées. Si <strong>Date publication</strong> est renseignée, la rubrique apparaît aussi dans le Planning.</p>'

    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">'
    +   '<button class="btn-s" onclick="downloadProdImportTemplate()">⬇️ Modèle CSV vierge</button>'
    +   '<button class="btn-s" onclick="exportProdToCsv()">📤 Exporter mes tâches (avec IDs)</button>'
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

function _IMPORT_HEADER_ROW() {
  return ['ID','Date tournage','Emoji','Titre','Description','Plateforme','Format','Note','Priorité',
          'Assignée à',
          'Date publication','Heure publication','Script - Titre',
          'Plan 1','Plan 2','Plan 3','Plan 4','Plan 5','Plan 6','Plan 7','Plan 8'];
}

function downloadProdImportTemplate() {
  var header = _IMPORT_HEADER_ROW();
  var example = ['','12/03','🎬','Reel routine matin','Une journée dans ma vie de créatrice','Instagram','Reel','Matériel : trépied + ring light','oui',
                 '',
                 '14/03','18h00','Routine matin — script',
                 'Hook : "Voilà comment je commence mes journées"',
                 'Vue d\'ensemble du lit (5s)',
                 'Café + bullet journal — gros plan mains',
                 'Skincare routine accélérée',
                 'Outfit du jour devant miroir',
                 'Sortie de chez moi — extérieur',
                 'CTA : "Abonne-toi pour la routine du soir"',
                 ''];
  _downloadCsv('veyra-import-production.csv', [header, example]);
}

function exportProdToCsv() {
  var header = _IMPORT_HEADER_ROW();
  var rows = [header];
  (PROD || []).forEach(function(t) {
    var linkedPub = t.pubId ? (PUBS || []).find(function(x) { return x.id === t.pubId; }) : null;
    var shots = (t.script && t.script.shots) ? t.script.shots : [];
    var planCells = [];
    for (var i = 0; i < 8; i++) planCells.push((shots[i] && shots[i].d) || '');
    rows.push([
      t.id || '',
      t.date || '',
      t.em || '',
      t.title || '',
      t.desc || '',
      t.plat || '',
      t.fmt || '',
      t.note || '',
      t.launch ? 'oui' : '',
      _assigneeNameForExport(t.assigneeId),
      linkedPub ? (linkedPub.date || '') : '',
      linkedPub ? (linkedPub.heure || '') : '',
      (t.script && t.script.title) || '',
    ].concat(planCells));
  });
  _downloadCsv('veyra-production-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
}

function _downloadCsv(filename, rows) {
  var csv = rows.map(function(r) {
    return r.map(function(c) {
      var s = String(c == null ? '' : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\n');
  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
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
  if (btn) btn.disabled = parsed.tasks.length === 0;
}

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

function _parseCsv(text) {
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

function _normaliseImportRows(rows) {
  if (!rows.length) return { tasks: [], stats: { inserted: 0, updated: 0, withPub: 0 } };
  var header = rows[0].map(function(c) { return String(c || '').trim(); });
  function findCol(re) {
    for (var i = 0; i < header.length; i++) {
      if (re.test(header[i].toLowerCase())) return i;
    }
    return -1;
  }
  var iId      = findCol(/^id$/);
  var iDate    = findCol(/^date(\s|$|tournage)/);
  var iEmoji   = findCol(/^emoji$/);
  var iTitle   = findCol(/^titre$|^title$/);
  var iDesc    = findCol(/^description$|^d[ée]scription$/);
  var iPlat    = findCol(/^plateforme$|^plate-forme$|^platform$/);
  var iFmt     = findCol(/^format$/);
  var iNote    = findCol(/^note$/);
  var iPrio    = findCol(/^priorit[ée]$|^priority$/);
  var iAssign  = findCol(/^assign[ée]e?\s*[àa]?$|^assignee$|^qui$/);
  var iDatePub = findCol(/^date\s*publi/);
  var iHourPub = findCol(/^heure\s*publi/);
  var iSTitle  = findCol(/^script.*titre|^script.*title/);
  var planCols = [];
  header.forEach(function(h, idx) {
    if (/^plan\s+\d+/i.test(h)) planCols.push({ idx: idx, num: parseInt(h.match(/\d+/)[0], 10) });
  });
  planCols.sort(function(a, b) { return a.num - b.num; });

  var tasks = [];
  var stats = { inserted: 0, updated: 0, withPub: 0 };
  var existingIds = {};
  (PROD || []).forEach(function(t) { if (t.id) existingIds[t.id] = true; });

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r].map(function(c) { return String(c || '').trim(); });
    if (!row.some(function(c) { return c !== ''; })) continue;
    var title = iTitle !== -1 ? row[iTitle] : '';
    if (!title) continue;
    var id = iId !== -1 ? row[iId] : '';
    var shots = planCols.map(function(pc) {
      var d = (row[pc.idx] || '').trim();
      return d ? { d: d } : null;
    }).filter(Boolean);

    var task = {
      id: id || null,
      date:    iDate    !== -1 ? row[iDate]    : '',
      em:      iEmoji   !== -1 ? row[iEmoji]   : '',
      title:   title,
      desc:    iDesc    !== -1 ? row[iDesc]    : '',
      plat:    iPlat    !== -1 ? row[iPlat]    : '',
      fmt:     iFmt     !== -1 ? row[iFmt]     : '',
      note:    iNote    !== -1 ? row[iNote]    : '',
      launch:  iPrio    !== -1 ? /^(oui|yes|true|1|✓)$/i.test(row[iPrio]) : false,
      assigneeId: iAssign !== -1 ? _resolveAssignee(row[iAssign]) : null,
      datePub: iDatePub !== -1 ? row[iDatePub] : '',
      hourPub: iHourPub !== -1 ? row[iHourPub] : '',
      scriptTitle: iSTitle !== -1 ? row[iSTitle] : (shots.length ? title : ''),
      shots: shots,
      _action: id && existingIds[id] ? 'update' : 'insert'
    };
    if (task._action === 'update') stats.updated++;
    else stats.inserted++;
    if (task.datePub) stats.withPub++;
    tasks.push(task);
  }
  return { tasks: tasks, stats: stats };
}

function _renderImportPreview(parsed) {
  var el = document.getElementById('prod-import-preview');
  if (!el) return;
  var tasks = parsed.tasks;
  var s = parsed.stats;
  if (!tasks.length) {
    el.innerHTML = '<div class="prod-import-empty">Aucune tâche trouvée. Vérifie que ton fichier a bien une colonne <strong>Titre</strong>.</div>';
    return;
  }
  var summary = '<div class="prod-import-summary">'
    + tasks.length + ' ligne' + (tasks.length > 1 ? 's' : '') + ' à traiter · '
    + '<span class="pis-ins">' + s.inserted + ' nouvelle' + (s.inserted > 1 ? 's' : '') + '</span> · '
    + '<span class="pis-upd">' + s.updated + ' mise' + (s.updated > 1 ? 's' : '') + ' à jour</span> · '
    + '<span class="pis-pub">' + s.withPub + ' avec publi Planning</span>'
    + '</div>';
  var rows = tasks.slice(0, 6).map(function(t) {
    var actLabel = t._action === 'update' ? '<span class="pir-act pir-act-upd">↻ MAJ</span>' : '<span class="pir-act pir-act-ins">+ NEW</span>';
    return '<div class="prod-import-row">'
      + actLabel
      + '<span class="pir-em">' + escapeHtml(t.em || '🎬') + '</span>'
      + '<span class="pir-title">' + escapeHtml(t.title) + '</span>'
      + (t.fmt  ? '<span class="pir-tag">' + escapeHtml(t.fmt)  + '</span>' : '')
      + (t.shots.length ? '<span class="pir-shots">' + t.shots.length + ' plans</span>' : '')
      + (t.datePub ? '<span class="pir-pub">📅 ' + escapeHtml(t.datePub) + '</span>' : '')
      + '</div>';
  }).join('');
  var more = tasks.length > 6 ? '<div class="prod-import-more">… et ' + (tasks.length - 6) + ' autres</div>' : '';
  el.innerHTML = summary + rows + more;
}

// Parse "dd/mm" or "dd/mm/yyyy" → { day, mo, yr, date }
function _parsePubDate(str) {
  if (!str) return null;
  var m = str.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
  if (!m) return null;
  var d = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10) - 1;
  var y = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  if (y < 100) y += 2000;
  if (isNaN(d) || isNaN(mo) || isNaN(y)) return null;
  return {
    day: d, mo: mo, yr: y,
    date: String(d).padStart(2, '0') + '/' + String(mo + 1).padStart(2, '0')
  };
}

function _platSlugFromImport(plat) {
  var p = (plat || '').toLowerCase();
  if (p.indexOf('tiktok') !== -1) return 'tiktok';
  if (p.indexOf('insta') !== -1) return 'insta';
  if (p.indexOf('stor') !== -1) return 'stories';
  return 'insta';
}

async function confirmProdImport() {
  if (!_PROD_IMPORT_PARSED || !_PROD_IMPORT_PARSED.tasks.length) return;
  if (!Array.isArray(PROD)) PROD = [];
  if (!Array.isArray(PUBS)) PUBS = [];

  var s = _PROD_IMPORT_PARSED.stats;

  _PROD_IMPORT_PARSED.tasks.forEach(function(t) {
    // ─── Upsert the PROD task ───
    var task;
    if (t._action === 'update') {
      task = PROD.find(function(x) { return x.id === t.id; });
      if (!task) { t._action = 'insert'; }
    }
    if (t._action === 'insert') {
      task = {
        id: t.id || 'pi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        done: false, pubId: null
      };
      PROD.push(task);
    }
    task.date = t.date;
    task.em = t.em;
    task.title = t.title;
    task.desc = t.desc;
    task.plat = t.plat;
    task.fmt = t.fmt;
    task.note = t.note;
    task.launch = !!t.launch;
    if (t.assigneeId !== undefined) task.assigneeId = t.assigneeId;
    task.script = {
      title: t.scriptTitle || (t.shots.length ? t.title : ''),
      shots: t.shots
    };

    // ─── Optionally upsert the linked PUB ───
    if (t.datePub) {
      var dt = _parsePubDate(t.datePub);
      if (dt) {
        var pub = task.pubId ? PUBS.find(function(x) { return x.id === task.pubId; }) : null;
        if (!pub) {
          pub = {
            id: 'pub' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
            sem: 'S1', launch: false, done: false,
            stats: { v: 0, l: 0, c: 0, s: 0, sh: 0, wt: 0, pv: 0, dur: 0 },
            tags: '', son: '', src: 'A filmer 🎬'
          };
          PUBS.push(pub);
          task.pubId = pub.id;
        }
        pub.title = t.title;
        pub.fmt = t.fmt || pub.fmt || 'Reel';
        pub.plat = _platSlugFromImport(t.plat);
        pub.date = dt.date;
        pub.day = dt.day;
        pub.mo  = dt.mo;
        pub.yr  = dt.yr;
        pub.heure = t.hourPub || pub.heure || '18h00';
        if (t.assigneeId !== undefined) pub.assigneeId = t.assigneeId;
      }
    }
  });

  save();
  if (typeof renderProd === 'function') renderProd();
  if (typeof renderPlanning === 'function') renderPlanning();
  if (typeof renderKPIs === 'function') renderKPIs();
  if (typeof buildFilters === 'function') buildFilters();
  closeModal();

  var bits = [];
  if (s.inserted) bits.push(s.inserted + ' nouvelle' + (s.inserted > 1 ? 's' : ''));
  if (s.updated)  bits.push(s.updated  + ' mise à jour' + (s.updated  > 1 ? 's' : ''));
  if (s.withPub)  bits.push(s.withPub  + ' planifiée' + (s.withPub  > 1 ? 's' : ''));
  showSync('✅ Import terminé · ' + bits.join(' · '), 'rgba(5,150,105,.8)');
}

// Resolve an "Assignée à" cell (a person's name) into a workspace member's
// user_id. Matches case-insensitively against display_name, first token of
// the display name, or the local part of the email. "moi" / "me" resolves
// to the current user. Empty / unmatched → null (task unassigned).
function _resolveAssignee(rawName) {
  var name = (rawName || '').trim().toLowerCase();
  if (!name) return null;
  if (typeof wsMembers !== 'function') return null;
  var members = wsMembers();
  if (name === 'moi' || name === 'me' || name === 'moi-même') {
    return window._VEYRA_UID || null;
  }
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var dn = (m.display_name || '').trim().toLowerCase();
    var em = (m.email || '').toLowerCase();
    var local = em.split('@')[0];
    var first = dn.split(/\s+/)[0];
    if (dn === name || em === name || local === name || first === name) return m.user_id;
    // Also match partial: "Aminata" against "Aminata Diallo"
    if (dn && dn.indexOf(name) !== -1) return m.user_id;
    if (first && name.indexOf(first) !== -1) return m.user_id;
  }
  return null;
}

// Reverse: given a user_id, return a display name for the CSV export.
function _assigneeNameForExport(userId) {
  if (!userId) return '';
  if (typeof wsMemberById === 'function') {
    var m = wsMemberById(userId);
    if (m) {
      return (m.display_name && m.display_name.trim()) ||
             (m.email || '').split('@')[0] || '';
    }
  }
  return '';
}
