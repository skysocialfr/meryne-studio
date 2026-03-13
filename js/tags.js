/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Banque de Hashtags
   ═══════════════════════════════════════════════ */

var TAGS = [];
var _tagAddOpen = false;

function renderTags() {
  var el = document.getElementById('tags-container');
  if (!el) return;

  var addHtml = '<div class="tag-add-wrap" id="tag-add-form" style="display:' + (_tagAddOpen ? 'block' : 'none') + ';">'
    + '<input id="tag-inp-name" placeholder="Nom du set (ex : #ootd mode)" />'
    + '<select id="tag-inp-plat"><option value="all">Toutes plateformes</option><option value="insta">Instagram</option><option value="tiktok">TikTok</option></select>'
    + '<textarea id="tag-inp-tags" placeholder="#fashion #ootd #mode #parisienne..."></textarea>'
    + '<div style="display:flex;gap:8px;">'
    + '<button class="tag-copy-btn" onclick="saveTagSet()">Enregistrer ✓</button>'
    + '<button onclick="toggleTagAdd()" style="padding:5px 10px;background:none;border:1.5px solid var(--bord);border-radius:7px;font-size:11px;cursor:pointer;">Annuler</button>'
    + '</div></div>';

  var cardsHtml = TAGS.length ? TAGS.map(function(t) {
    var platColor = t.plat === 'insta' ? 'var(--ig)' : t.plat === 'tiktok' ? 'var(--tt)' : 'var(--violet)';
    var platLbl = t.plat === 'insta' ? 'Instagram' : t.plat === 'tiktok' ? 'TikTok' : 'Toutes';
    return '<div class="tag-set-card">'
      + '<div class="tag-set-head">'
      + '<span class="tag-set-name">' + escapeHtml(t.name) + '</span>'
      + '<span class="tag-set-plat" style="background:' + platColor + '">' + escapeHtml(platLbl) + '</span>'
      + '</div>'
      + '<div class="tag-set-body">' + escapeHtml(t.tags) + '</div>'
      + '<div class="tag-set-actions">'
      + '<button class="tag-copy-btn" onclick="copyTagSet(\'' + t.id + '\')">📋 Copier</button>'
      + '<button class="tag-del-btn" onclick="deleteTagSet(\'' + t.id + '\')">🗑</button>'
      + '</div></div>';
  }).join('')
  : '<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px;">Aucun set de hashtags<br><span style="font-size:11px">Crée ton premier set ci-dessus !</span></div>';

  el.innerHTML = addHtml + cardsHtml;
}

function toggleTagAdd() {
  _tagAddOpen = !_tagAddOpen;
  renderTags();
  if (_tagAddOpen) {
    var inp = document.getElementById('tag-inp-name');
    if (inp) inp.focus();
  }
}

function saveTagSet() {
  var name = (document.getElementById('tag-inp-name') || {}).value || '';
  var plat = (document.getElementById('tag-inp-plat') || {}).value || 'all';
  var tags = (document.getElementById('tag-inp-tags') || {}).value || '';
  if (!name.trim() || !tags.trim()) { return; }
  TAGS.push({ id: 'tag' + Date.now(), name: name.trim(), plat: plat, tags: tags.trim() });
  save();
  _tagAddOpen = false;
  renderTags();
}

function copyTagSet(id) {
  var t = TAGS.find(function(x) { return x.id === id; });
  if (!t) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(t.tags).then(function() { showSync('Hashtags copiés ! 📋'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = t.tags;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showSync('Hashtags copiés ! 📋');
  }
}

function deleteTagSet(id) {
  askConfirm('Supprimer ce set de hashtags ?', function() {
    TAGS = TAGS.filter(function(x) { return x.id !== id; });
    save();
    renderTags();
  });
}
