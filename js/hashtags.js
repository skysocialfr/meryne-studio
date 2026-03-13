/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Hashtag Library
   ═══════════════════════════════════════════════ */

var _hashOpen = false;

function toggleHashPanel() {
  _hashOpen = !_hashOpen;
  var panel = document.getElementById('hash-panel');
  if (!panel) return;
  if (_hashOpen) {
    panel.classList.add('open');
    renderHashGroups();
  } else {
    panel.classList.remove('open');
  }
}

function renderHashGroups() {
  var list = document.getElementById('hash-list');
  if (!list) return;

  if (!HASHTAG_GROUPS || !HASHTAG_GROUPS.length) {
    list.innerHTML = '<div class="hash-empty">Aucun groupe<br><span>Clique \uFF0B pour créer</span></div>';
    return;
  }

  list.innerHTML = HASHTAG_GROUPS.map(function(g) {
    var tags = g.tags ? g.tags.trim().split(/\s+/).filter(Boolean) : [];
    var count = tags.length;
    var preview = tags.slice(0, 5).map(function(t) {
      return '<span class="hg-tag-chip">' + escapeHtml(t) + '</span>';
    }).join('') + (count > 5 ? '<span class="hg-tag-more">+' + (count - 5) + '</span>' : '');

    return '<div class="hash-group">'
      + '<div class="hg-header">'
      + '<span class="hg-dot" style="background:' + g.color + '"></span>'
      + '<span class="hg-name">' + escapeHtml(g.name) + '</span>'
      + '<span class="hg-count">' + count + ' tags</span>'
      + '<div class="hg-actions">'
      + '<button class="hg-btn" onclick="copyHashGroup(\'' + g.id + '\')" title="Copier tous">&#x1F4CB;</button>'
      + '<button class="hg-btn" onclick="editHashGroup(\'' + g.id + '\')" title="Modifier">&#x270F;&#xFE0F;</button>'
      + '<button class="hg-btn" onclick="deleteHashGroup(\'' + g.id + '\')" title="Supprimer">&#x1F5D1;</button>'
      + '</div>'
      + '</div>'
      + '<div class="hg-tags-preview">' + preview + '</div>'
      + '</div>';
  }).join('');
}

function addHashGroup() {
  var colors = ['#FF2D7A', '#7C3AED', '#0891B2', '#059669', '#F59E0B', '#FF004F'];
  var color = colors[(HASHTAG_GROUPS ? HASHTAG_GROUPS.length : 0) % colors.length];
  _openHashGroupModal(null, 'hg' + Date.now(), '', color, '');
}

function editHashGroup(id) {
  var g = HASHTAG_GROUPS.find(function(x) { return x.id === id; });
  if (!g) return;
  _openHashGroupModal(g.id, g.id, g.name, g.color, g.tags);
}

function _openHashGroupModal(existingId, id, name, color, tags) {
  var colors = ['#FF2D7A', '#7C3AED', '#0891B2', '#059669', '#F59E0B', '#FF004F', '#C13584'];
  var colorPicker = colors.map(function(c) {
    return '<span class="hgm-swatch' + (c === color ? ' sel' : '') + '" style="background:' + c + '" onclick="selectHashColor(\'' + c + '\',this)"></span>';
  }).join('');

  window._hgmColor = color;
  window._hgmId = id;
  window._hgmExisting = !!existingId;

  var html = '<button class="modal-x" onclick="closeModal()">&times;</button>'
    + '<h2>' + (existingId ? 'Modifier le groupe' : 'Nouveau groupe') + '</h2>'
    + '<div class="fr"><label>Nom</label><input id="hgm-name" value="' + escapeHtml(name) + '" placeholder="ex: Mode, Paris, TikTok..."></div>'
    + '<div class="fr"><label>Couleur</label><div class="hgm-swatches">' + colorPicker + '</div></div>'
    + '<div class="fr"><label>Hashtags (séparés par des espaces)</label>'
    + '<textarea id="hgm-tags" rows="5" placeholder="#fashion #mode #ootd ...">' + escapeHtml(tags) + '</textarea></div>'
    + '<div class="modal-acts">'
    + '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="saveHashGroup()">Enregistrer \u2713</button>'
    + '</div>';

  openModal(html);
}

function selectHashColor(color, el) {
  window._hgmColor = color;
  document.querySelectorAll('.hgm-swatch').forEach(function(c) { c.classList.remove('sel'); });
  if (el) el.classList.add('sel');
}

function saveHashGroup() {
  var name = (document.getElementById('hgm-name') || {}).value || '';
  var tags = (document.getElementById('hgm-tags') || {}).value || '';
  var color = window._hgmColor || '#FF2D7A';
  var id = window._hgmId;
  var isEdit = window._hgmExisting;

  if (!name.trim()) {
    var el = document.getElementById('hgm-name');
    if (el) el.style.borderColor = 'var(--rose)';
    return;
  }

  var group = { id: id, name: name.trim(), color: color, tags: tags.trim() };

  if (isEdit) {
    var idx = HASHTAG_GROUPS.findIndex(function(x) { return x.id === id; });
    if (idx !== -1) HASHTAG_GROUPS[idx] = group;
    else HASHTAG_GROUPS.push(group);
  } else {
    HASHTAG_GROUPS.push(group);
  }

  save();
  closeModal();
  renderHashGroups();
  showSync('\u2705 Groupe enregistré', null);
}

function deleteHashGroup(id) {
  askConfirm('Supprimer ce groupe de hashtags ?', function() {
    HASHTAG_GROUPS = HASHTAG_GROUPS.filter(function(x) { return x.id !== id; });
    save();
    renderHashGroups();
  });
}

function copyHashGroup(id) {
  var g = HASHTAG_GROUPS.find(function(x) { return x.id === id; });
  if (!g || !g.tags) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(g.tags).then(function() {
      showSync('\uD83D\uDCCB ' + g.name + ' copié !', 'rgba(5,150,105,.8)');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = g.tags;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    showSync('\uD83D\uDCCB ' + g.name + ' copié !', 'rgba(5,150,105,.8)');
  }
}

// ─── Inject hashtags into Planning post modal ───
function insertHashGroup(id) {
  var g = HASHTAG_GROUPS.find(function(x) { return x.id === id; });
  if (!g) return;
  var inp = document.getElementById('ppe-tags');
  if (!inp) return;
  var cur = inp.value.trim();
  inp.value = cur ? cur + ' ' + g.tags : g.tags;
  if (typeof _pubbe !== 'undefined' && _pubbe) _pubbe.tags = inp.value;
  showSync('\u2705 ' + g.name + ' ajouté', 'rgba(5,150,105,.8)');
}

// ─── Render hashtag group buttons inside Planning modal ───
function renderHashModalRow() {
  var row = document.getElementById('hash-modal-row');
  if (!row) return;
  if (!HASHTAG_GROUPS || !HASHTAG_GROUPS.length) {
    row.innerHTML = '';
    return;
  }
  row.innerHTML = '<div class="hash-mr-label">Bibliothèque :</div>'
    + HASHTAG_GROUPS.map(function(g) {
      return '<button class="hg-modal-btn" style="--hgc:' + g.color + '" onclick="insertHashGroup(\'' + g.id + '\')">'
        + escapeHtml(g.name) + '</button>';
    }).join('');
}
