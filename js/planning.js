/* ===============================================
   MERYNE STUDIO V5 — Planning Section
   =============================================== */

// ─── Search State ───
var fSearch = '';
var fSem = 'all'; // kept for compatibility
var fPlat = 'all';

// ─── Group collapse state ───
var _grpCollapsed = { pub: true };

function setSearch(val) {
  fSearch = (val || '').toLowerCase();
  renderPlanning();
}

// ─── Today Reminder ───
function checkTodayReminders() {
  var banner = document.getElementById('today-reminder-banner');
  if (!banner || !PUBS) return;
  var now = new Date();
  var todayPosts = PUBS.filter(function(p) {
    return p.day === now.getDate() && p.mo === now.getMonth() && p.yr === now.getFullYear();
  });
  if (!todayPosts.length) { banner.style.display = 'none'; return; }
  var unpub = todayPosts.filter(function(p) { return !p.done; });
  var isOk = unpub.length === 0;
  var html = (isOk ? '✅ ' : '📅 ') + '<strong>' + (isOk ? 'Tous les posts du jour sont publiés !' : unpub.length + ' post' + (unpub.length > 1 ? 's' : '') + ' à publier aujourd\'hui') + '</strong>';
  if (!isOk) unpub.forEach(function(p) { html += ' &nbsp;·&nbsp; <span style="opacity:.8">' + escapeHtml(p.title || p.fmt) + ' ' + escapeHtml(p.heure) + '</span>'; });
  banner.innerHTML = html;
  banner.style.display = 'flex';
  banner.style.background = isOk ? 'rgba(5,150,105,.08)' : 'rgba(255,45,122,.07)';
  banner.style.borderColor = isOk ? 'rgba(5,150,105,.25)' : 'rgba(255,45,122,.2)';
  banner.style.color = isOk ? '#065F46' : '#9D174D';
}

// ─── Print Planning ───
function printPlanning() {
  window.print();
}

// ─── Engagement Rate ───
function eng(p) {
  if (!p.stats || !p.stats.v || p.stats.v === 0) return 0;
  return ((p.stats.l + p.stats.c * 2 + p.stats.s * 3 + p.stats.sh) / p.stats.v * 100).toFixed(1);
}

// ─── Post date → JS Date ───
function _pubDate(p) {
  if (p.yr && p.mo !== undefined && p.day) {
    return new Date(p.yr, p.mo, p.day);
  }
  return null;
}

// ─── Filter Bar (plateforme only) ───
function buildFilters() {
  var el = document.getElementById('filter-bar');
  if (!el) return;
  var h = '<span class="fb-label">Plateforme :</span>';
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

// ─── Toggle group collapse ───
function togglePubGroup(key) {
  _grpCollapsed[key] = !_grpCollapsed[key];
  renderPlanning();
}

// ─── Build a single post card HTML ───
function _pubCardHtml(p) {
  var realIdx = PUBS.findIndex(function(x) { return x.id === p.id; });
  var platInfo = PM[p.plat] || { l: p.plat, cls: 'b-ig' };
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

  // Stats panel — enriched with reach, watch time, profile visits
  var statsFields = [
    ['Vues', 'v', '👁'],
    ['Likes', 'l', '❤️'],
    ['Comments', 'c', '💬'],
    ['Saves', 's', '🔖'],
    ['Shares', 'sh', '🔁'],
    ['Portée', 'reach', '📡'],
    ['Visionnage (s)', 'wt', '⏱'],
    ['Visites profil', 'pv', '👤']
  ];
  if (!p.stats) p.stats = {};
  var statsHtml = '<div class="stats-panel" id="sp-' + p.id + '">'
    + '<div class="sp-inner">'
    + '<div class="sp-title">📊 Statistiques</div>'
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
      + '🔗 Voir le post publié ↗</a>';
  }

  return '<div class="pub-card ' + doneCls + ' ' + (lcCls || platCls2) + '">'
    + '<div class="pub-top">'
    + '<div class="pub-chk' + (p.done ? ' on' : '') + '" onclick="togglePub(\'' + p.id + '\')">' + (p.done ? '✓' : '') + '</div>'
    + '<div class="pub-body">'
    + '<div class="pub-meta">'
    + '<span class="badge ' + platInfo.cls + '">' + escapeHtml(platLbl) + '</span>'
    + '<span class="fmt-t">' + escapeHtml(p.fmt) + '</span>'
    + '<span class="time-t">⏰ ' + escapeHtml(p.heure) + '</span>'
    + '</div>'
    + '<div class="pub-title-main"><span class="pub-date-inline">' + escapeHtml(p.date) + ' · </span>' + escapeHtml(p.title) + '</div>'
    + (p.son && p.son !== '—' ? '<div class="pub-son">🎵 ' + escapeHtml(p.son) + '</div>' : '')
    + (p.src ? '<div class="src-t">📁 ' + escapeHtml(p.src) + '</div>' : '')
    + linkHtml
    + '<div class="pub-actions" style="margin-top:8px;">'
    + '<div class="pub-btns">'
    + (scriptHtml ? '<button class="sb sb-script" onclick="togglePubScript(\'' + p.id + '\')">\uD83D\uDCDD Script</button>' : '')
    + '<button class="sb sb-edit" onclick="openPubModal(' + realIdx + ')">✏️ Modifier</button>'
    + (p.done ? '<button class="sb sb-stats" onclick="toggleStats(\'' + p.id + '\')">\uD83D\uDCCA Stats</button>' : '')
    + '<div class="pub-more-wrap">'
    + '<button class="sb sb-more" onclick="togglePubMore(\'' + p.id + '\',event)">•••</button>'
    + '<div class="pub-more-menu" id="pub-more-' + p.id + '">'
    + '<button onclick="copyCaption(\'' + p.id + '\');closePubMore()">📋 Copier caption</button>'
    + '<button onclick="dupPub(\'' + p.id + '\');closePubMore()">📝 Dupliquer</button>'
    + '<button class="pmm-del" onclick="deletePubDirect(\'' + p.id + '\');closePubMore()">🗑️ Supprimer</button>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + scriptHtml
    + statsHtml
    + '</div>';
}

// ─── Render Planning (status groups) ───
function renderPlanning() {
  var el = document.getElementById('pubs-container');
  if (!el) return;

  var now = new Date();
  now.setHours(0, 0, 0, 0);
  var inSevenDays = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  var pubs = PUBS;
  if (fPlat !== 'all') pubs = pubs.filter(function(p) { return p.plat === fPlat; });
  if (fSearch) pubs = pubs.filter(function(p) {
    var q = fSearch;
    return (p.title || '').toLowerCase().indexOf(q) !== -1
        || (p.fmt || '').toLowerCase().indexOf(q) !== -1
        || (p.tags || '').toLowerCase().indexOf(q) !== -1
        || (p.son || '').toLowerCase().indexOf(q) !== -1
        || (p.src || '').toLowerCase().indexOf(q) !== -1;
  });

  // Sort by date
  pubs = pubs.slice().sort(function(a, b) {
    var da = _pubDate(a), db = _pubDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  var groups = [
    { key: 'late',  label: '🔴 En retard',    color: '#DC2626', items: [] },
    { key: 'week',  label: '📅 Cette semaine', color: '#FF2D7A', items: [] },
    { key: 'soon',  label: '🗓 À venir',       color: '#7C3AED', items: [] },
    { key: 'pub',   label: '✅ Publiés',        color: '#6B7280', items: [], collapsible: true }
  ];

  pubs.forEach(function(p) {
    if (p.done) {
      groups[3].items.push(p);
      return;
    }
    var d = _pubDate(p);
    if (!d) { groups[2].items.push(p); return; }
    if (d < now) {
      groups[0].items.push(p);
    } else if (d <= inSevenDays) {
      groups[1].items.push(p);
    } else {
      groups[2].items.push(p);
    }
  });

  var html = '';
  groups.forEach(function(grp) {
    if (!grp.items.length) return;
    var collapsed = grp.collapsible && _grpCollapsed[grp.key];
    var arrow = grp.collapsible ? (collapsed ? '▸ ' : '▾ ') : '';
    html += '<div class="pubs-grp">'
      + '<div class="pubs-ghdr" style="border-left-color:' + grp.color + ';'
      + (grp.collapsible ? 'cursor:pointer;' : '') + '"'
      + (grp.collapsible ? ' onclick="togglePubGroup(\'' + grp.key + '\')"' : '') + '>'
      + '<span style="color:' + grp.color + ';font-weight:800;">' + arrow + escapeHtml(grp.label) + '</span>'
      + '<span class="wcnt" style="color:' + grp.color + ';">' + grp.items.length + '</span>'
      + '</div>';
    if (!collapsed) {
      html += '<div class="pubs-gbody">';
      grp.items.forEach(function(p) { html += _pubCardHtml(p); });
      html += '</div>';
    }
    html += '</div>';
  });

  if (!html) {
    html = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Aucun post à afficher</div>';
  }

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
      src: 'A filmer 🎬',
      done: false,
      launch: false,
      stats: { v: 0, l: 0, c: 0, s: 0, sh: 0, reach: 0, wt: 0, pv: 0 },
      script: { title: '', shots: [] }
    };
  } else {
    _pubbe = JSON.parse(JSON.stringify(PUBS[idx]));
  }
  if (!_pubbe.script) _pubbe.script = { title: '', shots: [] };
  if (!_pubbe.stats) _pubbe.stats = {};

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
      + '<label style="color:#059669;">🔗 Lien du post publié</label>'
      + '<input id="ppe-link" placeholder="https://www.tiktok.com/@meryne.eis/..." value="' + escapeHtml(_pubbe.link || '') + '"></div>';
  }

  // Hashtag count
  var currentTagCount = (_pubbe.tags || '').split(' ').filter(function(t) { return t.startsWith('#'); }).length;
  var tagCountHtml = '<span id="hash-count" style="font-size:10px;color:var(--muted);font-weight:600;">' + currentTagCount + ' hashtag' + (currentTagCount !== 1 ? 's' : '') + '</span>';

  var modalHtml = '<button class="modal-x" onclick="closeModal()">✕</button>'
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
    // ─── Hashtags section — prominent ───
    + '<div class="fr hash-section">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
    + '<label style="margin-bottom:0;"># Hashtags</label>'
    + '<div style="display:flex;align-items:center;gap:8px;">'
    + tagCountHtml
    + '<button onclick="clearHashTags()" style="font-size:10px;color:var(--muted);background:var(--surf);border:1px solid var(--bord);border-radius:6px;padding:2px 8px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">Vider</button>'
    + '</div>'
    + '</div>'
    + '<div id="hash-modal-row" class="hash-modal-row" style="margin-bottom:6px;"></div>'
    + '<input id="ppe-tags" value="' + escapeHtml(_pubbe.tags) + '" placeholder="#hashtag1 #hashtag2..." oninput="updateHashCount(this.value)">'
    + '</div>'
    + '<div class="ai-caption-row">'
    + '<button id="ai-caption-btn" class="btn-ai-sm" onclick="generateCaption(\'' + _pubbe.id + '\')">✨ Caption IA</button>'
    + '</div>'
    + '<div id="ai-caption-result"></div>'
    + linkField
    + '<hr class="sep">'
    + '<div class="fr"><label>🎬 Titre du script</label><input id="ppe-stitle" value="' + escapeHtml(_pubbe.script.title) + '"></div>'
    + '<div id="ppe-shots">' + shotsHtml + '</div>'
    + '<button class="add-btn" onclick="addPubShot()">＋ Ajouter un plan</button>'
    + '<div class="modal-acts">'
    + (!isNew ? '<button class="btn-d" onclick="delPubM(\'' + _pubbe.id + '\')">🗑 Supprimer</button>' : '')
    + '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="savePub(\'' + _pubbe.id + '\',' + isNew + ',' + idx + ')">Enregistrer ✓</button>'
    + '</div>';

  openModal(modalHtml);
  if (typeof renderHashModalRow === 'function') renderHashModalRow();
}

// ─── Hashtag count update ───
function updateHashCount(val) {
  var count = (val || '').split(' ').filter(function(t) { return t.startsWith('#'); }).length;
  var el = document.getElementById('hash-count');
  if (el) el.textContent = count + ' hashtag' + (count !== 1 ? 's' : '');
}

// ─── Clear hashtags ───
function clearHashTags() {
  var el = document.getElementById('ppe-tags');
  if (el) { el.value = ''; updateHashCount(''); }
}

// ─── Shot Editor Helpers ───
function pubShotHtml(i, d) {
  return '<div class="shot-edit" id="pse-' + i + '">'
    + '<div class="shot-edit-n">Plan ' + (i + 1) + '</div>'
    + '<textarea oninput="updPubShot(' + i + ',this.value)">' + escapeHtml(d || '') + '</textarea>'
    + '<button class="shot-edit-del" onclick="removePubShot(' + i + ')">✕</button>'
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
  copy.stats = {v:0, l:0, c:0, s:0, sh:0, reach:0, wt:0, pv:0};
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
    navigator.clipboard.writeText(text).then(function() { showSync('📋 Caption copié !', 'rgba(5,150,105,.8)'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showSync('📋 Caption copié !', 'rgba(5,150,105,.8)');
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
    var btn = e && e.currentTarget ? e.currentTarget : null;
    if (btn) {
      var r = btn.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.top = (r.bottom + 4) + 'px';
      menu.style.left = r.left + 'px';
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
