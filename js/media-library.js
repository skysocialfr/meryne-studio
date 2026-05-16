/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Media library
   Browse / preview / delete media the user has uploaded into the
   public post-media Storage bucket.
   ═══════════════════════════════════════════════ */

var _MEDIA_ITEMS = [];

async function openMediaLibrary() {
  closeSettingsMenu && closeSettingsMenu();
  if (typeof openModal !== 'function' || !sb || !window._VEYRA_UID) return;
  openModal(_mediaLibraryShellHtml());
  await _loadMediaLibrary();
}

function _mediaLibraryShellHtml() {
  return '<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>🖼️ Ma bibliothèque média</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 14px;line-height:1.6;">Toutes les photos et vidéos que tu as uploadées pour publier sur Instagram. Tu peux les réutiliser en copiant leur lien.</p>'
    + '<div id="media-lib-grid"><div class="media-lib-loading">Chargement…</div></div>'
    + '<div class="modal-acts" style="margin-top:14px;">'
    +   '<button class="btn-s" onclick="closeModal()">Fermer</button>'
    + '</div>';
}

async function _loadMediaLibrary() {
  var grid = document.getElementById('media-lib-grid');
  if (!grid) return;
  try {
    var res = await sb.storage.from('post-media').list(window._VEYRA_UID, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (res.error) throw res.error;
    _MEDIA_ITEMS = (res.data || [])
      .filter(function(f) { return f && f.name && f.name !== '.emptyFolderPlaceholder'; })
      .map(function(f) {
        var path = window._VEYRA_UID + '/' + f.name;
        var pub = sb.storage.from('post-media').getPublicUrl(path);
        return {
          path: path,
          name: f.name,
          url: pub.data.publicUrl,
          size: (f.metadata && f.metadata.size) || 0,
          created: f.created_at,
          isVideo: /\.(mp4|mov|webm)$/i.test(f.name)
        };
      });
    _renderMediaGrid();
  } catch (e) {
    grid.innerHTML = '<div class="media-lib-loading" style="color:#EF4444;">Impossible de charger ta bibliothèque.</div>';
  }
}

function _renderMediaGrid() {
  var grid = document.getElementById('media-lib-grid');
  if (!grid) return;
  if (!_MEDIA_ITEMS.length) {
    grid.innerHTML = '<div class="media-lib-empty">'
      + '<div class="media-lib-empty-ic">📭</div>'
      + '<div class="media-lib-empty-title">Bibliothèque vide</div>'
      + '<div class="media-lib-empty-text">Quand tu publieras un post depuis le Feed, les photos / vidéos uploadées apparaîtront ici pour pouvoir les réutiliser.</div>'
      + '</div>';
    return;
  }
  var sizeFmt = function(b) {
    if (!b) return '';
    if (b > 1048576) return (b / 1048576).toFixed(1) + ' Mo';
    if (b > 1024) return (b / 1024).toFixed(0) + ' Ko';
    return b + ' o';
  };
  grid.innerHTML = '<div class="media-lib-grid">' + _MEDIA_ITEMS.map(function(m, i) {
    var media = m.isVideo
      ? '<video src="' + escapeHtml(m.url) + '" muted preload="metadata"></video>'
      : '<img src="' + escapeHtml(m.url) + '" alt="" loading="lazy">';
    return '<div class="media-lib-cell">'
      +   '<div class="media-lib-thumb">' + media
      +     (m.isVideo ? '<span class="media-lib-vid">▶</span>' : '')
      +   '</div>'
      +   '<div class="media-lib-meta">' + sizeFmt(m.size) + '</div>'
      +   '<div class="media-lib-actions">'
      +     '<button onclick="copyMediaUrl(' + i + ')" title="Copier le lien">📋</button>'
      +     '<a href="' + escapeHtml(m.url) + '" target="_blank" rel="noopener" title="Ouvrir dans un onglet">↗</a>'
      +     '<button onclick="deleteMedia(' + i + ')" title="Supprimer" class="media-lib-del">×</button>'
      +   '</div>'
      + '</div>';
  }).join('') + '</div>';
}

function copyMediaUrl(idx) {
  var m = _MEDIA_ITEMS[idx];
  if (!m || !navigator.clipboard) return;
  navigator.clipboard.writeText(m.url).then(function() {
    showSync('📋 Lien copié', 'rgba(5,150,105,.8)');
  });
}

async function deleteMedia(idx) {
  var m = _MEDIA_ITEMS[idx];
  if (!m) return;
  if (typeof askConfirm === 'function') {
    askConfirm('Supprimer ce média ? (les posts déjà publiés sur Instagram ne sont pas affectés)', function() {
      _doDeleteMedia(m);
    });
  } else {
    _doDeleteMedia(m);
  }
}

async function _doDeleteMedia(m) {
  try {
    var res = await sb.storage.from('post-media').remove([m.path]);
    if (res.error) throw res.error;
    _MEDIA_ITEMS = _MEDIA_ITEMS.filter(function(x) { return x.path !== m.path; });
    _renderMediaGrid();
    showSync('🗑️ Média supprimé', 'rgba(124,58,237,.8)');
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}
