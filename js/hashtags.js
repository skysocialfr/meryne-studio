/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Hashtag Library
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

// ═══════════════════════════════════════════════
//  Hashtag suggestions: by niche + extracted from the user's own posts
// ═══════════════════════════════════════════════

// Curated bundles per niche (15-25 tags each). Match the niches offered
// in onboarding. Generic mix when the niche isn't recognised.
var HASHTAG_BUNDLES = {
  'Mode':       '#mode #fashion #ootd #outfitoftheday #style #fashionblogger #fashionista #look #lookdujour #mood #stylish #wiwt #parisienne #frenchstyle #frenchgirl #inspo #outfitinspo #fashionable #streetstyle',
  'Beauté':     '#beauty #beaute #skincare #makeup #routine #glowup #beautyaddict #skincareroutine #makeuplover #beautytips #frenchbeauty #beautyhacks #cleanbeauty #selfcare #naturelle #peausensible',
  'Fitness':    '#fitness #fit #workout #gymlife #training #fitfrance #musculation #fitfam #motivation #healthylife #sportlife #fitnessmotivation #homeworkout #cardio #abs #bodygoals #healthy',
  'Lifestyle':  '#lifestyle #lifestyleblogger #dailylife #aesthetic #aestheticfeed #moodboard #moments #goodvibes #lifeisbeautiful #slowlife #cozy #mood #inspo #morningroutine #lifestylecontent',
  'Food':       '#food #foodie #foodporn #foodstagram #recettesfaciles #cuisinefrancaise #homemade #yummy #foodphotography #faitmaison #recette #cooking #foodblogger #healthyfood #gourmandise',
  'Voyage':     '#travel #travelgram #voyage #wanderlust #travelphotography #explore #travelblogger #adventure #travelling #voyageinsta #beautifuldestinations #passportready #escapade #weekendtravel',
  'Tech':       '#tech #technology #innovation #startup #ai #ia #techlover #productivity #digital #future #techreview #gadgets #coding #developer #saas #appdev',
  'Gaming':     '#gaming #gamer #gameplay #twitch #streamer #esports #videogames #pcgaming #consolelife #gamingsetup #playstation #xboxlife #nintendoswitch #gamingcommunity',
  'Musique':    '#music #musique #artist #musicianlife #songwriter #studio #musicproducer #independantartist #frenchmusic #livemusic #songoftheday #musicvideo #soundcloud',
  'Art':        '#art #artist #artoftheday #illustration #drawing #digitalart #creative #artwork #artistsoninstagram #sketchbook #painting #design #portfolio #handmade',
  'Business':   '#business #entrepreneur #entrepreneurship #startup #motivation #mindset #success #businessowner #marketing #networking #freelance #solopreneur #personalbranding',
  'Éducation':  '#education #learning #etudiant #studygram #studytips #motivation #productivity #etudes #knowledge #studymotivation #revisions #apprentissage',
  'Famille':    '#famille #maman #parents #parentinglife #vieparents #enfants #mamanblogueuse #papablogueur #motherhood #fatherhood #famillyfirst #babylove #parentingjourney',
  'Humour':     '#humour #funny #lol #drole #meme #comedyposts #humourfr #blagues #lifehumor #vidéosdroles #humoureveryday #zinzin'
};

var HASHTAG_GENERIC =
  '#contentcreator #creator #createurdecontenu #frenchcreator #insta #instagood #explorepage #fyp #pourtoi #foryou #grow #engagement #community #authentic #behindthescenes';

// Top 30 most-used hashtags across the user's own published posts.
function _myTopHashtags() {
  var live = window._IG_LIVE && window._IG_LIVE.media;
  var stats = window._IG_STATS && window._IG_STATS.posts;
  var captions = [];
  if (Array.isArray(stats)) captions = stats.map(function(p) { return p.caption || ''; });
  else if (Array.isArray(live)) captions = live.map(function(m) { return m.caption || ''; });
  var counts = {};
  captions.forEach(function(c) {
    (c.match(/#[\p{L}\p{N}_]+/gu) || []).forEach(function(t) {
      var k = t.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .map(function(t) { return { tag: t, count: counts[t] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 30);
}

var _HASH_SUG_TAB = 'niche';

function openHashSuggestModal() {
  if (typeof openModal !== 'function') return;
  _HASH_SUG_TAB = 'niche';
  openModal(_hashSuggestHtml());
}

function _hashSuggestHtml() {
  var p = window._USER_PROFILE || {};
  var niche = (p.niche || '').trim();
  var bundleTags = HASHTAG_BUNDLES[niche] || HASHTAG_GENERIC;
  var nicheLabel = HASHTAG_BUNDLES[niche] ? niche : 'Général (pas de niche définie)';

  var nicheTabActive = _HASH_SUG_TAB === 'niche';
  var myTabActive = _HASH_SUG_TAB === 'mine';

  var body = '';
  if (_HASH_SUG_TAB === 'niche') {
    var tags = bundleTags.trim().split(/\s+/);
    body = '<div class="hash-sug-meta">Niche : <strong>' + escapeHtml(nicheLabel) + '</strong> · ' + tags.length + ' hashtags</div>'
      + '<div class="hash-sug-cloud">' + tags.map(function(t) {
          return '<span class="hash-sug-chip" onclick="copyHashSuggest(\'' + escapeHtml(t) + '\')">' + escapeHtml(t) + '</span>';
        }).join('') + '</div>'
      + '<div class="modal-acts">'
      +   '<button class="btn-s" onclick="closeModal()">Fermer</button>'
      +   '<button class="btn-p" onclick="saveHashBundleAsGroup(' + JSON.stringify(nicheLabel) + ',' + JSON.stringify(bundleTags) + ')">Enregistrer comme groupe</button>'
      + '</div>';
  } else {
    var top = _myTopHashtags();
    if (!top.length) {
      body = '<div class="hash-sug-empty">Aucun hashtag détecté dans tes posts publiés.<br>Connecte Instagram et publie quelques posts pour voir tes hashtags récurrents.</div>';
    } else {
      body = '<div class="hash-sug-meta">' + top.length + ' hashtags les plus utilisés dans tes posts publiés</div>'
        + '<div class="hash-sug-cloud">' + top.map(function(t) {
            var size = 11 + Math.min(t.count * 1.5, 8);
            return '<span class="hash-sug-chip" style="font-size:' + size + 'px;" onclick="copyHashSuggest(\'' + escapeHtml(t.tag) + '\')">'
              + escapeHtml(t.tag) + '<span class="hash-sug-count">' + t.count + '</span></span>';
          }).join('') + '</div>'
        + '<div class="modal-acts">'
        +   '<button class="btn-s" onclick="closeModal()">Fermer</button>'
        +   '<button class="btn-p" onclick="saveMyTopAsGroup()">Enregistrer comme groupe</button>'
        + '</div>';
    }
  }

  return '<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>💡 Suggestions de hashtags</h2>'
    + '<div class="hash-sug-tabs">'
    +   '<button class="hash-sug-tab' + (nicheTabActive ? ' active' : '') + '" onclick="_switchHashSugTab(\'niche\')">🎯 Par niche</button>'
    +   '<button class="hash-sug-tab' + (myTabActive ? ' active' : '') + '" onclick="_switchHashSugTab(\'mine\')">📊 Mes hashtags top</button>'
    + '</div>'
    + body;
}

function _switchHashSugTab(tab) {
  _HASH_SUG_TAB = tab;
  var body = document.getElementById('modal-body');
  if (body) body.innerHTML = _hashSuggestHtml();
}

function copyHashSuggest(tag) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(tag).then(function() {
      showSync('📋 ' + tag + ' copié', 'rgba(5,150,105,.8)');
    });
  }
}

function saveHashBundleAsGroup(name, tags) {
  var colors = ['#FF2D7A', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
  var color = colors[(HASHTAG_GROUPS ? HASHTAG_GROUPS.length : 0) % colors.length];
  var group = {
    id: 'hg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name: 'Niche · ' + name,
    color: color,
    tags: tags
  };
  if (!HASHTAG_GROUPS) HASHTAG_GROUPS = [];
  HASHTAG_GROUPS.push(group);
  save();
  renderHashGroups();
  closeModal();
  showSync('✅ Groupe enregistré', 'rgba(5,150,105,.8)');
}

function saveMyTopAsGroup() {
  var top = _myTopHashtags();
  if (!top.length) return;
  var tags = top.map(function(t) { return t.tag; }).join(' ');
  saveHashBundleAsGroup('Mes top', tags);
}
