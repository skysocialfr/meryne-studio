/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Planning Calendar
   ═══════════════════════════════════════════════ */

var _calNow = new Date();
var calY = _calNow.getFullYear(), calM = _calNow.getMonth();
var _calDragId = null;

function renderCalendar() {
  var el = document.getElementById('plan-cal-inner');
  if (!el) return;

  var DNAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  var MNAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  var y = calY, m = calM;
  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var offset = (firstDay + 6) % 7;
  var today = new Date();

  var pubsByDay = {};
  (PUBS || []).forEach(function(p) {
    var key = p.day + '-' + p.mo + '-' + p.yr;
    if (!pubsByDay[key]) pubsByDay[key] = [];
    pubsByDay[key].push(p);
  });

  var eventsByDay = {};
  (CAL_EVENTS || []).forEach(function(ev) {
    var key = ev.day + '-' + ev.mo + '-' + ev.yr;
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  });

  var html = '<div class="pcal-nav">'
    + '<button class="pcal-add-btn" onclick="openPubModal(-1)">'
    + '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
    + ' Post</button>'
    + '<button class="pcal-add-btn pcal-add-event" onclick="openEventModal(null)">'
    + '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
    + ' Événement</button>'
    + '<button class="pcal-nav-btn" onclick="calMove(-1)">‹</button>'
    + '<div class="pcal-month">' + MNAMES[m] + ' ' + y + '</div>'
    + '<button class="pcal-nav-btn" onclick="calMove(1)">›</button>'
    + '</div>';

  html += '<div class="pcal-grid">';
  DNAMES.forEach(function(d) {
    html += '<div class="pcal-dname">' + d + '</div>';
  });

  var totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  for (var i = 0; i < totalCells; i++) {
    var day = i - offset + 1;
    var isCurrentMonth = day >= 1 && day <= daysInMonth;
    var isToday = isCurrentMonth && day === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    var cls = 'pcal-cell' + (isToday ? ' today' : '') + (!isCurrentMonth ? ' other-month' : '');

    html += '<div class="' + cls + '"'
      + ' onclick="handleCalCellClick(' + day + ',' + m + ',' + y + ')"'
      + ' ondragover="calDragOver(event)"'
      + ' ondragleave="calDragLeave(event)"'
      + ' ondrop="calDrop(event,' + day + ',' + m + ',' + y + ')"'
      + '>';

    if (isCurrentMonth) {
      html += '<div class="pcal-day">' + (isToday ? '<span class="today-badge">' + day + '</span>' : day) + '</div>';
      var key = day + '-' + m + '-' + y;
      // Events first (so they always show, even when many pubs)
      var dayEvents = eventsByDay[key] || [];
      dayEvents.slice(0, 2).forEach(function(ev) {
        var short = (ev.title || '').length > 18 ? ev.title.slice(0, 17) + '…' : (ev.title || 'Événement');
        html += '<div class="pcal-pip pcal-pip-event"'
          + ' style="--ev-color:' + (ev.color || '#F59E0B') + ';"'
          + ' onclick="event.stopPropagation();openEventModal(\'' + ev.id + '\')"'
          + ' title="' + escapeHtml(ev.title || '') + '">'
          + (ev.emoji ? escapeHtml(ev.emoji) + ' ' : '📅 ')
          + escapeHtml(short) + '</div>';
      });
      var pubsLimit = Math.max(0, 3 - Math.min(dayEvents.length, 2));
      var dayPubs = pubsByDay[key] || [];
      dayPubs.slice(0, pubsLimit).forEach(function(p) {
        var platCls = {tiktok:'tt', insta:'ig', stories:'st'}[p.plat] || 'ig';
        var short = p.title.length > 18 ? p.title.slice(0, 17) + '…' : p.title;
        html += '<div class="pcal-pip ' + platCls + (p.done ? ' done' : '') + '"'
          + ' draggable="true"'
          + ' ondragstart="calDragStart(event,\'' + p.id + '\')"'
          + ' onclick="event.stopPropagation();openPubById(\'' + p.id + '\')"'
          + ' title="' + escapeHtml(p.title) + '">'
          + escapeHtml(short) + '</div>';
      });
      var overflow = (dayPubs.length - pubsLimit) + Math.max(0, dayEvents.length - 2);
      if (overflow > 0) {
        html += '<div style="font-size:9px;color:var(--muted)">+' + overflow + ' autres</div>';
      }
    }
    html += '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

function calMove(dir) {
  calM += dir;
  if (calM > 11) { calM = 0; calY++; }
  if (calM < 0) { calM = 11; calY--; }
  renderCalendar();
}

function handleCalCellClick(day, mo, yr) {
  var dayPubs = (PUBS || []).filter(function(p) {
    return p.day === day && p.mo === mo && p.yr === yr;
  });

  if (dayPubs.length === 1) {
    openPubById(dayPubs[0].id);
  } else if (dayPubs.length > 1) {
    var html = '<button class="modal-x" onclick="closeModal()">✕</button><h2>' + day + '/' + (mo + 1) + '/' + yr + '</h2>';
    dayPubs.forEach(function(p) {
      html += '<div onclick="closeModal();openPubById(\'' + p.id + '\')" style="padding:10px 12px;border:1.5px solid var(--bord);border-radius:10px;cursor:pointer;margin-bottom:7px;font-size:13px;font-weight:600;">'
        + escapeHtml(p.title)
        + '<div style="font-size:10px;color:var(--muted);margin-top:2px;">' + escapeHtml(p.plat) + ' · ' + escapeHtml(p.heure) + '</div></div>';
    });
    html += '<div class="modal-acts"><button class="btn-s" onclick="closeModal()">Fermer</button><button class="btn-p" onclick="closeModal();openPubModal(-1)">＋ Ajouter</button></div>';
    openModal(html);
  } else {
    openNewPubForDay(day, mo, yr);
  }
}

function openNewPubForDay(day, mo, yr) {
  openPubModal(-1);
  setTimeout(function() {
    var d = document.getElementById('ppe-day');
    var m2 = document.getElementById('ppe-mo');
    if (d) d.value = day;
    if (m2) m2.value = mo;
    var de = document.getElementById('ppe-date');
    if (de) de.value = String(day).padStart(2, '0') + '/' + String(mo + 1).padStart(2, '0');
  }, 50);
}

// ─── Calendar Drag-and-Drop ───
function calDragStart(e, pubId) {
  e.stopPropagation();
  _calDragId = pubId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', pubId);
}

function calDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.style.background = 'rgba(255,45,122,.12)';
  e.currentTarget.style.outline = '2px dashed var(--rose)';
}

function calDragLeave(e) {
  e.currentTarget.style.background = '';
  e.currentTarget.style.outline = '';
}

function calDrop(e, day, mo, yr) {
  e.preventDefault();
  e.currentTarget.style.background = '';
  e.currentTarget.style.outline = '';
  var pubId = _calDragId || e.dataTransfer.getData('text/plain');
  _calDragId = null;
  if (!pubId) return;
  var p = (PUBS || []).find(function(x) { return x.id === pubId; });
  if (!p) return;
  p.day = day;
  p.mo = mo;
  p.yr = yr;
  p.date = String(day).padStart(2, '0') + '/' + String(mo + 1).padStart(2, '0');
  save();
  renderCalendar();
  renderPlanning();
}

// ═══════════════════════════════════════════════
//  Calendar Events (Fashion Week, lancements, etc.)
// ═══════════════════════════════════════════════

var _evNow = new Date();

function openEventModal(id, prefillDay, prefillMo, prefillYr) {
  if (typeof openModal !== 'function') return;
  var ev = id ? (CAL_EVENTS || []).find(function(x) { return x.id === id; }) : null;
  var isEdit = !!ev;
  var palette = [
    { hex: '#F59E0B', label: 'Ambre' },
    { hex: '#EC4899', label: 'Rose' },
    { hex: '#7C3AED', label: 'Violet' },
    { hex: '#06B6D4', label: 'Cyan' },
    { hex: '#10B981', label: 'Vert' },
    { hex: '#EF4444', label: 'Rouge' },
    { hex: '#6B7280', label: 'Gris' }
  ];
  var pickedColor = ev ? (ev.color || palette[0].hex) : palette[0].hex;
  var day = ev ? ev.day : (prefillDay || _evNow.getDate());
  var mo  = ev ? ev.mo  : (prefillMo  != null ? prefillMo  : _evNow.getMonth());
  var yr  = ev ? ev.yr  : (prefillYr  || _evNow.getFullYear());
  var dateStr = String(day).padStart(2, '0') + '-' + String(mo + 1).padStart(2, '0') + '-' + yr;

  var swatches = palette.map(function(c) {
    return '<button type="button" class="ev-swatch' + (c.hex === pickedColor ? ' sel' : '') + '"'
      + ' style="background:' + c.hex + ';"'
      + ' onclick="_pickEventColor(\'' + c.hex + '\',this)"'
      + ' title="' + c.label + '" aria-label="' + c.label + '"></button>';
  }).join('');

  var html = '<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>📅 ' + (isEdit ? 'Modifier l\'événement' : 'Nouvel événement') + '</h2>'

    + '<div class="fr"><label>Titre</label>'
    + '<input id="ev-title" type="text" value="' + escapeHtml(ev ? (ev.title || '') : '') + '" placeholder="Fashion Week, lancement de marque…" autofocus></div>'

    + '<div style="display:grid;grid-template-columns:80px 1fr;gap:8px;align-items:end;">'
    +   '<div class="fr"><label>Emoji</label>'
    +     '<input id="ev-emoji" type="text" value="' + escapeHtml(ev ? (ev.emoji || '') : '') + '" maxlength="4" placeholder="🎟️" style="text-align:center;"></div>'
    +   '<div class="fr"><label>Date (jj-mm-aaaa)</label>'
    +     '<input id="ev-date" type="text" value="' + escapeHtml(dateStr) + '" placeholder="15-09-2026"></div>'
    + '</div>'

    + '<div class="fr"><label>Note (optionnel)</label>'
    + '<textarea id="ev-note" rows="2" placeholder="Lieu, contacts, accessoires à prendre…">' + escapeHtml(ev ? (ev.note || '') : '') + '</textarea></div>'

    + '<div class="fr"><label>Couleur</label>'
    + '<div class="ev-swatch-row" data-color="' + pickedColor + '">' + swatches + '</div></div>'

    + '<div class="modal-acts">'
    + (isEdit ? '<button class="btn-d" onclick="deleteEvent(\'' + ev.id + '\')" style="margin-right:auto;">Supprimer</button>' : '')
    + '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="saveEvent(\'' + (ev ? ev.id : '') + '\')">' + (isEdit ? 'Enregistrer' : 'Créer') + '</button>'
    + '</div>';

  openModal(html);
}

function _pickEventColor(hex, el) {
  var row = el && el.parentNode;
  if (!row) return;
  row.setAttribute('data-color', hex);
  row.querySelectorAll('.ev-swatch').forEach(function(b) { b.classList.remove('sel'); });
  el.classList.add('sel');
}

function _parseEvDate(str) {
  var m = (str || '').match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!m) return null;
  var d = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1;
  var y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  if (isNaN(d) || d < 1 || d > 31) return null;
  if (isNaN(mo) || mo < 0 || mo > 11) return null;
  if (isNaN(y) || y < 2000) return null;
  return { day: d, mo: mo, yr: y };
}

function saveEvent(id) {
  var title = ((document.getElementById('ev-title') || {}).value || '').trim();
  var emoji = ((document.getElementById('ev-emoji') || {}).value || '').trim();
  var note  = ((document.getElementById('ev-note')  || {}).value || '').trim();
  var dateStr = ((document.getElementById('ev-date') || {}).value || '').trim();
  var colorRow = document.querySelector('.ev-swatch-row');
  var color = (colorRow && colorRow.getAttribute('data-color')) || '#F59E0B';

  if (!title) { showSync('⚠️ Titre requis', 'rgba(245,158,11,.8)'); return; }
  var parsed = _parseEvDate(dateStr);
  if (!parsed) { showSync('⚠️ Date invalide (jj-mm-aaaa)', 'rgba(245,158,11,.8)'); return; }

  if (!Array.isArray(CAL_EVENTS)) CAL_EVENTS = [];
  if (id) {
    var idx = CAL_EVENTS.findIndex(function(x) { return x.id === id; });
    if (idx === -1) return;
    CAL_EVENTS[idx] = Object.assign(CAL_EVENTS[idx], {
      title: title, emoji: emoji, note: note, color: color,
      day: parsed.day, mo: parsed.mo, yr: parsed.yr
    });
  } else {
    CAL_EVENTS.push({
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: title, emoji: emoji, note: note, color: color,
      day: parsed.day, mo: parsed.mo, yr: parsed.yr,
      created_at: new Date().toISOString()
    });
  }
  save();
  closeModal();
  renderCalendar();
  showSync(id ? '✅ Événement mis à jour' : '✅ Événement ajouté', 'rgba(5,150,105,.8)');
}

function deleteEvent(id) {
  if (typeof askConfirm !== 'function') {
    CAL_EVENTS = (CAL_EVENTS || []).filter(function(x) { return x.id !== id; });
    save(); closeModal(); renderCalendar();
    return;
  }
  askConfirm('Supprimer cet événement ?', function() {
    CAL_EVENTS = (CAL_EVENTS || []).filter(function(x) { return x.id !== id; });
    save();
    closeModal();
    renderCalendar();
    showSync('🗑️ Événement supprimé', 'rgba(124,58,237,.8)');
  });
}
