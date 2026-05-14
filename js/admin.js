/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Admin Dashboard
   Visible uniquement si role = 'admin'
   KPIs + signups chart + status donut + conversion funnel
   ═══════════════════════════════════════════════ */

// Plan price ID -> monthly EUR amount (for MRR calc)
var ADMIN_PRICE_AMOUNTS = {
  'price_1TWY5oAIFObJ3lA9b1ioqI8c':  9.99,  // Solo
  'price_1TWjvS0wPb5M8Vv3ipQvWtU7': 19.99,  // Pro
  'price_1TWjvl0wPb5M8Vv3887w92ru': 59.99   // Agency
};

var _adminCharts = {}; // Chart.js instances (so we can destroy on re-render)

async function renderAdmin() {
  if (!window._IS_ADMIN) return;

  var container = document.getElementById('tab-admin');
  if (!container) return;

  container.innerHTML = ''
    + '<div class="adm-wrap">'
    +   '<div class="adm-head">'
    +     '<div>'
    +       '<div class="adm-title">Dashboard administrateur</div>'
    +       '<div class="adm-sub">Connect&eacute; en tant que ' + escapeHtml(window._USER_EMAIL || '') + '</div>'
    +     '</div>'
    +     '<button class="adm-refresh" onclick="renderAdmin()">&#x21bb; Actualiser</button>'
    +   '</div>'
    +   '<div id="admin-content"><div class="adm-loading">Chargement&hellip;</div></div>'
    + '</div>';

  var profiles = await _adminLoadProfiles();
  _renderAdminContent(profiles);
}

async function _adminLoadProfiles() {
  if (!sb) return null;
  try {
    var { data, error } = await sb
      .from('profiles')
      .select('id, email, display_name, role, created_at, subscription_status, subscription_price_id, trial_end, current_period_end, onboarded')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('admin profiles load failed:', e);
    return null;
  }
}

// Switch to the admin tab from the header badge.
function goToAdmin() {
  if (!window._IS_ADMIN) return;
  var panel = document.getElementById('tab-admin');
  if (!panel) return;
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.bnt').forEach(function(b) { b.classList.remove('active'); });
  panel.classList.add('active');
  renderAdmin();
}

function _renderAdminContent(profiles) {
  var c = document.getElementById('admin-content');
  if (!c) return;

  if (profiles === null) {
    c.innerHTML = '<div class="adm-error">Impossible de charger les profils. V&eacute;rifie la connexion Supabase et les RLS policies.</div>';
    return;
  }

  // ─── Compute KPIs once, cache for the sub-sections ───
  var total      = profiles.length;
  var trialing   = profiles.filter(function(p){ return p.subscription_status === 'trialing'; }).length;
  var active     = profiles.filter(function(p){ return p.subscription_status === 'active'; }).length;
  var canceled   = profiles.filter(function(p){ return p.subscription_status === 'canceled'; }).length;
  var pastDue    = profiles.filter(function(p){ return p.subscription_status === 'past_due' || p.subscription_status === 'unpaid'; }).length;
  var none       = profiles.filter(function(p){ return !p.subscription_status || p.subscription_status === 'none' || p.subscription_status === 'incomplete' || p.subscription_status === 'incomplete_expired'; }).length;
  var onboarded  = profiles.filter(function(p){ return p.onboarded; }).length;

  // MRR = sum of active subscriptions × monthly price
  var mrr = profiles.reduce(function(acc, p) {
    if (p.subscription_status === 'active' && p.subscription_price_id) {
      return acc + (ADMIN_PRICE_AMOUNTS[p.subscription_price_id] || 0);
    }
    return acc;
  }, 0);

  window._ADMIN_PROFILES = profiles;
  window._ADMIN_STATS = {
    total: total, trialing: trialing, active: active, canceled: canceled,
    pastDue: pastDue, none: none, onboarded: onboarded, mrr: mrr
  };

  // ─── Sub-navigation: admin "mode" with several pages ───
  c.innerHTML = ''
    + '<div class="adm-subnav">'
    +   '<button class="adm-subnav-btn active" data-sec="dashboard" onclick="_adminShowSection(\'dashboard\')">📊 Tableau de bord</button>'
    +   '<button class="adm-subnav-btn" data-sec="users" onclick="_adminShowSection(\'users\')">👥 Utilisateurs</button>'
    +   '<button class="adm-subnav-btn" data-sec="coaching" onclick="_adminShowSection(\'coaching\')">📬 Contenu Coaching</button>'
    + '</div>'
    + '<div id="admin-section"></div>';

  _adminShowSection('dashboard');
}

// Renders one admin sub-section into #admin-section.
function _adminShowSection(name) {
  var sec = document.getElementById('admin-section');
  if (!sec) return;
  document.querySelectorAll('.adm-subnav-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-sec') === name);
  });

  var profiles = window._ADMIN_PROFILES || [];
  var s = window._ADMIN_STATS || {};

  if (name === 'dashboard') {
    sec.innerHTML = ''
      + _renderKpiCards(s.total, s.trialing, s.active, s.mrr)
      + '<div class="adm-row">'
      +   '<div class="adm-panel adm-panel-2">'
      +     '<div class="adm-panel-title">Inscriptions sur 30 jours</div>'
      +     '<div class="adm-chart-wrap"><canvas id="adm-chart-signups"></canvas></div>'
      +   '</div>'
      +   '<div class="adm-panel">'
      +     '<div class="adm-panel-title">R&eacute;partition des abonnements</div>'
      +     '<div class="adm-chart-wrap"><canvas id="adm-chart-status"></canvas></div>'
      +   '</div>'
      + '</div>'
      + _renderFunnel(s.total, s.onboarded, s.trialing + s.active + s.canceled, s.active);
    setTimeout(function() {
      _renderSignupsChart(profiles);
      _renderStatusDonut(s.trialing, s.active, s.canceled, s.pastDue, s.none);
    }, 0);
  } else if (name === 'users') {
    sec.innerHTML = ''
      + _renderRecentUsers(profiles.slice(0, 10))
      + _renderCreateUserCard()
      + _renderAllUsersTable(profiles);
    setTimeout(_wireCreateUserBtn, 0);
  } else if (name === 'coaching') {
    sec.innerHTML = '<div id="adm-coaching" class="adm-panel"><div class="adm-panel-title">Contenu Coaching</div><div class="adm-loading">Chargement&hellip;</div></div>';
    _loadAndRenderCoaching();
  }
}

// ═══════════════════════════════════════════════
//  Coaching content management (table coaching_resources)
//  Admin-only — feeds the Coaching tab seen by every user.
// ═══════════════════════════════════════════════

async function _loadAndRenderCoaching() {
  var panel = document.getElementById('adm-coaching');
  if (!panel || !sb) return;
  var items = [];
  try {
    var res = await sb.from('coaching_resources')
      .select('id, kind, title, body, event_date, emoji, sort')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true });
    if (res.error) throw res.error;
    items = res.data || [];
  } catch (e) {
    panel.innerHTML = '<div class="adm-panel-title">Contenu Coaching</div>'
      + '<div class="adm-error">Impossible de charger le contenu coaching.</div>';
    return;
  }
  window._ADM_COACHING = items;
  _renderCoachingPanel();
}

function _renderCoachingPanel() {
  var panel = document.getElementById('adm-coaching');
  if (!panel) return;
  var items = window._ADM_COACHING || [];
  var newsletters = items.filter(function(i){ return i.kind === 'newsletter'; });
  var trends = items.filter(function(i){ return i.kind === 'trend'; });
  var cal = items.filter(function(i){ return i.kind === 'calendar'; });

  panel.innerHTML = '<div class="adm-panel-title">Contenu Coaching</div>'
    + '<div class="adm-coach-sub">Ce que tu publies ici est visible par tous les utilisateurs dans l\'onglet Coaching.</div>'
    + '<div class="adm-coach-group">'
    +   '<div class="adm-coach-group-title">&#x1F4EC; Newsletters</div>'
    +   newsletters.map(_coachItemRow).join('')
    +   _coachAddForm('newsletter')
    + '</div>'
    + '<div class="adm-coach-group">'
    +   '<div class="adm-coach-group-title">&#x1F525; Tendances du moment</div>'
    +   trends.map(_coachItemRow).join('')
    +   _coachAddForm('trend')
    + '</div>'
    + '<div class="adm-coach-group">'
    +   '<div class="adm-coach-group-title">&#x1F5D3;&#xFE0F; Calendrier marketing</div>'
    +   cal.map(_coachItemRow).join('')
    +   _coachAddForm('calendar')
    + '</div>';
}

// kinds that carry a free-text date/tag field
function _coachHasDate(kind) {
  return kind === 'calendar' || kind === 'newsletter';
}

function _coachItemRow(it) {
  return '<div class="adm-coach-item" id="adm-coach-' + it.id + '">'
    + '<div class="adm-coach-item-view">'
    +   '<span class="adm-coach-emoji">' + escapeHtml(it.emoji || '') + '</span>'
    +   '<div class="adm-coach-item-text">'
    +     (_coachHasDate(it.kind) && it.event_date ? '<span class="adm-coach-date">' + escapeHtml(it.event_date) + '</span>' : '')
    +     '<strong>' + escapeHtml(it.title || '') + '</strong>'
    +     (it.body ? '<span class="adm-coach-body">' + escapeHtml(it.body) + '</span>' : '')
    +   '</div>'
    +   '<div class="adm-coach-actions">'
    +     '<button onclick="adminEditCoaching(\'' + it.id + '\')">Modifier</button>'
    +     '<button class="adm-coach-del" onclick="adminDeleteCoaching(\'' + it.id + '\')">Suppr.</button>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

function _coachFields(kind, prefix, it) {
  it = it || {};
  return ''
    + '<input type="text" id="' + prefix + '-emoji" placeholder="Emoji" maxlength="4" value="' + escapeHtml(it.emoji || '') + '" style="width:54px;">'
    + (_coachHasDate(kind)
        ? '<input type="text" id="' + prefix + '-date" placeholder="Date (ex: 14 février)" value="' + escapeHtml(it.event_date || '') + '">'
        : '')
    + '<input type="text" id="' + prefix + '-title" placeholder="Titre" value="' + escapeHtml(it.title || '') + '">'
    + '<textarea id="' + prefix + '-body" rows="2" placeholder="Description / conseil">' + escapeHtml(it.body || '') + '</textarea>';
}

function _coachAddForm(kind) {
  return '<div class="adm-coach-form">'
    + _coachFields(kind, 'adm-new-' + kind)
    + '<button onclick="adminAddCoaching(\'' + kind + '\')">Ajouter</button>'
    + '</div>';
}

function _coachVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

async function adminAddCoaching(kind) {
  var title = _coachVal('adm-new-' + kind + '-title');
  if (!title) { showSync('⚠️ Titre requis', 'rgba(245,158,11,.8)'); return; }
  var row = {
    kind: kind,
    title: title,
    body: _coachVal('adm-new-' + kind + '-body'),
    emoji: _coachVal('adm-new-' + kind + '-emoji'),
    event_date: _coachHasDate(kind) ? _coachVal('adm-new-' + kind + '-date') : '',
    sort: (window._ADM_COACHING || []).filter(function(i){ return i.kind === kind; }).length + 1
  };
  try {
    var res = await sb.from('coaching_resources').insert(row);
    if (res.error) throw res.error;
    showSync('✅ Ajouté', 'rgba(5,150,105,.8)');
    _loadAndRenderCoaching();
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}

async function adminDeleteCoaching(id) {
  if (typeof askConfirm === 'function') {
    askConfirm('Supprimer cet élément ?', function() { _doDeleteCoaching(id); });
  } else {
    _doDeleteCoaching(id);
  }
}

async function _doDeleteCoaching(id) {
  try {
    var res = await sb.from('coaching_resources').delete().eq('id', id);
    if (res.error) throw res.error;
    showSync('🗑️ Supprimé', 'rgba(124,58,237,.8)');
    _loadAndRenderCoaching();
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}

function adminEditCoaching(id) {
  var it = (window._ADM_COACHING || []).find(function(x){ return x.id === id; });
  var row = document.getElementById('adm-coach-' + id);
  if (!it || !row) return;
  row.innerHTML = '<div class="adm-coach-form">'
    + _coachFields(it.kind, 'adm-edit-' + id, it)
    + '<button onclick="adminSaveCoaching(\'' + id + '\')">Enregistrer</button>'
    + '<button class="adm-coach-cancel" onclick="_renderCoachingPanel()">Annuler</button>'
    + '</div>';
}

async function adminSaveCoaching(id) {
  var it = (window._ADM_COACHING || []).find(function(x){ return x.id === id; });
  if (!it) return;
  var title = _coachVal('adm-edit-' + id + '-title');
  if (!title) { showSync('⚠️ Titre requis', 'rgba(245,158,11,.8)'); return; }
  var patch = {
    title: title,
    body: _coachVal('adm-edit-' + id + '-body'),
    emoji: _coachVal('adm-edit-' + id + '-emoji'),
    event_date: _coachHasDate(it.kind) ? _coachVal('adm-edit-' + id + '-date') : '',
    updated_at: new Date().toISOString()
  };
  try {
    var res = await sb.from('coaching_resources').update(patch).eq('id', id);
    if (res.error) throw res.error;
    showSync('✅ Mis à jour', 'rgba(5,150,105,.8)');
    _loadAndRenderCoaching();
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}

// ─── KPI cards ───
function _renderKpiCards(total, trialing, active, mrr) {
  var mrrFmt = mrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return ''
    + '<div class="adm-kpis">'
    +   '<div class="adm-kpi adm-kpi-cyan">'
    +     '<div class="adm-kpi-label">Total utilisateurs</div>'
    +     '<div class="adm-kpi-value">' + total + '</div>'
    +     '<div class="adm-kpi-tag">Toutes inscriptions</div>'
    +   '</div>'
    +   '<div class="adm-kpi adm-kpi-violet">'
    +     '<div class="adm-kpi-label">Essais en cours</div>'
    +     '<div class="adm-kpi-value">' + trialing + '</div>'
    +     '<div class="adm-kpi-tag">Trialing</div>'
    +   '</div>'
    +   '<div class="adm-kpi adm-kpi-rose">'
    +     '<div class="adm-kpi-label">Abonn&eacute;s actifs</div>'
    +     '<div class="adm-kpi-value">' + active + '</div>'
    +     '<div class="adm-kpi-tag">Active</div>'
    +   '</div>'
    +   '<div class="adm-kpi adm-kpi-green">'
    +     '<div class="adm-kpi-label">MRR</div>'
    +     '<div class="adm-kpi-value">' + mrrFmt + ' &euro;</div>'
    +     '<div class="adm-kpi-tag">Recurring mensuel</div>'
    +   '</div>'
    + '</div>';
}

// ─── Signups bar chart (last 30 days) ───
function _renderSignupsChart(profiles) {
  var canvas = document.getElementById('adm-chart-signups');
  if (!canvas || typeof Chart === 'undefined') return;

  // Build the last 30 days bucket
  var labels = [];
  var data = [];
  var today = new Date(); today.setHours(0,0,0,0);
  for (var i = 29; i >= 0; i--) {
    var d = new Date(today.getTime() - i * 86400000);
    var key = d.toISOString().slice(0, 10);
    var label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    labels.push(label);
    var count = profiles.filter(function(p) {
      return p.created_at && p.created_at.slice(0, 10) === key;
    }).length;
    data.push(count);
  }

  if (_adminCharts.signups) _adminCharts.signups.destroy();

  var ctx = canvas.getContext('2d');
  var grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(255,45,122,1)');
  grad.addColorStop(1, 'rgba(124,58,237,1)');

  _adminCharts.signups = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: grad,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0A0A14', titleColor: '#fff', bodyColor: '#fff' } },
      scales: {
        x: { grid: { display: false }, ticks: { color: 'rgba(0,0,0,.45)', font: { size: 10 }, maxRotation: 0, autoSkipPadding: 12 } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { color: 'rgba(0,0,0,.45)', font: { size: 10 }, precision: 0 } }
      }
    }
  });
}

// ─── Status donut ───
function _renderStatusDonut(trialing, active, canceled, pastDue, none) {
  var canvas = document.getElementById('adm-chart-status');
  if (!canvas || typeof Chart === 'undefined') return;

  if (_adminCharts.status) _adminCharts.status.destroy();

  _adminCharts.status = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Trialing', 'Active', 'Canceled', 'Past due', 'Aucun'],
      datasets: [{
        data: [trialing, active, canceled, pastDue, none],
        backgroundColor: ['#7C3AED', '#FF2D7A', '#9CA3AF', '#F59E0B', '#E5E7EB'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: 'rgba(0,0,0,.6)', font: { size: 11 }, boxWidth: 10, padding: 12 } },
        tooltip: { backgroundColor: '#0A0A14', titleColor: '#fff', bodyColor: '#fff' }
      }
    }
  });
}

// ─── Conversion funnel ───
function _renderFunnel(total, onboarded, anyPaymentEvent, active) {
  // 4 steps : signup -> onboarded -> trial started -> active subscription
  var steps = [
    { label: 'Inscriptions',           count: total },
    { label: 'Onboarding compl&eacute;t&eacute;', count: onboarded },
    { label: 'Essai d&eacute;marr&eacute;',     count: anyPaymentEvent },
    { label: 'Abonn&eacute; actif',           count: active }
  ];
  var max = total || 1;

  var rows = steps.map(function(s, i) {
    var pct = max ? Math.round(s.count / max * 100) : 0;
    var prevPct = i > 0 && steps[i-1].count
      ? Math.round(s.count / steps[i-1].count * 100)
      : null;
    return ''
      + '<div class="adm-funnel-row">'
      +   '<div class="adm-funnel-label">' + s.label + '</div>'
      +   '<div class="adm-funnel-bar"><div class="adm-funnel-fill" style="width:' + pct + '%"></div></div>'
      +   '<div class="adm-funnel-val">' + s.count + '</div>'
      +   '<div class="adm-funnel-pct">' + (prevPct === null ? '&mdash;' : prevPct + '%') + '</div>'
      + '</div>';
  }).join('');

  return ''
    + '<div class="adm-panel">'
    +   '<div class="adm-panel-title">Funnel de conversion</div>'
    +   '<div class="adm-funnel-head">'
    +     '<span></span><span></span><span class="adm-funnel-h">N</span><span class="adm-funnel-h">% &eacute;tape pr&eacute;c.</span>'
    +   '</div>'
    +   '<div class="adm-funnel">' + rows + '</div>'
    + '</div>';
}

// ─── Recent users (last 10) ───
function _renderRecentUsers(profiles) {
  if (!profiles.length) return '';
  var rows = profiles.map(function(p) {
    return '<tr>'
      + '<td class="adm-cell-email">' + escapeHtml(p.email || '—') + (p.id === window._VEYRA_UID ? ' <span class="adm-tag-me">vous</span>' : '') + '</td>'
      + '<td>' + escapeHtml(p.display_name || '—') + '</td>'
      + '<td>' + _statusBadge(p.subscription_status) + '</td>'
      + '<td class="adm-cell-mute">' + _formatDate(p.created_at) + '</td>'
      + '</tr>';
  }).join('');
  return ''
    + '<div class="adm-panel">'
    +   '<div class="adm-panel-title">10 derniers utilisateurs</div>'
    +   '<table class="adm-table">'
    +     '<thead><tr><th>Email</th><th>Nom</th><th>Statut</th><th>Inscrit le</th></tr></thead>'
    +     '<tbody>' + rows + '</tbody>'
    +   '</table>'
    + '</div>';
}

// ─── Status badge helper ───
function _statusBadge(status) {
  var s = status || 'none';
  var cls = 'adm-badge-mute', label = s;
  if (s === 'active')   { cls = 'adm-badge-rose';   label = 'Actif'; }
  if (s === 'trialing') { cls = 'adm-badge-violet'; label = 'Essai'; }
  if (s === 'canceled') { cls = 'adm-badge-mute';   label = 'Annul&eacute;'; }
  if (s === 'past_due' || s === 'unpaid') { cls = 'adm-badge-amber'; label = s === 'past_due' ? 'En retard' : 'Impay&eacute;'; }
  return '<span class="adm-badge ' + cls + '">' + label + '</span>';
}

function _formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── All users table (existing, kept for backward compat) ───
function _renderAllUsersTable(profiles) {
  var rows = profiles.map(function(p) {
    var roleStyle = p.role === 'admin'
      ? 'adm-badge-violet'
      : 'adm-badge-mute';
    return '<tr' + (p.id === window._VEYRA_UID ? ' class="adm-row-me"' : '') + '>'
      + '<td class="adm-cell-email">' + escapeHtml(p.email || '—') + (p.id === window._VEYRA_UID ? ' <span class="adm-tag-me">vous</span>' : '') + '</td>'
      + '<td>' + escapeHtml(p.display_name || '—') + '</td>'
      + '<td><span class="adm-badge ' + roleStyle + '">' + escapeHtml(p.role || 'user') + '</span></td>'
      + '<td>' + _statusBadge(p.subscription_status) + '</td>'
      + '<td class="adm-cell-mute">' + _formatDate(p.created_at) + '</td>'
      + '</tr>';
  }).join('');
  return ''
    + '<div class="adm-panel">'
    +   '<div class="adm-panel-title">Tous les utilisateurs (' + profiles.length + ')</div>'
    +   '<div class="adm-table-scroll"><table class="adm-table">'
    +     '<thead><tr><th>Email</th><th>Nom</th><th>R&ocirc;le</th><th>Abonnement</th><th>Inscrit le</th></tr></thead>'
    +     '<tbody>' + rows + '</tbody>'
    +   '</table></div>'
    +   '<div class="adm-table-footnote">Pour promouvoir un user en admin&nbsp;: Supabase &rarr; Table Editor &rarr; profiles &rarr; modifier <code>role</code>.</div>'
    + '</div>';
}

// ─── Create-user form ───
function _renderCreateUserCard() {
  return ''
    + '<div class="adm-panel">'
    +   '<div class="adm-panel-title">Cr&eacute;er un compte utilisateur (manuel)</div>'
    +   '<div class="adm-form">'
    +     '<input type="email" id="adm-email" placeholder="utilisateur@exemple.com" autocomplete="off">'
    +     '<input type="password" id="adm-pass" placeholder="Mot de passe (min 6 car.)" autocomplete="new-password">'
    +     '<input type="text" id="adm-name" placeholder="Nom affich&eacute;">'
    +     '<button id="adm-create-btn">Cr&eacute;er</button>'
    +   '</div>'
    + '</div>';
}

function _wireCreateUserBtn() {
  var btn = document.getElementById('adm-create-btn');
  if (btn) btn.onclick = adminCreateUser;
}

async function adminCreateUser() {
  var emailEl = document.getElementById('adm-email');
  var passEl  = document.getElementById('adm-pass');
  var nameEl  = document.getElementById('adm-name');
  var email = emailEl ? emailEl.value.trim() : '';
  var pass  = passEl  ? passEl.value : '';
  var name  = nameEl  ? nameEl.value.trim() : '';

  if (!email) { showSync('⚠️ Email requis', 'rgba(245,158,11,.8)'); return; }
  if (pass.length < 6) { showSync('⚠️ Mot de passe : 6 caractères minimum', 'rgba(245,158,11,.8)'); return; }
  if (!sb) return;

  var btn = document.getElementById('adm-create-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Création…'; }

  var result = await sb.auth.signUp({
    email: email,
    password: pass,
    options: { data: { display_name: name } }
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Créer'; }

  if (result.error) {
    showSync('❌ ' + result.error.message, 'rgba(220,38,38,.8)');
    return;
  }

  if (result.data && result.data.user) {
    try {
      await sb.from('profiles').insert({
        id: result.data.user.id,
        email: email,
        display_name: name,
        role: 'user'
      });
    } catch (e) {}
  }

  showSync('✅ Compte créé !', 'rgba(5,150,105,.8)');
  if (emailEl) emailEl.value = '';
  if (passEl)  passEl.value  = '';
  if (nameEl)  nameEl.value  = '';
  renderAdmin();
}
