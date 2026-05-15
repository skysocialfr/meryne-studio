/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Linkin.bio manager
   Opens a modal that lets the user set a public slug and manage the
   list of links shown on their /bio.html?u=<slug> page.
   ═══════════════════════════════════════════════ */

var _BIO_LINKS = [];

async function openBioModal() {
  closeSettingsMenu && closeSettingsMenu();
  if (typeof openModal !== 'function' || !sb || !window._VEYRA_UID) return;

  var p = window._USER_PROFILE || {};
  var slug = p.bio_slug || '';

  openModal(_bioModalHtml(slug, true));
  _loadBioLinks();
}

function _bioModalHtml(slug, loading) {
  var publicUrl = slug
    ? location.origin + '/bio.html?u=' + encodeURIComponent(slug)
    : '';
  return '<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>🔗 Mon Linkin.bio</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 16px;line-height:1.6;">Une page publique qui regroupe tous tes liens. Mets-la dans ta bio Instagram.</p>'

    + '<div class="fr"><label>Pseudo public (slug)</label>'
    + '<div style="display:flex;gap:6px;">'
    + '<input id="bio-slug-inp" type="text" value="' + escapeHtml(slug) + '" placeholder="ton-pseudo" '
    +   'style="flex:1;text-transform:lowercase;" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9\\-_.]/g,\'\')">'
    + '<button class="btn-p" onclick="saveBioSlug()">Enregistrer</button>'
    + '</div></div>'

    + (publicUrl
        ? '<div class="bio-public-url">'
          + '<span class="bio-url-label">Ton lien :</span>'
          + '<a href="' + escapeHtml(publicUrl) + '" target="_blank" rel="noopener">' + escapeHtml(publicUrl) + '</a>'
          + '<button class="bio-copy-btn" onclick="copyBioUrl(\'' + escapeHtml(publicUrl) + '\')">Copier</button>'
          + '</div>'
        : '<div class="bio-public-url bio-public-empty">Choisis d\'abord un pseudo public pour activer ta page.</div>')

    + '<div class="bio-section-title">Tes liens</div>'
    + '<div id="bio-links-list">' + (loading ? '<div class="bio-loading">Chargement…</div>' : '') + '</div>'

    + '<div class="bio-add-form">'
    + '<input id="bio-new-emoji" placeholder="🔗" maxlength="4" style="width:54px;text-align:center;">'
    + '<input id="bio-new-title" placeholder="Titre du lien">'
    + '<input id="bio-new-url" placeholder="https://…" type="url">'
    + '<button class="btn-p" onclick="addBioLink()">+ Ajouter</button>'
    + '</div>'

    + '<div class="modal-acts" style="margin-top:18px;">'
    + '<button class="btn-s" onclick="closeModal()">Fermer</button>'
    + '</div>';
}

async function _loadBioLinks() {
  try {
    var res = await sb.from('user_links')
      .select('id, title, url, emoji, sort')
      .eq('user_id', window._VEYRA_UID)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true });
    _BIO_LINKS = res.data || [];
    _renderBioLinksList();
  } catch (e) {
    var el = document.getElementById('bio-links-list');
    if (el) el.innerHTML = '<div class="bio-loading">Impossible de charger tes liens.</div>';
  }
}

function _renderBioLinksList() {
  var el = document.getElementById('bio-links-list');
  if (!el) return;
  if (!_BIO_LINKS.length) {
    el.innerHTML = '<div class="bio-loading">Aucun lien pour le moment. Ajoute le premier ci-dessous.</div>';
    return;
  }
  el.innerHTML = _BIO_LINKS.map(function(l, i) {
    return '<div class="bio-link-row">'
      + '<span class="bio-row-emoji">' + escapeHtml(l.emoji || '🔗') + '</span>'
      + '<div class="bio-row-text">'
      +   '<div class="bio-row-title">' + escapeHtml(l.title || '') + '</div>'
      +   '<div class="bio-row-url">' + escapeHtml(l.url || '') + '</div>'
      + '</div>'
      + '<div class="bio-row-actions">'
      +   (i > 0 ? '<button onclick="moveBioLink(\'' + l.id + '\',-1)" title="Monter">▲</button>' : '<button disabled>▲</button>')
      +   (i < _BIO_LINKS.length - 1 ? '<button onclick="moveBioLink(\'' + l.id + '\',1)" title="Descendre">▼</button>' : '<button disabled>▼</button>')
      +   '<button onclick="deleteBioLink(\'' + l.id + '\')" class="bio-row-del" title="Supprimer">×</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

async function saveBioSlug() {
  var inp = document.getElementById('bio-slug-inp');
  if (!inp) return;
  var slug = inp.value.trim().toLowerCase();
  if (slug && !/^[a-z0-9\-_.]{2,40}$/.test(slug)) {
    showSync('⚠️ Pseudo invalide (2-40 car., lettres/chiffres/-_.)', 'rgba(245,158,11,.8)');
    return;
  }
  try {
    var patch = { bio_slug: slug || null };
    var res = await sb.from('profiles').update(patch).eq('id', window._VEYRA_UID);
    if (res.error) {
      if ((res.error.message || '').indexOf('duplicate') !== -1 || (res.error.code === '23505')) {
        showSync('⚠️ Ce pseudo est déjà pris', 'rgba(245,158,11,.8)');
        return;
      }
      throw res.error;
    }
    if (window._USER_PROFILE) window._USER_PROFILE.bio_slug = slug || null;
    showSync('✅ Lien enregistré', 'rgba(5,150,105,.8)');
    // Refresh modal so the public URL appears
    var body = document.getElementById('modal-body');
    if (body) body.innerHTML = _bioModalHtml(slug, false);
    _renderBioLinksList();
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}

async function addBioLink() {
  var title = (document.getElementById('bio-new-title') || {}).value || '';
  var url   = (document.getElementById('bio-new-url')   || {}).value || '';
  var emoji = (document.getElementById('bio-new-emoji') || {}).value || '';
  title = title.trim(); url = url.trim(); emoji = emoji.trim();
  if (!title) { showSync('⚠️ Titre requis', 'rgba(245,158,11,.8)'); return; }
  if (!/^https?:\/\//.test(url)) { showSync('⚠️ URL doit commencer par https://', 'rgba(245,158,11,.8)'); return; }
  try {
    var row = {
      user_id: window._VEYRA_UID,
      title: title, url: url, emoji: emoji,
      sort: _BIO_LINKS.length
    };
    var res = await sb.from('user_links').insert(row).select().single();
    if (res.error) throw res.error;
    _BIO_LINKS.push(res.data);
    _renderBioLinksList();
    document.getElementById('bio-new-title').value = '';
    document.getElementById('bio-new-url').value = '';
    document.getElementById('bio-new-emoji').value = '';
    showSync('✅ Lien ajouté', 'rgba(5,150,105,.8)');
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}

async function deleteBioLink(id) {
  if (typeof askConfirm === 'function') {
    askConfirm('Supprimer ce lien ?', function() { _doDeleteBioLink(id); });
  } else { _doDeleteBioLink(id); }
}

async function _doDeleteBioLink(id) {
  try {
    var res = await sb.from('user_links').delete().eq('id', id);
    if (res.error) throw res.error;
    _BIO_LINKS = _BIO_LINKS.filter(function(l) { return l.id !== id; });
    _renderBioLinksList();
    showSync('🗑️ Lien supprimé', 'rgba(124,58,237,.8)');
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur'), 'rgba(220,38,38,.8)');
  }
}

async function moveBioLink(id, dir) {
  var idx = _BIO_LINKS.findIndex(function(l) { return l.id === id; });
  if (idx === -1) return;
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= _BIO_LINKS.length) return;
  // Swap in memory + persist new sort values
  var arr = _BIO_LINKS.slice();
  var tmp = arr[idx]; arr[idx] = arr[newIdx]; arr[newIdx] = tmp;
  // Reassign sort
  arr.forEach(function(l, i) { l.sort = i; });
  _BIO_LINKS = arr;
  _renderBioLinksList();
  try {
    await Promise.all(arr.map(function(l) {
      return sb.from('user_links').update({ sort: l.sort }).eq('id', l.id);
    }));
  } catch (e) {
    showSync('⚠️ Ordre non sauvegardé', 'rgba(245,158,11,.8)');
  }
}

function copyBioUrl(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showSync('📋 Lien copié !', 'rgba(5,150,105,.8)');
    });
  }
}
