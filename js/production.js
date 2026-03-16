/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Production Module
   Task management + Production calendar
   ═══════════════════════════════════════════════ */

// ─── Production View State ───
var prodView = 'list';
var prodCalY = 2026;
var prodCalM = 2;

// ─── Current editing task for modal ───
var _pe = null;

// ═══════════════════════════════════════════════
//  Render Production Task List
// ═══════════════════════════════════════════════

function renderProd() {
  var container = document.getElementById('prod-list');
  if (!container) return;

  var total = PROD.length;
  var done = 0;
  for (var i = 0; i < PROD.length; i++) {
    if (PROD[i].done) done++;
  }
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Update existing progress elements in toolbar
  var lblEl = document.getElementById('prod-lbl');
  var pctEl = document.getElementById('prod-pct');
  var progEl = document.getElementById('prod-prog');
  if (lblEl) lblEl.textContent = 'Production ' + done + '/' + total;
  if (pctEl) pctEl.textContent = pct + '%';
  if (progEl) {
    progEl.style.width = pct + '%';
    progEl.style.background = pct === 100 ? 'var(--green)' : 'var(--amber)';
  }

  var html = '';

  // Task cards
  for (var j = 0; j < PROD.length; j++) {
    var t = PROD[j];
    var id = t.id || j;
    var cardClass = 'prod-card';
    if (t.done) cardClass += ' done';
    if (t.launch) cardClass += ' lt';
    var platLow = (t.plat || '').toLowerCase();
    if (platLow.indexOf('tiktok') !== -1 && platLow.indexOf('insta') !== -1) cardClass += ' plat-mix';
    else if (platLow.indexOf('tiktok') !== -1) cardClass += ' plat-tt';
    else if (platLow.indexOf('insta') !== -1) cardClass += ' plat-ig';

    html += '<div class="' + cardClass + '" id="prod-card-' + id + '">';

    // Main row
    html += '<div class="pc-main">';

    // Checkbox
    html += '<button class="pc-chk' + (t.done ? ' on' : '') + '" onclick="toggleProd(\'' + id + '\')">'
      + (t.done ? '<svg width="12" height="12" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>' : '')
      + '</button>';

    // Body
    html += '<div class="pc-body">';

    // Meta row: date + tags
    html += '<div class="pc-meta">';
    if (t.date) {
      html += '<span class="pc-date">' + escapeHtml(t.date) + '</span>';
    }
    if (t.plat) {
      html += '<span class="tag tg-rose">' + escapeHtml(t.plat) + '</span>';
    }
    if (t.fmt) {
      html += '<span class="tag tg-cyan">' + escapeHtml(t.fmt) + '</span>';
    }
    if (t.posts) {
      html += '<span class="tag tg-amber">' + escapeHtml(String(t.posts)) + ' post' + (parseInt(t.posts, 10) > 1 ? 's' : '') + '</span>';
    }
    html += '</div>';

    // Title
    html += '<div class="pc-title' + (t.done ? ' done' : '') + '">';
    if (t.em) {
      html += escapeHtml(t.em) + ' ';
    }
    html += escapeHtml(t.title || 'Sans titre');
    html += '</div>';

    // Description
    if (t.desc) {
      html += '<div class="pc-desc">' + escapeHtml(t.desc) + '</div>';
    }

    // Note
    if (t.note) {
      html += '<div style="font-size:10px;color:#9CA3AF;font-style:italic;margin-bottom:4px;">' + escapeHtml(t.note) + '</div>';
    }

    // Priority badge
    if (t.launch) {
      html += '<span class="badge b-launch" style="margin-bottom:5px;">⭐ Priorité</span>';
    }

    // Actions
    html += '<div class="pc-actions">';

    // Script panel toggle (only if script exists)
    if (t.script && t.script.title) {
      html += '<button class="sb sb-script" onclick="toggleProdScript(\'' + id + '\')">Script</button>';
    }

    html += '<button class="sb sb-ai" id="ai-prod-btn-' + id + '" onclick="generateProdScript(\'' + id + '\')">\u2728 IA</button>';
    html += '<button class="sb sb-edit" onclick="openProdModal(' + j + ')">Modifier</button>';
    html += '</div>';

    html += '</div>'; // pc-body
    html += '</div>'; // pc-main

    // Script panel
    if (t.script && t.script.title) {
      html += '<div class="prod-script-panel" id="prod-script-' + id + '">';
      html += '<div class="psp-inner">';

      // Terminal header
      html += '<div class="psp-hdr">'
        + '<div class="psp-dots">'
        + '<div class="psp-dot" style="background:#FF5F57;"></div>'
        + '<div class="psp-dot" style="background:#FFBD2E;"></div>'
        + '<div class="psp-dot" style="background:#28CA41;"></div>'
        + '</div>'
        + '<span class="psp-label">script</span>'
        + '</div>';

      // Script title
      html += '<div class="psp-head">' + escapeHtml(t.script.title) + '</div>';

      // Shots
      if (t.script.shots && t.script.shots.length > 0) {
        for (var s = 0; s < t.script.shots.length; s++) {
          var shot = t.script.shots[s];
          html += '<div class="psp-shot">';
          html += '<div class="psp-n">PLAN ' + (s + 1) + '</div>';
          html += '<div class="psp-d">' + escapeHtml(shot.d || '') + '</div>';
          html += '</div>';
        }
      }

      html += '</div>'; // psp-inner
      html += '</div>'; // prod-script-panel
    }

    html += '</div>'; // prod-card
  }

  if (PROD.length === 0) {
    html += '<div style="text-align:center;padding:32px 16px;color:#9CA3AF;font-size:13px;">'
      + 'Aucune tache de production'
      + '</div>';
  }

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  Toggle Production Task Done State
// ═══════════════════════════════════════════════

function toggleProd(id) {
  for (var i = 0; i < PROD.length; i++) {
    if ((PROD[i].id || i) == id) {
      PROD[i].done = !PROD[i].done;
      break;
    }
  }
  save();
  renderProd();
  renderKPIs();
}

// ═══════════════════════════════════════════════
//  Toggle Script Panel
// ═══════════════════════════════════════════════

function toggleProdScript(id) {
  var panel = document.getElementById('prod-script-' + id);
  if (!panel) return;
  panel.classList.toggle('open');
}

// ═══════════════════════════════════════════════
//  Production Modal (New / Edit)
// ═══════════════════════════════════════════════

function openProdModal(idx) {
  var isNew = idx === -1;
  var t = isNew ? {} : (PROD[idx] || {});
  var id = isNew ? (Date.now() + '_' + Math.random().toString(36).substr(2, 5)) : (t.id || idx);

  _pe = {
    id: id,
    date: t.date || '',
    em: t.em || '',
    title: t.title || '',
    desc: t.desc || '',
    plat: t.plat || '',
    fmt: t.fmt || '',
    posts: t.posts || '',
    note: t.note || '',
    launch: t.launch || false,
    script: t.script ? { title: t.script.title || '', shots: [] } : { title: '', shots: [] }
  };

  // Deep copy shots
  if (t.script && t.script.shots) {
    for (var s = 0; s < t.script.shots.length; s++) {
      _pe.script.shots.push({ d: t.script.shots[s].d || '' });
    }
  }

  var platformOptions = ['', 'Instagram', 'TikTok', 'YouTube', 'Snapchat', 'Twitter', 'LinkedIn', 'Pinterest', 'TikTok + Insta', 'Instagram + TikTok', 'Autre'];
  var platformSelect = '';
  for (var p = 0; p < platformOptions.length; p++) {
    var psel = _pe.plat === platformOptions[p] ? ' selected' : '';
    var plabel = platformOptions[p] || '-- Plateforme --';
    platformSelect += '<option value="' + escapeHtml(platformOptions[p]) + '"' + psel + '>' + escapeHtml(plabel) + '</option>';
  }

  var formatOptions = ['', 'Reel', 'Carousel', 'Photo', 'Story', 'IGTV', 'TikTok', 'Short', 'Vlog', 'GRWM / Reel', 'Unboxing', 'Haul', 'Transformation', 'Haul shopping', 'Carousel 7 slides', 'Carousel + TikToks', 'TikTok + Reel', 'TikTok humour', 'Reel + TikTok', 'Autre'];
  var formatSelect = '';
  for (var f = 0; f < formatOptions.length; f++) {
    var fsel = _pe.fmt === formatOptions[f] ? ' selected' : '';
    var flabel = formatOptions[f] || '-- Format --';
    formatSelect += '<option value="' + escapeHtml(formatOptions[f]) + '"' + fsel + '>' + escapeHtml(flabel) + '</option>';
  }

  // Build shots HTML
  var shotsHtml = '';
  for (var sh = 0; sh < _pe.script.shots.length; sh++) {
    shotsHtml += shotEditHtml(sh, _pe.script.shots[sh].d || '');
  }

  var html = '<button class="modal-x" onclick="closeModal()">&times;</button>'
    + '<h2>' + (isNew ? 'Nouvelle tache' : 'Modifier la tache') + '</h2>'

    // Date + Emoji row
    + '<div class="fg">'
    + '<div class="fr"><label>Date</label><input type="text" id="pe-date" value="' + escapeHtml(_pe.date) + '" placeholder="ex: Mer 5 Mars"></div>'
    + '<div class="fr"><label>Emoji</label><input type="text" id="pe-em" value="' + escapeHtml(_pe.em) + '" placeholder="ex: \uD83C\uDFA5" maxlength="4"></div>'
    + '</div>'

    // Title
    + '<div class="fr"><label>Titre</label><input type="text" id="pe-title" value="' + escapeHtml(_pe.title) + '" placeholder="Titre de la tache..."></div>'

    // Description
    + '<div class="fr"><label>Description</label><textarea id="pe-desc" rows="2" placeholder="Description...">' + escapeHtml(_pe.desc) + '</textarea></div>'

    // Platform + Format row
    + '<div class="fg">'
    + '<div class="fr"><label>Plateforme</label><select id="pe-plat">' + platformSelect + '</select></div>'
    + '<div class="fr"><label>Format</label><select id="pe-fmt">' + formatSelect + '</select></div>'
    + '</div>'

    // Nb posts + Note row
    + '<div class="fg">'
    + '<div class="fr"><label>Nb posts</label><input type="number" id="pe-posts" value="' + escapeHtml(String(_pe.posts)) + '" min="0" placeholder="0"></div>'
    + '<div class="fr"><label>Note</label><input type="text" id="pe-note" value="' + escapeHtml(_pe.note) + '" placeholder="Note rapide..."></div>'
    + '</div>'

    // Launch toggle
    + '<div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">'
    + '<input type="checkbox" id="pe-launch"' + (_pe.launch ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--rose);">'
    + '<label for="pe-launch" style="font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;">⭐ Priorité</label>'
    + '</div>'

    + '<hr class="sep">'

    // Script section
    + '<div style="margin-bottom:6px;font-size:11px;font-weight:700;color:var(--violet);text-transform:uppercase;letter-spacing:.5px;">Script</div>'
    + '<div class="fr"><label>Titre du script</label><input type="text" id="pe-script-title" value="' + escapeHtml(_pe.script.title) + '" placeholder="Titre du script..."></div>'
    + '<button class="btn-ai-sm" id="ai-prod-modal-btn" onclick="generateProdModalScript()" style="margin-bottom:10px;">\u2728 Générer le script avec IA</button>'

    // Shot list
    + '<div id="pe-shots">' + shotsHtml + '</div>'
    + '<button class="add-btn" onclick="addShot()">+ Ajouter un plan</button>'

    // Actions
    + '<div class="modal-acts">';

  if (!isNew) {
    html += '<button class="btn-d" onclick="delProd(\'' + id + '\')">Supprimer</button>';
  }

  html += '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="saveProd(\'' + id + '\',' + isNew + ',' + idx + ')">Enregistrer</button>'
    + '</div>';

  openModal(html);
}

// ─── Shot Editor Row HTML ───
function shotEditHtml(i, d) {
  return '<div class="shot-edit" id="shot-row-' + i + '">'
    + '<div class="shot-edit-n">PLAN ' + (i + 1) + '</div>'
    + '<textarea placeholder="Description du plan..." onchange="updShot(' + i + ',this.value)" oninput="updShot(' + i + ',this.value)">' + escapeHtml(d) + '</textarea>'
    + '<button class="shot-edit-del" onclick="removeShot(' + i + ')">Suppr.</button>'
    + '</div>';
}

// ─── Add Shot ───
function addShot() {
  if (!_pe) return;
  _pe.script.shots.push({ d: '' });
  var container = document.getElementById('pe-shots');
  if (container) {
    container.innerHTML = '';
    for (var i = 0; i < _pe.script.shots.length; i++) {
      container.innerHTML += shotEditHtml(i, _pe.script.shots[i].d || '');
    }
  }
}

// ─── Remove Shot ───
function removeShot(i) {
  if (!_pe) return;
  _pe.script.shots.splice(i, 1);
  var container = document.getElementById('pe-shots');
  if (container) {
    container.innerHTML = '';
    for (var k = 0; k < _pe.script.shots.length; k++) {
      container.innerHTML += shotEditHtml(k, _pe.script.shots[k].d || '');
    }
  }
}

// ─── Update Shot Description ───
function updShot(i, v) {
  if (!_pe || !_pe.script.shots[i]) return;
  _pe.script.shots[i].d = v;
}

// ─── Save Production Task ───
function saveProd(id, isNew, idx) {
  var dateVal = (document.getElementById('pe-date') || {}).value || '';
  var emVal = (document.getElementById('pe-em') || {}).value || '';
  var titleVal = (document.getElementById('pe-title') || {}).value || '';
  var descVal = (document.getElementById('pe-desc') || {}).value || '';
  var platVal = (document.getElementById('pe-plat') || {}).value || '';
  var fmtVal = (document.getElementById('pe-fmt') || {}).value || '';
  var postsVal = (document.getElementById('pe-posts') || {}).value || '';
  var noteVal = (document.getElementById('pe-note') || {}).value || '';
  var launchVal = (document.getElementById('pe-launch') || {}).checked || false;
  var scriptTitle = (document.getElementById('pe-script-title') || {}).value || '';

  var task = {
    id: id,
    date: dateVal,
    em: emVal,
    title: titleVal,
    desc: descVal,
    plat: platVal,
    fmt: fmtVal,
    posts: postsVal,
    note: noteVal,
    launch: launchVal,
    done: false,
    script: {
      title: scriptTitle,
      shots: _pe ? _pe.script.shots : []
    }
  };

  if (isNew) {
    PROD.push(task);
  } else {
    // Preserve done state
    if (PROD[idx]) {
      task.done = PROD[idx].done;
    }
    PROD[idx] = task;
  }

  save();
  renderProd();
  renderKPIs();
  closeModal();
  _pe = null;
  showSync('Tache enregistree', null);
}

// ─── Delete Production Task ───
function delProd(id) {
  askConfirm('Supprimer cette tache de production ?', function() {
    for (var i = 0; i < PROD.length; i++) {
      if ((PROD[i].id || i) == id) {
        PROD.splice(i, 1);
        break;
      }
    }
    save();
    renderProd();
    renderKPIs();
    closeModal();
    _pe = null;
    showSync('Tache supprimee', null);
  });
}

// ═══════════════════════════════════════════════
//  Production Calendar & Events
// ═══════════════════════════════════════════════

var EVENTS = [];

// ─── Load / Save Events ───

async function loadEvents() {
  var data = await cloudLoad('events2', []);
  EVENTS = Array.isArray(data) ? data : [];
}

function saveEvents() {
  cloudSave('events2', EVENTS);
}

// ─── Switch Production View (list / calendar) ───

function setProdView(view, btn) {
  prodView = view;

  document.querySelectorAll('#pvt-prod-list,#pvt-prod-cal').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  var listEl = document.getElementById('prod-list-view');
  var calEl = document.getElementById('prod-cal-view');

  if (listEl) listEl.style.display = view === 'list' ? '' : 'none';
  if (calEl) calEl.style.display = view === 'cal' ? '' : 'none';

  if (view === 'cal') {
    renderProdCal();
  }
}

// ─── Render Production Calendar ───

function renderProdCal() {
  var container = document.getElementById('prod-cal-inner');
  if (!container) return;

  var monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  var dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  var y = prodCalY;
  var m = prodCalM;

  // First day of month (0=Sun..6=Sat) -> convert to Mon=0..Sun=6
  var firstDay = new Date(y, m, 1).getDay();
  var startOffset = (firstDay + 6) % 7;

  // Days in this month
  var daysInMonth = new Date(y, m + 1, 0).getDate();

  // Days in previous month
  var daysInPrev = new Date(y, m, 0).getDate();

  // Today
  var now = new Date();
  var todayY = now.getFullYear();
  var todayM = now.getMonth();
  var todayD = now.getDate();

  // Build events map by date key "YYYY-MM-DD"
  var evMap = {};
  for (var e = 0; e < EVENTS.length; e++) {
    var ev = EVENTS[e];
    if (ev.dateStart) {
      var key = ev.dateStart;
      if (!evMap[key]) evMap[key] = [];
      evMap[key].push(ev);
    }
  }

  var html = '';

  // Toolbar
  html += '<div class="ecal-toolbar">'
    + '<button class="ecal-add-btn" onclick="openEcalModal(null, {year:' + y + ',month:' + m + ',day:1})">'
    + '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>'
    + 'Ajouter'
    + '</button>'
    + '<button class="ecal-export-btn" onclick="exportICS()" title="Exporter vers Outlook / Apple Calendar">'
    + '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    + ' Export Outlook'
    + '</button>'
    + '<div class="ecal-nav">'
    + '<button class="ecal-nav-btn" onclick="prodCalMove(-1)">&lsaquo;</button>'
    + '<span class="ecal-month">' + monthNames[m] + ' ' + y + '</span>'
    + '<button class="ecal-nav-btn" onclick="prodCalMove(1)">&rsaquo;</button>'
    + '</div>'
    + '</div>';

  // Grid
  html += '<div style="background:#fff;border:1.5px solid var(--bord);border-radius:12px;overflow:hidden;">';

  // Day name headers
  html += '<div class="ecal-grid">';
  for (var d = 0; d < 7; d++) {
    html += '<div class="ecal-dname">' + dayNames[d] + '</div>';
  }

  // Calendar cells
  var totalCells = startOffset + daysInMonth;
  var rows = Math.ceil(totalCells / 7) * 7;

  for (var c = 0; c < rows; c++) {
    var dayNum;
    var cellMonth = m;
    var cellYear = y;
    var isOther = false;

    if (c < startOffset) {
      // Previous month
      dayNum = daysInPrev - startOffset + c + 1;
      cellMonth = m - 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear = y - 1; }
      isOther = true;
    } else if (c >= startOffset + daysInMonth) {
      // Next month
      dayNum = c - startOffset - daysInMonth + 1;
      cellMonth = m + 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear = y + 1; }
      isOther = true;
    } else {
      dayNum = c - startOffset + 1;
    }

    var isToday = (cellYear === todayY && cellMonth === todayM && dayNum === todayD && !isOther);
    var cellClass = 'ecal-cell';
    if (isOther) cellClass += ' other-month';
    if (isToday) cellClass += ' today';

    // Date key for events
    var cm = String(cellMonth + 1);
    if (cm.length < 2) cm = '0' + cm;
    var cd = String(dayNum);
    if (cd.length < 2) cd = '0' + cd;
    var dateKey = cellYear + '-' + cm + '-' + cd;

    html += '<div class="' + cellClass + '" onclick="handleEcalCellClick(' + dayNum + ',' + cellMonth + ',' + cellYear + ')">';

    // Day number
    if (isToday) {
      html += '<div class="ecal-day"><span class="ecal-day-num">' + dayNum + '</span></div>';
    } else {
      html += '<div class="ecal-day">' + dayNum + '</div>';
    }

    // Events for this day
    var dayEvents = evMap[dateKey] || [];
    var maxShow = 3;
    for (var de = 0; de < dayEvents.length && de < maxShow; de++) {
      var evt = dayEvents[de];
      var evType = evt.type || 'other';
      html += '<span class="ecal-event type-' + escapeHtml(evType) + '" onclick="event.stopPropagation();openEcalModal(\'' + escapeHtml(evt.id || '') + '\')">'
        + (evt.emoji ? escapeHtml(evt.emoji) + ' ' : '')
        + escapeHtml(evt.title || '')
        + '</span>';
    }
    if (dayEvents.length > maxShow) {
      html += '<span class="ecal-more">+' + (dayEvents.length - maxShow) + ' de plus</span>';
    }

    html += '</div>';
  }

  html += '</div>'; // ecal-grid
  html += '</div>'; // wrapper

  container.innerHTML = html;
}

// ─── Handle Calendar Cell Click ───

function handleEcalCellClick(day, mo, yr) {
  openEcalModal(null, { year: yr, month: mo, day: day });
}

// ─── Navigate Calendar Months ───

function prodCalMove(dir) {
  prodCalM += dir;
  if (prodCalM < 0) {
    prodCalM = 11;
    prodCalY--;
  } else if (prodCalM > 11) {
    prodCalM = 0;
    prodCalY++;
  }
  renderProdCal();
}

// ═══════════════════════════════════════════════
//  Event Calendar Modal (uses dedicated #ecal-modal)
// ═══════════════════════════════════════════════

function openEcalModal(id, prefill) {
  var isEdit = id !== null && id !== undefined && id !== '';
  var ev = {};

  if (isEdit) {
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) {
        ev = EVENTS[i];
        break;
      }
    }
  }

  // Build prefilled date if provided
  var prefillDate = '';
  if (prefill && prefill.year) {
    var pm = String(prefill.month + 1);
    if (pm.length < 2) pm = '0' + pm;
    var pd = String(prefill.day);
    if (pd.length < 2) pd = '0' + pd;
    prefillDate = prefill.year + '-' + pm + '-' + pd;
  }

  var typeVal = ev.type || (window._ecalType || 'event');
  var emojiVal = ev.emoji || '';
  var titleVal = ev.title || '';
  var dateStartVal = ev.dateStart || prefillDate || '';
  var dateEndVal = ev.dateEnd || '';
  var timeStartVal = ev.timeStart || '';
  var timeEndVal = ev.timeEnd || '';
  var noteVal = ev.note || '';

  window._ecalType = typeVal;

  var types = [
    { key: 'prod', label: 'Production' },
    { key: 'shoot', label: 'Shoot' },
    { key: 'event', label: 'Evenement' },
    { key: 'collab', label: 'Collab' },
    { key: 'activite', label: 'Activité' },
    { key: 'other', label: 'Autre' }
  ];

  var typeBtns = '';
  for (var t = 0; t < types.length; t++) {
    var tp = types[t];
    var activeClass = typeVal === tp.key ? ' active' : '';
    typeBtns += '<button class="em-type-btn type-' + tp.key + activeClass + '" onclick="ecalSetType(\'' + tp.key + '\',this)">'
      + escapeHtml(tp.label)
      + '</button>';
  }

  var eventId = isEdit ? ev.id : (Date.now() + '_' + Math.random().toString(36).substr(2, 5));

  // Update modal title
  var titleEl = document.getElementById('ecal-modal-title');
  if (titleEl) titleEl.textContent = isEdit ? 'Modifier l\'evenement' : 'Nouvel evenement';

  var html = ''
    // Type selector
    + '<div class="em-type-row">' + typeBtns + '</div>'

    // Emoji + Title row
    + '<div class="fg">'
    + '<div class="fr"><label>Emoji</label><input type="text" id="ecal-emoji" value="' + escapeHtml(emojiVal) + '" placeholder="ex: \uD83C\uDFA5" maxlength="4"></div>'
    + '<div class="fr"><label>Titre</label><input type="text" id="ecal-title" value="' + escapeHtml(titleVal) + '" placeholder="Titre de l\'evenement..."></div>'
    + '</div>'

    // Date start / end
    + '<div class="em-date-row">'
    + '<div class="fr"><label>Date debut</label><input type="date" id="ecal-date-start" value="' + escapeHtml(dateStartVal) + '"></div>'
    + '<div class="fr"><label>Date fin</label><input type="date" id="ecal-date-end" value="' + escapeHtml(dateEndVal) + '"></div>'
    + '</div>'

    // Time start / end
    + '<div class="em-time-row">'
    + '<div class="fr"><label>Heure debut</label><input type="time" id="ecal-time-start" value="' + escapeHtml(timeStartVal) + '"></div>'
    + '<div class="fr"><label>Heure fin</label><input type="time" id="ecal-time-end" value="' + escapeHtml(timeEndVal) + '"></div>'
    + '</div>'

    // Note
    + '<div class="fr"><label>Note</label><textarea id="ecal-note" rows="2" placeholder="Notes...">' + escapeHtml(noteVal) + '</textarea></div>'

    // Actions
    + '<div class="modal-acts">';

  if (isEdit) {
    html += '<button class="btn-d" onclick="deleteEcalEvent(\'' + escapeHtml(eventId) + '\')">Supprimer</button>';
  }

  html += '<button class="btn-s" onclick="closeEcalModal()">Annuler</button>'
    + '<button class="btn-p" onclick="saveEcalEvent(\'' + escapeHtml(eventId) + '\',' + isEdit + ')">Enregistrer</button>'
    + '</div>';

  // Render into dedicated ecal-modal
  var body = document.getElementById('ecal-modal-body');
  if (body) body.innerHTML = html;
  var modal = document.getElementById('ecal-modal');
  if (modal) modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// ─── Close Event Modal ───

function closeEcalModal() {
  var modal = document.getElementById('ecal-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ─── Set Event Type ───

function ecalSetType(t, btn) {
  window._ecalType = t;

  var btns = document.querySelectorAll('.em-type-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove('active');
  }
  if (btn) btn.classList.add('active');
}

// ─── Save Event ───

function saveEcalEvent(id, isEdit) {
  var emojiVal = (document.getElementById('ecal-emoji') || {}).value || '';
  var titleVal = (document.getElementById('ecal-title') || {}).value || '';
  var dateStartVal = (document.getElementById('ecal-date-start') || {}).value || '';
  var dateEndVal = (document.getElementById('ecal-date-end') || {}).value || '';
  var timeStartVal = (document.getElementById('ecal-time-start') || {}).value || '';
  var timeEndVal = (document.getElementById('ecal-time-end') || {}).value || '';
  var noteVal = (document.getElementById('ecal-note') || {}).value || '';
  var typeVal = window._ecalType || 'event';

  var ev = {
    id: id,
    type: typeVal,
    emoji: emojiVal,
    title: titleVal,
    dateStart: dateStartVal,
    dateEnd: dateEndVal,
    timeStart: timeStartVal,
    timeEnd: timeEndVal,
    note: noteVal
  };

  if (isEdit) {
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) {
        EVENTS[i] = ev;
        break;
      }
    }
  } else {
    EVENTS.push(ev);
  }

  saveEvents();
  renderProdCal();
  closeEcalModal();
  showSync('Evenement enregistre', null);
}

// ─── Delete Event ───

// ─── Export ICS (Outlook / Apple Calendar) ───
function exportICS() {
  if (!EVENTS || EVENTS.length === 0) {
    showSync('\u26A0\uFE0F Aucun événement à exporter', 'rgba(245,158,11,.8)');
    return;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function toICSDate(dateStr, timeStr) {
    if (!dateStr) return null;
    var d = dateStr.replace(/-/g, '');
    if (timeStr) {
      var parts = timeStr.split(':');
      var h = pad(parseInt(parts[0]) || 0);
      var mn = pad(parseInt(parts[1]) || 0);
      return d + 'T' + h + mn + '00';
    }
    return d;
  }

  function escICS(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meryne Studio//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Meryne Studio',
    'X-WR-TIMEZONE:Europe/Paris'
  ];

  EVENTS.forEach(function(ev) {
    if (!ev.dateStart) return;
    var dtstart = toICSDate(ev.dateStart, ev.timeStart);
    var dtend   = toICSDate(ev.dateEnd || ev.dateStart, ev.timeEnd || ev.timeStart);
    var allDay  = !ev.timeStart;

    // If no end time, add 1 day for all-day, or 1 hour for timed
    if (!dtend || dtend === dtstart) {
      if (allDay) {
        var d = new Date(ev.dateStart);
        d.setDate(d.getDate() + 1);
        dtend = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
      } else {
        dtend = dtstart.slice(0,8) + 'T' + pad((parseInt(dtstart.slice(9,11))+1) % 24) + dtstart.slice(11);
      }
    }

    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + ev.id + '@mey-studio.netlify.app');
    if (allDay) {
      lines.push('DTSTART;VALUE=DATE:' + dtstart);
      lines.push('DTEND;VALUE=DATE:' + dtend);
    } else {
      lines.push('DTSTART;TZID=Europe/Paris:' + dtstart);
      lines.push('DTEND;TZID=Europe/Paris:' + dtend);
    }
    lines.push('SUMMARY:' + escICS((ev.emoji ? ev.emoji + ' ' : '') + (ev.title || '')));
    if (ev.note) lines.push('DESCRIPTION:' + escICS(ev.note));
    lines.push('CATEGORIES:' + escICS((ev.type || 'other').toUpperCase()));
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  var ics = lines.join('\r\n');
  var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'meryne-studio-events.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showSync('\uD83D\uDCC5 Export Outlook téléchargé !', 'rgba(5,150,105,.8)');
}

function deleteEcalEvent(id) {
  askConfirm('Supprimer cet evenement ?', function() {
    for (var i = 0; i < EVENTS.length; i++) {
      if (EVENTS[i].id === id) {
        EVENTS.splice(i, 1);
        break;
      }
    }
    saveEvents();
    renderProdCal();
    closeEcalModal();
    showSync('Evenement supprime', null);
  });
}
