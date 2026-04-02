/* ═══════════════════════════════════════════════
   MERYNE STUDIO V5 — Planning Calendar
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

  var html = '<div class="pcal-nav">'
    + '<button class="pcal-add-btn" onclick="openPubModal(-1)">'
    + '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
    + ' Ajouter</button>'
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
      var dayPubs = pubsByDay[key] || [];
      dayPubs.slice(0, 3).forEach(function(p) {
        var platCls = {tiktok:'tt', insta:'ig', stories:'st'}[p.plat] || 'ig';
        var short = p.title.length > 18 ? p.title.slice(0, 17) + '…' : p.title;
        html += '<div class="pcal-pip ' + platCls + (p.done ? ' done' : '') + '"'
          + ' draggable="true"'
          + ' ondragstart="calDragStart(event,\'' + p.id + '\')"'
          + ' onclick="event.stopPropagation();openPubById(\'' + p.id + '\')"'
          + ' title="' + escapeHtml(p.title) + '">'
          + escapeHtml(short) + '</div>';
      });
      if (dayPubs.length > 3) {
        html += '<div style="font-size:9px;color:var(--muted)">+' + (dayPubs.length - 3) + ' autres</div>';
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
