/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Workspaces v1
   Shared spaces: user can be part of one or more spaces
   (e.g. a trio managing a joint TikTok account).
   ═══════════════════════════════════════════════ */

var _WS_LIST = [];
var _WS_PERSONAL = null;
var _WS_PENDING_INVITES = [];
var _WS_MEMBERS_CACHE = [];

// Global "Mes tâches" filter (production + planning honor it when set)
window._MY_TASKS_ONLY = false;

function _wsLsKey() {
  return 'veyra_active_ws:' + (window._VEYRA_UID || 'anon');
}

function _wsGet(id) {
  for (var i = 0; i < _WS_LIST.length; i++) {
    if (_WS_LIST[i].id === id) return _WS_LIST[i];
  }
  return null;
}

function wsGetActive() {
  if (!window._VEYRA_WS_ID) return _WS_PERSONAL;
  return _wsGet(window._VEYRA_WS_ID) || _WS_PERSONAL;
}

function wsGetList() { return _WS_LIST.slice(); }

function wsIsShared() {
  var a = wsGetActive();
  return !!(a && !a.is_personal);
}

function wsCanInvite() {
  var a = wsGetActive();
  return !!(a && !a.is_personal && a.owner_id === window._VEYRA_UID);
}

// ─── Bootstrap ───
// Called from auth._enterApp() right after profile load, before initApp().
// Populates _WS_LIST + picks the active workspace (last-used or personal).
async function wsInit() {
  _WS_LIST = [];
  _WS_PERSONAL = null;
  window._VEYRA_WS_ID = null;
  window._VEYRA_WS_PERSONAL_ID = null;

  if (!sb || !window._VEYRA_UID) return;

  try {
    var res = await sb.from('my_workspaces').select('*');
    if (res && res.data) _WS_LIST = res.data;
  } catch (e) {}

  for (var i = 0; i < _WS_LIST.length; i++) {
    if (_WS_LIST[i].is_personal) { _WS_PERSONAL = _WS_LIST[i]; break; }
  }
  if (_WS_PERSONAL) window._VEYRA_WS_PERSONAL_ID = _WS_PERSONAL.id;

  var lastId = null;
  try { lastId = localStorage.getItem(_wsLsKey()); } catch (e) {}
  var picked = lastId ? _wsGet(lastId) : null;
  if (!picked) picked = _WS_PERSONAL || _WS_LIST[0] || null;
  window._VEYRA_WS_ID = picked ? picked.id : null;

  await wsRefreshPendingInvites();
  await wsRefreshMembers();
}

// ─── Members cache ──────────────────────────────────────────────────────
// Called after init and after any workspace switch. Populates
// _WS_MEMBERS_CACHE for the active workspace so renderers can look up
// assignee display info without hitting the DB per card.
async function wsRefreshMembers() {
  _WS_MEMBERS_CACHE = [];
  if (!sb || !window._VEYRA_WS_ID) return _WS_MEMBERS_CACHE;
  var a = wsGetActive();
  if (!a || a.is_personal) {
    var p = window._USER_PROFILE || {};
    _WS_MEMBERS_CACHE = [{
      workspace_id: window._VEYRA_WS_ID,
      user_id: window._VEYRA_UID,
      role: 'owner',
      email: p.email || window._USER_EMAIL || '',
      display_name: p.display_name || ''
    }];
    return _WS_MEMBERS_CACHE;
  }
  try {
    var res = await sb.from('workspace_members_with_profile')
      .select('*').eq('workspace_id', window._VEYRA_WS_ID)
      .order('joined_at', { ascending: true });
    if (res && res.data) _WS_MEMBERS_CACHE = res.data;
  } catch (e) {}
  return _WS_MEMBERS_CACHE;
}

function wsMembers() { return _WS_MEMBERS_CACHE.slice(); }

function wsMemberById(userId) {
  if (!userId) return null;
  for (var i = 0; i < _WS_MEMBERS_CACHE.length; i++) {
    if (_WS_MEMBERS_CACHE[i].user_id === userId) return _WS_MEMBERS_CACHE[i];
  }
  return null;
}

function wsMemberInitials(m) {
  if (!m) return '?';
  var src = (m.display_name && m.display_name.trim()) || (m.email || '').split('@')[0] || '';
  if (!src) return '?';
  var parts = src.trim().split(/[\s._-]+/).filter(function(s) { return s.length; });
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.substring(0, 2).toUpperCase();
}

// Deterministic gradient palette keyed on user_id so avatars stay stable.
var _WS_AV_PALETTE = [
  ['#EC4899', '#8B5CF6'],
  ['#F59E0B', '#EC4899'],
  ['#06B6D4', '#8B5CF6'],
  ['#10B981', '#06B6D4'],
  ['#F43F5E', '#F59E0B'],
  ['#6366F1', '#EC4899'],
  ['#8B5CF6', '#3B82F6'],
  ['#14B8A6', '#22C55E']
];
function wsMemberColor(userId) {
  if (!userId) return _WS_AV_PALETTE[0];
  var h = 0;
  for (var i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0x7fffffff;
  return _WS_AV_PALETTE[h % _WS_AV_PALETTE.length];
}

function wsAvatarHtml(userId, size) {
  var s = size || 20;
  var m = wsMemberById(userId);
  if (!m) {
    if (!userId) return '';
    return '<span class="ws-av ws-av-unknown" style="width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s * 0.42) + 'px" title="Membre inconnu">?</span>';
  }
  var pal = wsMemberColor(userId);
  var initials = wsMemberInitials(m);
  var name = (m.display_name && m.display_name.trim()) || m.email || 'Membre';
  return '<span class="ws-av" title="' + escapeHtml(name) + '"' +
    ' style="width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s * 0.42) + 'px;' +
    'background:linear-gradient(135deg,' + pal[0] + ',' + pal[1] + ')">' + escapeHtml(initials) + '</span>';
}

function wsMyId() { return window._VEYRA_UID || null; }

function wsShouldShowAssignee() {
  var a = wsGetActive();
  return !!(a && !a.is_personal && _WS_MEMBERS_CACHE.length > 1);
}

function toggleMyTasksOnly() {
  window._MY_TASKS_ONLY = !window._MY_TASKS_ONLY;
  var btns = document.querySelectorAll('.mytasks-filter');
  btns.forEach(function(b) { b.classList.toggle('active', window._MY_TASKS_ONLY); });
  if (typeof renderProd === 'function') renderProd();
  if (typeof renderPlanning === 'function') renderPlanning();
}

function refreshMyTasksFilterUI() {
  var show = wsShouldShowAssignee();
  var btns = document.querySelectorAll('.mytasks-filter');
  btns.forEach(function(b) {
    b.style.display = show ? '' : 'none';
    b.classList.toggle('active', window._MY_TASKS_ONLY);
  });
  if (!show && window._MY_TASKS_ONLY) {
    window._MY_TASKS_ONLY = false;
  }
}

// Assignee dropdown <select> HTML fragment (empty string in personal ws).
function wsAssigneeSelectHtml(selectId, currentAssigneeId) {
  var a = wsGetActive();
  if (!a || a.is_personal) return '';
  var options = '<option value="">— Non assignée —</option>';
  _WS_MEMBERS_CACHE.forEach(function(m) {
    var sel = (m.user_id === currentAssigneeId) ? ' selected' : '';
    var name = (m.display_name && m.display_name.trim()) || (m.email || '').split('@')[0] || 'Membre';
    if (m.user_id === window._VEYRA_UID) name += ' (moi)';
    options += '<option value="' + escapeHtml(m.user_id) + '"' + sel + '>' + escapeHtml(name) + '</option>';
  });
  return '<div class="fr" id="' + selectId + '-row"><label>&#x1F464; Assignée à</label>' +
    '<select id="' + selectId + '">' + options + '</select></div>';
}

async function wsRefreshPendingInvites() {
  _WS_PENDING_INVITES = [];
  if (!sb || !window._VEYRA_UID) return _WS_PENDING_INVITES;
  try {
    var res = await sb.from('my_pending_invites').select('*').order('created_at', { ascending: false });
    if (res && res.data) _WS_PENDING_INVITES = res.data;
  } catch (e) {}
  return _WS_PENDING_INVITES;
}

function wsGetPendingInvites() { return _WS_PENDING_INVITES.slice(); }

// ─── Switch workspace: persist choice + reload state + re-render ─────────
async function wsSetActive(id) {
  var target = _wsGet(id);
  if (!target) return;
  if (id === window._VEYRA_WS_ID) return;
  window._VEYRA_WS_ID = id;
  try { localStorage.setItem(_wsLsKey(), id); } catch (e) {}

  if (typeof showSync === 'function') showSync('Chargement…', null);

  await wsRefreshMembers();
  if (typeof load === 'function') await load();
  if (typeof loadFeedData === 'function') await loadFeedData();
  if (typeof loadEvents === 'function') await loadEvents();
  if (typeof renderAll === 'function') renderAll();
  renderWorkspacePill();
  if (typeof refreshMyTasksFilterUI === 'function') refreshMyTasksFilterUI();
  if (typeof showSync === 'function') showSync('Espace : ' + target.name, null);
}

// ─── Create a new shared workspace ───────────────────────────────────────
// Delegates to the create_workspace() RPC so workspace + member row are
// inserted atomically as SECURITY DEFINER — avoids the RLS chicken-and-egg
// where INSERT workspaces RETURNING fails because the caller isn't yet a
// member.
async function wsCreate(name) {
  if (!sb || !window._VEYRA_UID) throw new Error('Not authenticated');
  var clean = (name || '').trim();
  if (!clean) throw new Error('Nom requis');

  var res = await sb.rpc('create_workspace', { p_name: clean });
  if (res.error) throw new Error(res.error.message || 'Création impossible');
  var newId = res.data;

  await wsInit();
  if (newId) {
    window._VEYRA_WS_ID = newId;
    try { localStorage.setItem(_wsLsKey(), newId); } catch (e) {}
  }
  return _wsGet(newId) || { id: newId, name: clean };
}

// ─── Invite by email (existing Veyra account required) ──────────────────
async function wsInvite(email) {
  if (!sb || !window._VEYRA_UID) throw new Error('Not authenticated');
  var wsId = window._VEYRA_WS_ID;
  if (!wsId) throw new Error('Aucun espace actif');
  var res = await sb.rpc('create_workspace_invite', {
    p_workspace_id: wsId,
    p_email: (email || '').trim()
  });
  if (res.error) throw new Error(res.error.message || 'Invitation impossible');
  return res.data;
}

// ─── List members of active workspace ───────────────────────────────────
async function wsListMembers() {
  if (!sb || !window._VEYRA_WS_ID) return [];
  var res = await sb.from('workspace_members_with_profile')
    .select('*').eq('workspace_id', window._VEYRA_WS_ID)
    .order('joined_at', { ascending: true });
  return (res && res.data) || [];
}

// ─── List pending invites *sent from* active workspace (for owner UI) ───
async function wsListSentInvites() {
  if (!sb || !window._VEYRA_WS_ID) return [];
  var res = await sb.from('workspace_invites')
    .select('*').eq('workspace_id', window._VEYRA_WS_ID).eq('status', 'pending')
    .order('created_at', { ascending: false });
  return (res && res.data) || [];
}

async function wsCancelInvite(inviteId) {
  if (!sb) return;
  await sb.from('workspace_invites').delete().eq('id', inviteId);
}

async function wsAcceptInvite(inviteId) {
  if (!sb) return null;
  var res = await sb.rpc('accept_workspace_invite', { p_invite_id: inviteId });
  if (res.error) throw new Error(res.error.message || 'Acceptation impossible');
  await wsInit();
  var targetId = res.data;
  if (targetId) {
    window._VEYRA_WS_ID = targetId;
    try { localStorage.setItem(_wsLsKey(), targetId); } catch (e) {}
  }
  await wsRefreshPendingInvites();
  return targetId;
}

async function wsDeclineInvite(inviteId) {
  if (!sb) return;
  var res = await sb.rpc('decline_workspace_invite', { p_invite_id: inviteId });
  if (res.error) throw new Error(res.error.message || 'Refus impossible');
  await wsRefreshPendingInvites();
}

async function wsLeave() {
  if (!sb) return;
  var a = wsGetActive();
  if (!a || a.is_personal) throw new Error('Impossible de quitter ton espace perso');
  if (a.owner_id === window._VEYRA_UID) throw new Error('Le propriétaire ne peut pas quitter — supprime l\'espace');
  var res = await sb.from('workspace_members')
    .delete().eq('workspace_id', a.id).eq('user_id', window._VEYRA_UID);
  if (res.error) throw new Error(res.error.message || 'Sortie impossible');
  await wsInit();
  if (_WS_PERSONAL) window._VEYRA_WS_ID = _WS_PERSONAL.id;
  try { localStorage.setItem(_wsLsKey(), window._VEYRA_WS_ID || ''); } catch (e) {}
}

async function wsRemoveMember(userId) {
  if (!sb) return;
  var a = wsGetActive();
  if (!a || a.is_personal || a.owner_id !== window._VEYRA_UID) {
    throw new Error('Non autorisé');
  }
  if (userId === window._VEYRA_UID) throw new Error('Utilise "Quitter" pour te retirer');
  var res = await sb.from('workspace_members')
    .delete().eq('workspace_id', a.id).eq('user_id', userId);
  if (res.error) throw new Error(res.error.message || 'Retrait impossible');
}

async function wsDelete() {
  if (!sb) return;
  var a = wsGetActive();
  if (!a || a.is_personal) throw new Error('Impossible de supprimer l\'espace perso');
  if (a.owner_id !== window._VEYRA_UID) throw new Error('Seul le propriétaire peut supprimer');
  var res = await sb.from('workspaces').delete().eq('id', a.id);
  if (res.error) throw new Error(res.error.message || 'Suppression impossible');
  await wsInit();
  if (_WS_PERSONAL) window._VEYRA_WS_ID = _WS_PERSONAL.id;
  try { localStorage.setItem(_wsLsKey(), window._VEYRA_WS_ID || ''); } catch (e) {}
}

async function wsRename(newName) {
  if (!sb) return;
  var a = wsGetActive();
  if (!a || a.owner_id !== window._VEYRA_UID) throw new Error('Non autorisé');
  var clean = (newName || '').trim();
  if (!clean) throw new Error('Nom requis');
  var res = await sb.from('workspaces').update({ name: clean }).eq('id', a.id);
  if (res.error) throw new Error(res.error.message || 'Renommage impossible');
  await wsInit();
}

// ═══════════════════════════════════════════════════════════════════════
// UI: pill, modal, banner
// ═══════════════════════════════════════════════════════════════════════

function _wsIcon(a) {
  if (!a) return '&#x1F3E0;'; // house
  return a.is_personal ? '&#x1F3E0;' : '&#x1F465;';
}

function renderWorkspacePill() {
  var pill = document.getElementById('ws-pill');
  if (!pill) return;
  var a = wsGetActive();
  if (!a || _WS_LIST.length <= 1) {
    if (_WS_LIST.length === 0) { pill.style.display = 'none'; return; }
    if (_WS_LIST.length === 1 && a && a.is_personal) { pill.style.display = 'none'; return; }
  }
  pill.style.display = 'inline-flex';
  pill.innerHTML =
    '<span class="ws-pill-ic">' + _wsIcon(a) + '</span>' +
    '<span class="ws-pill-name"></span>' +
    '<svg class="ws-pill-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">' +
      '<polyline points="6 9 12 15 18 9"/></svg>';
  pill.querySelector('.ws-pill-name').textContent = a ? a.name : 'Espace';
}

// ─── Banner ────────────────────────────────────────────────────────────
function showPendingInvitesBanner() {
  var host = document.getElementById('ws-invites-banner');
  if (!host) return;
  if (!_WS_PENDING_INVITES || !_WS_PENDING_INVITES.length) {
    host.style.display = 'none';
    host.innerHTML = '';
    return;
  }
  host.style.display = 'block';
  host.innerHTML = _WS_PENDING_INVITES.map(function(inv) {
    var from = inv.invited_by_email ? escapeHtml(inv.invited_by_email) : 'Quelqu\'un';
    var name = escapeHtml(inv.workspace_name || 'un espace');
    return '' +
      '<div class="ws-invite-card">' +
        '<div class="ws-invite-txt">' +
          '<strong>' + from + '</strong> t\'invite à rejoindre <strong>' + name + '</strong>' +
        '</div>' +
        '<div class="ws-invite-btns">' +
          '<button class="ws-btn ws-btn-primary" onclick="wsUiAccept(\'' + inv.id + '\')">Accepter</button>' +
          '<button class="ws-btn ws-btn-ghost" onclick="wsUiDecline(\'' + inv.id + '\')">Refuser</button>' +
        '</div>' +
      '</div>';
  }).join('');
}

async function wsUiAccept(id) {
  try {
    await wsAcceptInvite(id);
    if (typeof load === 'function') await load();
    if (typeof loadFeedData === 'function') await loadFeedData();
    if (typeof loadEvents === 'function') await loadEvents();
    if (typeof renderAll === 'function') renderAll();
    renderWorkspacePill();
    showPendingInvitesBanner();
    if (typeof showSync === 'function') showSync('Espace rejoint ✨', null);
  } catch (e) {
    alert(e.message || 'Erreur');
  }
}

async function wsUiDecline(id) {
  try {
    await wsDeclineInvite(id);
    showPendingInvitesBanner();
  } catch (e) {
    alert(e.message || 'Erreur');
  }
}

// ─── Modal ─────────────────────────────────────────────────────────────
function openWorkspacesModal() {
  var m = document.getElementById('ws-modal');
  if (!m) return;
  m.style.display = 'flex';
  renderWsModal();
}

function closeWorkspacesModal() {
  var m = document.getElementById('ws-modal');
  if (m) m.style.display = 'none';
}

async function renderWsModal() {
  var body = document.getElementById('ws-modal-body');
  if (!body) return;
  body.innerHTML = '<div class="ws-loading">Chargement…</div>';

  await wsInit();
  var a = wsGetActive();
  var members = [];
  var sentInvites = [];
  if (a && !a.is_personal) {
    members = await wsListMembers();
    if (a.owner_id === window._VEYRA_UID) sentInvites = await wsListSentInvites();
  }

  var html = '';

  html += '<div class="ws-sec ws-sec-list">';
  html += '<div class="ws-sec-title">Mes espaces</div>';
  html += '<div class="ws-list">';
  _WS_LIST.forEach(function(w) {
    var isActive = w.id === window._VEYRA_WS_ID;
    html += '<button class="ws-list-item' + (isActive ? ' ws-active' : '') +
      '" onclick="wsUiSwitch(\'' + w.id + '\')">' +
        '<span class="ws-list-ic">' + _wsIcon(w) + '</span>' +
        '<span class="ws-list-name">' + escapeHtml(w.name) + '</span>' +
        '<span class="ws-list-meta">' + (w.is_personal ? 'perso' : w.member_count + ' membre' + (w.member_count > 1 ? 's' : '')) + '</span>' +
      '</button>';
  });
  html += '</div>';
  html += '<button class="ws-btn ws-btn-ghost ws-btn-full" onclick="wsUiPromptCreate()">+ Créer un espace partagé</button>';
  html += '</div>';

  if (a && !a.is_personal) {
    var isOwner = a.owner_id === window._VEYRA_UID;
    html += '<div class="ws-sec">';
    html += '<div class="ws-sec-title">' +
      '<span>' + escapeHtml(a.name) + '</span>' +
      (isOwner ? '<button class="ws-mini-btn" onclick="wsUiPromptRename()" title="Renommer">&#9998;</button>' : '') +
      '</div>';

    html += '<div class="ws-members">';
    members.forEach(function(m) {
      var isSelf = m.user_id === window._VEYRA_UID;
      var displayName = m.display_name || (m.email || '').split('@')[0] || '—';
      var badge = m.role === 'owner' ? '<span class="ws-role-badge">Propriétaire</span>' :
                  isSelf ? '<span class="ws-role-badge ws-role-self">Toi</span>' : '';
      var kickBtn = (isOwner && !isSelf && m.role !== 'owner') ?
        '<button class="ws-mini-btn ws-mini-danger" onclick="wsUiKick(\'' + m.user_id + '\',\'' + escapeHtml(displayName) + '\')" title="Retirer">&#10005;</button>' : '';
      html += '<div class="ws-member">' +
        '<div class="ws-member-name">' + escapeHtml(displayName) + ' ' + badge + '</div>' +
        '<div class="ws-member-email">' + escapeHtml(m.email || '') + '</div>' +
        kickBtn +
        '</div>';
    });
    html += '</div>';

    if (isOwner) {
      html += '<div class="ws-invite-form">' +
        '<input type="email" id="ws-invite-email" placeholder="email@copine.com" class="ws-input">' +
        '<button class="ws-btn ws-btn-primary" onclick="wsUiInvite()">Inviter</button>' +
        '</div>';
      html += '<div class="ws-invite-hint">La personne doit déjà avoir un compte Veyra.</div>';

      if (sentInvites.length) {
        html += '<div class="ws-sec-subtitle">Invitations en attente</div>';
        html += '<div class="ws-pending">';
        sentInvites.forEach(function(inv) {
          html += '<div class="ws-pending-item">' +
            '<span class="ws-pending-email">' + escapeHtml(inv.invited_email) + '</span>' +
            '<button class="ws-mini-btn ws-mini-danger" onclick="wsUiCancelInvite(\'' + inv.id + '\')" title="Annuler l\'invitation">&#10005;</button>' +
            '</div>';
        });
        html += '</div>';
      }
    }

    html += '<div class="ws-danger-row">';
    if (isOwner) {
      html += '<button class="ws-btn ws-btn-danger-ghost" onclick="wsUiDelete()">Supprimer cet espace</button>';
    } else {
      html += '<button class="ws-btn ws-btn-danger-ghost" onclick="wsUiLeave()">Quitter cet espace</button>';
    }
    html += '</div>';
    html += '</div>';
  }

  body.innerHTML = html;
}

async function wsUiSwitch(id) {
  closeWorkspacesModal();
  await wsSetActive(id);
}

async function wsUiPromptCreate() {
  var name = prompt('Nom de ton espace partagé\n(ex: "Trio TikTok", "Compte pro")');
  if (name === null) return;
  try {
    await wsCreate(name);
    if (typeof load === 'function') await load();
    if (typeof loadFeedData === 'function') await loadFeedData();
    if (typeof loadEvents === 'function') await loadEvents();
    if (typeof renderAll === 'function') renderAll();
    renderWorkspacePill();
    renderWsModal();
    if (typeof showSync === 'function') showSync('Espace créé ✨', null);
  } catch (e) {
    alert(e.message || 'Création impossible');
  }
}

async function wsUiPromptRename() {
  var a = wsGetActive();
  if (!a) return;
  var name = prompt('Nouveau nom de l\'espace :', a.name);
  if (name === null) return;
  try {
    await wsRename(name);
    renderWorkspacePill();
    renderWsModal();
  } catch (e) {
    alert(e.message || 'Renommage impossible');
  }
}

async function wsUiInvite() {
  var input = document.getElementById('ws-invite-email');
  if (!input) return;
  var email = (input.value || '').trim();
  if (!email) return;
  try {
    await wsInvite(email);
    input.value = '';
    renderWsModal();
    if (typeof showSync === 'function') showSync('Invitation envoyée ✨', null);
  } catch (e) {
    alert(e.message || 'Invitation impossible');
  }
}

async function wsUiCancelInvite(id) {
  if (!confirm('Annuler cette invitation ?')) return;
  try {
    await wsCancelInvite(id);
    renderWsModal();
  } catch (e) {
    alert(e.message || 'Annulation impossible');
  }
}

async function wsUiKick(userId, name) {
  if (!confirm('Retirer ' + name + ' de l\'espace ?')) return;
  try {
    await wsRemoveMember(userId);
    renderWsModal();
  } catch (e) {
    alert(e.message || 'Retrait impossible');
  }
}

async function wsUiLeave() {
  var a = wsGetActive();
  if (!a) return;
  if (!confirm('Quitter "' + a.name + '" ? Tu ne verras plus les données de cet espace.')) return;
  try {
    await wsLeave();
    closeWorkspacesModal();
    if (typeof load === 'function') await load();
    if (typeof loadFeedData === 'function') await loadFeedData();
    if (typeof loadEvents === 'function') await loadEvents();
    if (typeof renderAll === 'function') renderAll();
    renderWorkspacePill();
    if (typeof showSync === 'function') showSync('Retour à ton espace perso', null);
  } catch (e) {
    alert(e.message || 'Sortie impossible');
  }
}

async function wsUiDelete() {
  var a = wsGetActive();
  if (!a) return;
  var confirmText = 'Supprimer définitivement "' + a.name + '" ? Toutes les données de cet espace seront perdues.';
  if (!confirm(confirmText)) return;
  try {
    await wsDelete();
    closeWorkspacesModal();
    if (typeof load === 'function') await load();
    if (typeof loadFeedData === 'function') await loadFeedData();
    if (typeof loadEvents === 'function') await loadEvents();
    if (typeof renderAll === 'function') renderAll();
    renderWorkspacePill();
    if (typeof showSync === 'function') showSync('Espace supprimé', null);
  } catch (e) {
    alert(e.message || 'Suppression impossible');
  }
}
