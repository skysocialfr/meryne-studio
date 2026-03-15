/* ===============================================
   MERYNE STUDIO V4 — Planning Section
   =============================================== */

// ─── Engagement Rate ───
function eng(p) {
  if (!p.stats || !p.stats.v || p.stats.v === 0) return 0;
  return ((p.stats.l + p.stats.c * 2 + p.stats.s * 3 + p.stats.sh) / p.stats.v * 100).toFixed(1);
}

// ─── Filter Bar ───
function buildFilters() {
  var el = document.getElementById('filter-bar');
  if (!el) return;
  var sems = Object.keys(SEM);
  var h = '<span class="fb-label">Semaine :</span>'
    + '<button class="fb-btn' + (fSem === 'all' ? ' a-sem' : '') + '" onclick="setFSem(\'all\',this)">Toutes</button>';
  sems.forEach(function(s) {
    h += '<button class="fb-btn' + (fSem === s ? ' a-sem' : '') + '" onclick="setFSem(\'' + s + '\',this)">'
      + escapeHtml(SEM[s].l.replace('Semaine ', 'Sem ')) + '</button>';
  });
  h += '<span class="fb-sep"></span><span class="fb-label">Plateforme :</span>';
  ['all', 'tiktok', 'insta', 'stories'].forEach(function(p) {
    var lbl = p === 'all' ? 'Toutes' : { tiktok: 'TikTok', insta: 'Instagram', stories: 'Stories' }[p];
    h += '<button class="fb-btn' + (fPlat === p ? ' a-plat' : '') + '" onclick="setFPlat(\'' + p + '\',this)">' + escapeHtml(lbl) + '</button>';
  });
  el.innerHTML = h;
}

function setFSem(s, btn) {
  fSem = s;
  buildFilters();
  renderPlanning();
}

function setFPlat(p, btn) {
  fPlat = p;
  buildFilters();
  renderPlanning();
}

// ─── Render Planning (List View) ───
function renderPlanning() {
  var el = document.getElementById('pubs-container');
  if (!el) return;
  var pubs = PUBS;
  if (fSem !== 'all') pubs = pubs.filter(function(p) { return p.sem === fSem; });
  if (fPlat !== 'all') pubs = pubs.filter(function(p) { return p.plat === fPlat; });
  var bySem = {};
  pubs.forEach(function(p) {
    if (!bySem[p.sem]) bySem[p.sem] = [];
    bySem[p.sem].push(p);
  });
  var html = '';
  Object.keys(SEM).forEach(function(s) {
    var items = bySem[s];
    if (!items || !items.length) return;
    var done = items.filter(function(x) { return x.done; }).length;
    html += '<div class="week-hdr" style="border-left-color:' + SEM[s].c + '">'
      + '<div><span class="wn" style="color:' + SEM[s].c + '">' + escapeHtml(SEM[s].l) + '</span>'
      + '<span class="wd">' + escapeHtml(SEM[s].d) + ' — ' + escapeHtml(SEM[s].desc) + '</span></div>'
      + '<div class="wcnt">' + done + '/' + items.length + '</div></div>';
    items.forEach(function(p) {
      var realIdx = PUBS.findIndex(function(x) { return x.id === p.id; });
      var platInfo = PM[p.plat] || { l: p.plat, cls: 'b-ig' };
      var platCls = platInfo.cls;
      var platLbl = platInfo.l.toUpperCase();
      var doneCls = p.done ? 'done' : '';
      var lcCls = p.launch ? 'lc' : '';
      var platCls2 = p.plat === 'tiktok' ? 'plat-tt' : p.plat === 'insta' ? 'plat-ig' : 'plat-st';

      // Script panel
      var scriptHtml = '';
      if (p.script && p.script.shots && p.script.shots.length) {
        scriptHtml = '<div class="pub-script-panel" id="pubsp-' + p.id + '">'
          + '<div class="psp-pub-head">' + escapeHtml(p.script.title || 'Script') + '</div>';
        p.script.shots.forEach(function(sh) {
          scriptHtml += '<div class="psp-pub-shot"><div class="psp-pub-n">Plan ' + sh.n + '</div>'
            + '<div class="psp-pub-d">' + escapeHtml(sh.d) + '</div></div>';
        });
        scriptHtml += '<div class="psp-pub-foot">' + escapeHtml(p.src || '') + '</div></div>';
      }

      // Stats panel
      var statsFields = [
        ['Vues', 'v', '\uD83D\uDC41'],
        ['Likes', 'l', '\u2764\uFE0F'],
        ['Comments', 'c', '\uD83D\uDCAC'],
        ['Saves', 's', '\uD83D\uDD16'],
        ['Shares', 'sh', '\uD83D\uDD01']
      ];
      var statsHtml = '<div class="stats-panel" id="sp-' + p.id + '">'
        + '<div class="sp-inner">'
        + '<div class="sp-title">\uD83D\uDCCA Statistiques</div>'
        + '<div class="stats-grid">';
      statsFields.forEach(function(sf) {
        var lbl = sf[0], key = sf[1], ico = sf[2];
        statsHtml += '<div class="sf"><label style="color:var(--muted)">' + ico + ' ' + escapeHtml(lbl) + '</label>'
          + '<input type="number" min="0" value="' + (p.stats[key] || 0)
          + '" data-stat-id="' + p.id + '" data-stat-key="' + key + '"'
          + ' oninput="updStat(\'' + p.id + '\',\'' + key + '\',this.value,this)" /></div>';
      });
      var totalInter = (p.stats.l || 0) + (p.stats.c || 0) + (p.stats.s || 0) + (p.stats.sh || 0);
      statsHtml += '</div>'
        + '<div class="eng-row"><span style="font-size:10px;color:var(--muted)">Taux d\'engagement</span>'
        + '<span class="eng-v" style="color:var(--violet)">' + eng(p) + '%</span></div>'
        + '<div style="font-size:10px;color:var(--muted);text-align:right;margin-top:4px;" class="stats-total-' + p.id + '">Total interactions : ' + totalInter.toLocaleString('fr-FR') + '</div>'
        + '</div></div>';

      // Published link
      var linkHtml = '';
      if (p.done && p.link) {
        linkHtml = '<a href="' + escapeHtml(p.link) + '" target="_blank" rel="noopener" '
          + 'style="display:inline-flex;align-items:center;gap:5px;margin-top:4px;font-size:11px;'
          + 'font-weight:700;color:#059669;text-decoration:none;background:rgba(5,150,105,.08);'
          + 'border:1px solid rgba(5,150,105,.2);border-radius:6px;padding:3px 8px;">'
          + '\uD83D\uDD17 Voir le post publi\u00E9 \u2197</a>';
      }

      // Card
      html += '<div class="pub-card ' + doneCls + ' ' + (lcCls || platCls2) + '">'
        + '<div class="pub-top">'
        + '<div class="pub-chk' + (p.done ? ' on' : '') + '" onclick="togglePub(\'' + p.id + '\')">' + (p.done ? '\u2713' : '') + '</div>'
        + '<div class="pub-body">'
        + '<div class="pub-meta">'
        + '<span class="badge ' + platCls + '">' + escapeHtml(platLbl) + '</span>'
        + '<span class="fmt-t">' + escapeHtml(p.fmt) + '</span>'
        + '<span class="time-t">\u23F0 ' + escapeHtml(p.heure) + '</span>'
        + '</div>'
        + '<div class="pub-title-main"><span class="pub-date-inline">' + escapeHtml(p.date) + ' \u00B7 </span>' + escapeHtml(p.title) + '</div>'
        + (p.son && p.son !== '\u2014' ? '<div class="pub-son">\uD83C\uDFB5 ' + escapeHtml(p.son) + '</div>' : '')
        + (p.src ? '<div class="src-t">\uD83D\uDCC1 ' + escapeHtml(p.src) + '</div>' : '')
        + linkHtml
        + '<div class="pub-actions" style="margin-top:8px;">'
        + '<div class="pub-btns">'
        + (scriptHtml ? '<button class="sb sb-script" onclick="togglePubScript(\'' + p.id + '\')">\uD83D\uDCDD Script</button>' : '')
        + '<button class="sb sb-edit" onclick="openPubModal(' + realIdx + ')">\u270F\uFE0F Modifier</button>'
        + (p.done ? '<button class="sb sb-stats" onclick="toggleStats(\'' + p.id + '\')">\uD83D\uDCCA Stats</button>' : '')
        + '<div class="pub-more-wrap">'
        + '<button class="sb sb-more" onclick="togglePubMore(\'' + p.id + '\',event)">\u2022\u2022\u2022</button>'
        + '<div class="pub-more-menu" id="pub-more-' + p.id + '">'
        + '<button onclick="copyCaption(\'' + p.id + '\');closePubMore()">\uD83D\uDCCB Copier caption</button>'
        + '<button onclick="dupPub(\'' + p.id + '\');closePubMore()">\uD83D\uDCDD Dupliquer</button>'
        + '<button class="pmm-del" onclick="deletePubDirect(\'' + p.id + '\');closePubMore()">\uD83D\uDDD1\uFE0F Supprimer</button>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>'
        + scriptHtml
        + statsHtml
        + '</div>';
    });
  });
  el.innerHTML = html;
}

// ─── Toggle Publication Done ───
function togglePub(id) {
  var p = PUBS.find(function(x) { return x.id === id; });
  if (p) {
    p.done = !p.done;
    save();
    buildFilters();
    renderPlanning();
    renderKPIs();
  }
}

// ─── Toggle Script Panel ───
function togglePubScript(id) {
  var el = document.getElementById('pubsp-' + id);
  if (el) el.classList.toggle('open');
}

// ─── Toggle Stats Panel ───
function toggleStats(id) {
  var el = document.getElementById('sp-' + id);
  if (el) el.classList.toggle('open');
}

// ─── Update Stat Value ───
function updStat(id, key, val, el) {
  var p = PUBS.find(function(x) { return x.id === id; });
  if (p) {
    var n = parseInt(val);
    if (isNaN(n) || n < 0) {
      if (el) { el.classList.add('stat-invalid'); setTimeout(function() { el.classList.remove('stat-invalid'); }, 1500); }
      p.stats[key] = 0;
    } else {
      p.stats[key] = n;
    }
    save();
    renderKPIs();
    var engEl = document.querySelector('#sp-' + id + ' .eng-v');
    if (engEl) engEl.textContent = eng(p) + '%';
    var totEl = document.querySelector('.stats-total-' + id);
    if (totEl) {
      var tot = (p.stats.l || 0) + (p.stats.c || 0) + (p.stats.s || 0) + (p.stats.sh || 0);
      totEl.textContent = 'Total interactions : ' + tot.toLocaleString('fr-FR');
    }
  }
}

// ─── Delete Publication (Direct) ───
function deletePubDirect(id) {
  askConfirm('Supprimer ce post ?', function() {
    PUBS = PUBS.filter(function(p) { return p.id !== id; });
    save();
    buildFilters();
    renderPlanning();
    renderCalendar();
    renderKPIs();
  });
}

// ─── Plan View Toggle (List / Calendar) ───
function setPlanView(view, btn) {
  document.querySelectorAll('#pvt-list,#pvt-cal').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.getElementById('plan-list-view').style.display = view === 'list' ? 'block' : 'none';
  document.getElementById('plan-cal-view').style.display = view === 'cal' ? 'block' : 'none';
  if (view === 'cal') renderCalendar();
}

// ─── Publication Modal ───
var _pubbe = null;

function openPubModal(idx) {
  var isNew = idx === -1;
  if (isNew) {
    _pubbe = {
      id: 'pub' + Date.now(),
      sem: 'S1',
      date: '',
      day: 1,
      mo: 2,
      yr: 2026,
      plat: 'tiktok',
      fmt: 'TikTok',
      title: '',
      son: '',
      heure: '18h00',
      tags: '',
      src: 'A filmer \uD83C\uDFAC',
      done: false,
      launch: false,
      stats: { v: 0, l: 0, c: 0, s: 0, sh: 0 },
      script: { title: '', shots: [] }
    };
  } else {
    _pubbe = JSON.parse(JSON.stringify(PUBS[idx]));
  }
  if (!_pubbe.script) _pubbe.script = { title: '', shots: [] };

  // Build semaine select options
  var semOptions = '';
  Object.keys(SEM).forEach(function(s) {
    semOptions += '<option value="' + s + '"' + (_pubbe.sem === s ? ' selected' : '') + '>' + escapeHtml(SEM[s].l) + '</option>';
  });

  // Build platform select options
  var platOptions = '';
  Object.keys(PM).forEach(function(p) {
    platOptions += '<option value="' + p + '"' + (_pubbe.plat === p ? ' selected' : '') + '>' + escapeHtml(PM[p].l) + '</option>';
  });

  // Build shot list
  var shotsHtml = '';
  _pubbe.script.shots.forEach(function(s, i) {
    shotsHtml += pubShotHtml(i, s.d);
  });

  // Link field (only shown if done)
  var linkField = '';
  if (_pubbe.done) {
    linkField = '<div class="fr" style="background:linear-gradient(135deg,rgba(5,150,105,.06),rgba(52,211,153,.04));'
      + 'border:1.5px solid rgba(5,150,105,.2);border-radius:10px;padding:10px 12px;">'
      + '<label style="color:#059669;">\uD83D\uDD17 Lien du post publi\u00E9</label>'
      + '<input id="ppe-link" placeholder="https://www.tiktok.com/@meryne.eis/..." value="' + escapeHtml(_pubbe.link || '') + '"></div>';
  }

  var modalHtml = '<button class="modal-x" onclick="closeModal()">\u2715</button>'
    + '<h2>' + (isNew ? 'Nouveau post' : 'Modifier le post') + '</h2>'
    + '<div class="fg">'
    + '<div class="fr"><label>Date (JJ/MM)</label><input id="ppe-date" value="' + escapeHtml(_pubbe.date) + '"></div>'
    + '<div class="fr"><label>Semaine</label><select id="ppe-sem">' + semOptions + '</select></div>'
    + '</div>'
    + '<div class="fg">'
    + '<div class="fr"><label>Jour du mois</label><input id="ppe-day" type="number" min="1" max="31" value="' + (_pubbe.day || 1) + '"></div>'
    + '<div class="fr"><label>Mois (0=Jan)</label><input id="ppe-mo" type="number" min="0" max="11" value="' + (_pubbe.mo || 0) + '"></div>'
    + '</div>'
    + '<div class="fr"><label>Titre</label><input id="ppe-title" value="' + escapeHtml(_pubbe.title) + '"></div>'
    + '<div class="fg">'
    + '<div class="fr"><label>Plateforme</label><select id="ppe-plat">' + platOptions + '</select></div>'
    + '<div class="fr"><label>Format</label><input id="ppe-fmt" value="' + escapeHtml(_pubbe.fmt) + '"></div>'
    + '</div>'
    + '<div class="fg">'
    + '<div class="fr"><label>Heure</label><input id="ppe-heure" value="' + escapeHtml(_pubbe.heure) + '"></div>'
    + '<div class="fr"><label>Son/Trend</label><input id="ppe-son" value="' + escapeHtml(_pubbe.son) + '"></div>'
    + '</div>'
    + '<div class="fr"><label>Source</label><input id="ppe-src" value="' + escapeHtml(_pubbe.src) + '"></div>'
    + '<div class="fr"><label>Hashtags</label>'
    + '<div id="hash-modal-row" class="hash-modal-row"></div>'
    + '<input id="ppe-tags" value="' + escapeHtml(_pubbe.tags) + '"></div>'
    + '<div class="ai-caption-row">'
    + '<button id="ai-caption-btn" class="btn-ai-sm" onclick="generateCaption(\'' + _pubbe.id + '\')">\u2728 Caption IA</button>'
    + '</div>'
    + '<div id="ai-caption-result"></div>'
    + linkField
    + '<hr class="sep">'
    + '<div class="fr"><label>\uD83C\uDFAC Titre du script</label><input id="ppe-stitle" value="' + escapeHtml(_pubbe.script.title) + '"></div>'
    + '<div id="ppe-shots">' + shotsHtml + '</div>'
    + '<button class="add-btn" onclick="addPubShot()">\uFF0B Ajouter un plan</button>'
    + '<div class="modal-acts">'
    + (!isNew ? '<button class="btn-d" onclick="delPubM(\'' + _pubbe.id + '\')">\uD83D\uDDD1 Supprimer</button>' : '')
    + '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="savePub(\'' + _pubbe.id + '\',' + isNew + ',' + idx + ')">Enregistrer \u2713</button>'
    + '</div>';

  openModal(modalHtml);
  if (typeof renderHashModalRow === 'function') renderHashModalRow();
}

// ─── Shot Editor Helpers ───
function pubShotHtml(i, d) {
  return '<div class="shot-edit" id="pse-' + i + '">'
    + '<div class="shot-edit-n">Plan ' + (i + 1) + '</div>'
    + '<textarea oninput="updPubShot(' + i + ',this.value)">' + escapeHtml(d || '') + '</textarea>'
    + '<button class="shot-edit-del" onclick="removePubShot(' + i + ')">\u2715</button>'
    + '</div>';
}

function addPubShot() {
  if (!_pubbe) return;
  _pubbe.script.shots.push({ n: _pubbe.script.shots.length + 1, d: '' });
  var c = document.getElementById('ppe-shots');
  var i = _pubbe.script.shots.length - 1;
  c.insertAdjacentHTML('beforeend', pubShotHtml(i, ''));
}

function removePubShot(i) {
  if (!_pubbe) return;
  _pubbe.script.shots.splice(i, 1);
  _pubbe.script.shots.forEach(function(s, j) { s.n = j + 1; });
  document.getElementById('ppe-shots').innerHTML = _pubbe.script.shots.map(function(s, j) {
    return pubShotHtml(j, s.d);
  }).join('');
}

function updPubShot(i, v) {
  if (_pubbe && _pubbe.script.shots[i]) _pubbe.script.shots[i].d = v;
}

// ─── Save Publication ───
function savePub(id, isNew, idx) {
  if (!_pubbe) return;
  _pubbe.id = id;
  _pubbe.date = document.getElementById('ppe-date').value;
  _pubbe.sem = document.getElementById('ppe-sem').value;
  _pubbe.day = parseInt(document.getElementById('ppe-day').value) || 1;
  _pubbe.mo = parseInt(document.getElementById('ppe-mo').value) || 2;
  _pubbe.yr = 2026;
  _pubbe.title = document.getElementById('ppe-title').value;
  _pubbe.plat = document.getElementById('ppe-plat').value;
  _pubbe.fmt = document.getElementById('ppe-fmt').value;
  _pubbe.heure = document.getElementById('ppe-heure').value;
  _pubbe.son = document.getElementById('ppe-son').value;
  _pubbe.src = document.getElementById('ppe-src').value;
  _pubbe.tags = document.getElementById('ppe-tags').value;
  _pubbe.script.title = document.getElementById('ppe-stitle').value;
  var linkEl = document.getElementById('ppe-link');
  if (linkEl) _pubbe.link = linkEl.value;
  document.querySelectorAll('#ppe-shots textarea').forEach(function(ta, i) {
    if (_pubbe.script.shots[i]) _pubbe.script.shots[i].d = ta.value;
  });
  if (isNew) PUBS.push(_pubbe); else PUBS[idx] = _pubbe;
  save();
  closeModal();
  buildFilters();
  renderPlanning();
  renderCalendar();
  renderKPIs();
}

// ─── Delete Publication (from Modal) ───
function delPubM(id) {
  askConfirm('Supprimer ce post ?', function() {
    PUBS = PUBS.filter(function(p) { return p.id !== id; });
    save();
    closeModal();
    renderPlanning();
    renderCalendar();
    renderKPIs();
  });
}

// ─── Dupliquer une Publication ───
function dupPub(id) {
  var orig = PUBS.find(function(x) { return x.id === id; });
  if (!orig) return;
  var copy = JSON.parse(JSON.stringify(orig));
  copy.id = 'pub' + Date.now();
  copy.title = orig.title + ' (copie)';
  copy.done = false;
  copy.stats = {v:0, l:0, c:0, s:0, sh:0};
  PUBS.push(copy);
  save();
  buildFilters();
  renderPlanning();
  renderKPIs();
}

// ─── Copy Caption ───
function copyCaption(id) {
  var p = PUBS.find(function(x) { return x.id === id; });
  if (!p) return;
  var text = p.title + (p.tags ? '\n\n' + p.tags : '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() { showSync('\uD83D\uDCCB Caption copié !', 'rgba(5,150,105,.8)'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showSync('\uD83D\uDCCB Caption copié !', 'rgba(5,150,105,.8)');
  }
}

// ─── More Menu ───
function togglePubMore(id, e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById('pub-more-' + id);
  if (!menu) return;
  var isOpen = menu.classList.contains('open');
  closePubMore();
  if (!isOpen) {
    var btn = e && e.currentTarget ? e.currentTarget : document.querySelector('[onclick*="togglePubMore(\'' + id + '\'"]');
    if (btn) {
      var r = btn.getBoundingClientRect();
      menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
      menu.style.left = r.left + 'px';
      menu.style.position = 'fixed';
      menu.style.top = (r.bottom + 4) + 'px';
    }
    menu.classList.add('open');
  }
}

function closePubMore() {
  document.querySelectorAll('.pub-more-menu.open').forEach(function(m) { m.classList.remove('open'); });
}

document.addEventListener('click', function() { closePubMore(); });

// ─── Open Publication by ID ───
function openPubById(id) {
  var idx = PUBS.findIndex(function(p) { return p.id === id; });
  if (idx !== -1) openPubModal(idx);
}
