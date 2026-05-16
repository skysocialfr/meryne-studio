/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Connexions
   Link Instagram / TikTok accounts for auto-posting + insights.
   Rendered as a modal (opened from the Feed tab), not a dedicated tab.
   ═══════════════════════════════════════════════ */

// OAuth start URL for "Instagram API with Instagram Login".
// IMPORTANT: this must match Meta's generated "URL d'intégration" byte-for-byte
// — in particular redirect_uri is NOT url-encoded and the scope commas are %2C.
var INSTAGRAM_AUTH_BASE =
  'https://www.instagram.com/oauth/authorize'
  + '?force_reauth=true'
  + '&client_id=1271135391865752'
  + '&redirect_uri=https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/instagram-oauth'
  + '&response_type=code'
  + '&scope=instagram_business_basic%2Cinstagram_business_manage_messages'
  + '%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish'
  + '%2Cinstagram_business_manage_insights';

// LinkedIn Developer App client id. Set this once you've created the app
// at developer.linkedin.com (and added the redirect URI
// https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/linkedin-oauth).
var LINKEDIN_CLIENT_ID = ''; // ex: '86xxxxxxxxxxxx'
var LINKEDIN_REDIRECT = 'https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/linkedin-oauth';
var LINKEDIN_SCOPE = 'openid profile email w_member_social';

// TikTok app client key. Set once the TikTok Developer App is created
// (redirect URI: https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/tiktok-oauth).
var TIKTOK_CLIENT_KEY = ''; // ex: 'awxxxxxxxxxxxxxx'
var TIKTOK_REDIRECT = 'https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/tiktok-oauth';
var TIKTOK_SCOPE = 'user.info.basic,video.publish,video.upload';

// ─── Open / close the Connexions modal ───
async function openConnexionsModal() {
  var modal = document.getElementById('cx-modal');
  var body = document.getElementById('cx-modal-body');
  if (!modal || !body) return;
  body.innerHTML = '<div class="cx-loading">Chargement…</div>';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  var connections = [];
  if (sb && window._VEYRA_UID) {
    try {
      var res = await sb.from('social_connections')
        .select('id, platform, account_username, account_name, account_avatar_url, status, connected_at, token_expires_at')
        .eq('user_id', window._VEYRA_UID);
      connections = res.data || [];
    } catch (e) {
      console.error('connexions load failed:', e);
    }
  }

  var ig = connections.filter(function (x) { return x.platform === 'instagram'; });
  var li = connections.filter(function (x) { return x.platform === 'linkedin'; });
  var tt = connections.filter(function (x) { return x.platform === 'tiktok'; });

  body.innerHTML = ''
    + '<div class="cx-sub" style="margin-bottom:14px;">Lie tes comptes pour publier automatiquement et analyser tes vraies statistiques directement depuis Veyra Studio.</div>'
    + _cxInstagramCard(ig)
    + _cxLinkedinCard(li)
    + _cxTiktokCard(tt)
    + '<div class="cx-note">'
    +   '🔒 Tes jetons d\'accès sont stockés chiffrés et ne sont jamais visibles. '
    +   'Tu peux déconnecter un compte à tout moment.'
    + '</div>';
}

function closeCxModal() {
  var modal = document.getElementById('cx-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ─── Instagram card ───
function _cxInstagramCard(connections) {
  var inner;
  if (connections.length) {
    inner = connections.map(function (conn) {
      var avatar = conn.account_avatar_url
        ? '<img src="' + escapeHtml(conn.account_avatar_url) + '" alt="" class="cx-avatar">'
        : '<div class="cx-avatar cx-avatar-ph">' + (conn.account_username || '?').charAt(0).toUpperCase() + '</div>';
      var statusBadge = conn.status === 'active'
        ? '<span class="cx-badge cx-badge-ok">Connecté</span>'
        : '<span class="cx-badge cx-badge-warn">' + escapeHtml(conn.status) + '</span>';
      return ''
        + '<div class="cx-account">'
        +   avatar
        +   '<div class="cx-account-info">'
        +     '<div class="cx-account-name">@' + escapeHtml(conn.account_username || '—') + '</div>'
        +     '<div class="cx-account-meta">' + statusBadge + '</div>'
        +   '</div>'
        +   '<button class="cx-btn-disconnect" onclick="disconnectSocial(\'' + conn.id + '\')">Déconnecter</button>'
        + '</div>';
    }).join('')
    + '<button class="cx-btn-add" onclick="connectInstagram()">+ Connecter un autre compte</button>';
  } else {
    inner = ''
      + '<p class="cx-empty">Aucun compte Instagram connecté. Connecte ton compte '
      + '<strong>Instagram Professionnel</strong> (Business ou Créateur) pour publier et analyser tes stats.</p>'
      + '<button class="cx-btn-connect cx-btn-instagram" onclick="connectInstagram()">'
      +   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
      +   'Connecter mon Instagram'
      + '</button>';
  }
  return ''
    + '<div class="cx-card">'
    +   '<div class="cx-card-head">'
    +     '<div class="cx-card-icon cx-icon-instagram">'
    +       '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
    +     '</div>'
    +     '<div>'
    +       '<div class="cx-card-title">Instagram</div>'
    +       '<div class="cx-card-desc">Publication automatique · Statistiques réelles</div>'
    +     '</div>'
    +   '</div>'
    +   inner
    + '</div>';
}

// ─── LinkedIn card ───
function _cxLinkedinCard(connections) {
  var configured = !!LINKEDIN_CLIENT_ID;
  var inner;
  if (!configured) {
    inner = '<p class="cx-empty">L\'intégration LinkedIn arrivera dès que la clé d\'application LinkedIn sera configurée par l\'équipe.</p>';
  } else if (connections.length) {
    inner = connections.map(function (conn) {
      var avatar = conn.account_avatar_url
        ? '<img src="' + escapeHtml(conn.account_avatar_url) + '" alt="" class="cx-avatar">'
        : '<div class="cx-avatar cx-avatar-ph">' + (conn.account_name || conn.account_username || '?').charAt(0).toUpperCase() + '</div>';
      var statusBadge = conn.status === 'active'
        ? '<span class="cx-badge cx-badge-ok">Connecté</span>'
        : '<span class="cx-badge cx-badge-warn">' + escapeHtml(conn.status) + '</span>';
      return ''
        + '<div class="cx-account">'
        +   avatar
        +   '<div class="cx-account-info">'
        +     '<div class="cx-account-name">' + escapeHtml(conn.account_name || conn.account_username || '—') + '</div>'
        +     '<div class="cx-account-meta">' + statusBadge + '</div>'
        +   '</div>'
        +   '<button class="cx-btn-disconnect" onclick="disconnectSocial(\'' + conn.id + '\')">Déconnecter</button>'
        + '</div>';
    }).join('');
  } else {
    inner = ''
      + '<p class="cx-empty">Connecte ton profil LinkedIn pour publier directement sur ton fil depuis Veyra Studio.</p>'
      + '<button class="cx-btn-connect cx-btn-linkedin" onclick="connectLinkedin()">'
      +   '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V8h3v11zm-1.5-12.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zm13 12.5h-3v-5.5c0-1.4-1-1.7-1.5-1.7-.6 0-1.5.4-1.5 1.8V19h-3V8h2.9v1.5c.4-.7 1.3-1.5 2.8-1.5 1.6 0 3.3 1.3 3.3 3.6V19z"/></svg>'
      +   'Connecter mon LinkedIn'
      + '</button>';
  }
  return ''
    + '<div class="cx-card">'
    +   '<div class="cx-card-head">'
    +     '<div class="cx-card-icon cx-icon-linkedin">'
    +       '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V8h3v11zm-1.5-12.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zm13 12.5h-3v-5.5c0-1.4-1-1.7-1.5-1.7-.6 0-1.5.4-1.5 1.8V19h-3V8h2.9v1.5c.4-.7 1.3-1.5 2.8-1.5 1.6 0 3.3 1.3 3.3 3.6V19z"/></svg>'
    +     '</div>'
    +     '<div>'
    +       '<div class="cx-card-title">LinkedIn</div>'
    +       '<div class="cx-card-desc">Publier sur ton fil professionnel</div>'
    +     '</div>'
    +   '</div>'
    +   inner
    + '</div>';
}

// ─── Start LinkedIn OAuth ───
async function connectLinkedin() {
  if (!LINKEDIN_CLIENT_ID) {
    showSync('⚠️ LinkedIn pas encore configuré', 'rgba(245,158,11,.8)');
    return;
  }
  if (!sb) { showSync('Erreur serveur', 'rgba(220,38,38,.8)'); return; }
  try {
    var res = await sb.auth.getSession();
    var jwt = res.data && res.data.session && res.data.session.access_token;
    if (!jwt) { showSync('Session expirée — reconnecte-toi', 'rgba(220,38,38,.8)'); return; }
    if (typeof track === 'function') track('connexion_linkedin_started');
    var url = 'https://www.linkedin.com/oauth/v2/authorization'
      + '?response_type=code'
      + '&client_id=' + encodeURIComponent(LINKEDIN_CLIENT_ID)
      + '&redirect_uri=' + encodeURIComponent(LINKEDIN_REDIRECT)
      + '&state=' + encodeURIComponent(jwt)
      + '&scope=' + encodeURIComponent(LINKEDIN_SCOPE);
    window.location.href = url;
  } catch (e) {
    showSync('Impossible de démarrer la connexion', 'rgba(220,38,38,.8)');
  }
}

// ─── TikTok card ───
function _cxTiktokCard(connections) {
  var configured = !!TIKTOK_CLIENT_KEY;
  var inner;
  if (!configured) {
    inner = '<p class="cx-empty">L\'intégration TikTok arrivera dès que la clé d\'application TikTok sera configurée par l\'équipe.</p>';
  } else if (connections && connections.length) {
    inner = connections.map(function (conn) {
      var avatar = conn.account_avatar_url
        ? '<img src="' + escapeHtml(conn.account_avatar_url) + '" alt="" class="cx-avatar">'
        : '<div class="cx-avatar cx-avatar-ph">' + (conn.account_username || conn.account_name || '?').charAt(0).toUpperCase() + '</div>';
      var statusBadge = conn.status === 'active'
        ? '<span class="cx-badge cx-badge-ok">Connecté</span>'
        : '<span class="cx-badge cx-badge-warn">' + escapeHtml(conn.status) + '</span>';
      return ''
        + '<div class="cx-account">'
        +   avatar
        +   '<div class="cx-account-info">'
        +     '<div class="cx-account-name">@' + escapeHtml(conn.account_username || conn.account_name || '—') + '</div>'
        +     '<div class="cx-account-meta">' + statusBadge + '</div>'
        +   '</div>'
        +   '<button class="cx-btn-disconnect" onclick="disconnectSocial(\'' + conn.id + '\')">Déconnecter</button>'
        + '</div>';
    }).join('');
  } else {
    inner = ''
      + '<p class="cx-empty">Connecte ton compte TikTok pour publier des vidéos depuis Veyra Studio. <em>Note : TikTok exige une App Review avant la publication grand public — pendant le sandbox, seuls les comptes test peuvent publier.</em></p>'
      + '<button class="cx-btn-connect cx-btn-tiktok" onclick="connectTiktok()">'
      +   '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 8.5a6.5 6.5 0 0 0 4 1.4V6.7a3.3 3.3 0 0 1-2.6-2.7H14v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .4 0 .6.1V9.8a5.6 5.6 0 1 0 4.7 5.5z"/></svg>'
      +   'Connecter mon TikTok'
      + '</button>';
  }
  return ''
    + '<div class="cx-card">'
    +   '<div class="cx-card-head">'
    +     '<div class="cx-card-icon cx-icon-tiktok">'
    +       '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M16 8.5a6.5 6.5 0 0 0 4 1.4V6.7a3.3 3.3 0 0 1-2.6-2.7H14v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .4 0 .6.1V9.8a5.6 5.6 0 1 0 4.7 5.5z"/></svg>'
    +     '</div>'
    +     '<div>'
    +       '<div class="cx-card-title">TikTok</div>'
    +       '<div class="cx-card-desc">Publication vidéo</div>'
    +     '</div>'
    +   '</div>'
    +   inner
    + '</div>';
}

// ─── Start TikTok OAuth ───
async function connectTiktok() {
  if (!TIKTOK_CLIENT_KEY) {
    showSync('⚠️ TikTok pas encore configuré', 'rgba(245,158,11,.8)');
    return;
  }
  if (!sb) { showSync('Erreur serveur', 'rgba(220,38,38,.8)'); return; }
  try {
    var res = await sb.auth.getSession();
    var jwt = res.data && res.data.session && res.data.session.access_token;
    if (!jwt) { showSync('Session expirée — reconnecte-toi', 'rgba(220,38,38,.8)'); return; }
    if (typeof track === 'function') track('connexion_tiktok_started');
    var url = 'https://www.tiktok.com/v2/auth/authorize/'
      + '?client_key=' + encodeURIComponent(TIKTOK_CLIENT_KEY)
      + '&scope=' + encodeURIComponent(TIKTOK_SCOPE)
      + '&response_type=code'
      + '&redirect_uri=' + encodeURIComponent(TIKTOK_REDIRECT)
      + '&state=' + encodeURIComponent(jwt);
    window.location.href = url;
  } catch (e) {
    showSync('Impossible de démarrer la connexion', 'rgba(220,38,38,.8)');
  }
}

// ─── Start Instagram OAuth ───
async function connectInstagram() {
  if (!sb) { showSync('Erreur serveur', 'rgba(220,38,38,.8)'); return; }
  try {
    var res = await sb.auth.getSession();
    var jwt = res.data && res.data.session && res.data.session.access_token;
    if (!jwt) { showSync('Session expirée — reconnecte-toi', 'rgba(220,38,38,.8)'); return; }
    if (typeof track === 'function') track('connexion_instagram_started');
    window.location.href = INSTAGRAM_AUTH_BASE + '&state=' + encodeURIComponent(jwt);
  } catch (e) {
    showSync('Impossible de démarrer la connexion', 'rgba(220,38,38,.8)');
  }
}

// ─── Disconnect a social account ───
async function disconnectSocial(connectionId) {
  if (!confirm('Déconnecter ce compte ? Veyra n\'aura plus accès à la publication ni aux statistiques.')) return;
  if (!sb) return;
  try {
    var { error } = await sb.from('social_connections').delete().eq('id', connectionId);
    if (error) throw error;
    showSync('Compte déconnecté', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('connexion_disconnected');
    openConnexionsModal();
    if (typeof renderFeed === 'function') renderFeed();
  } catch (e) {
    showSync('Erreur lors de la déconnexion', 'rgba(220,38,38,.8)');
  }
}

// ─── Handle the OAuth return (?connected=instagram|error) ───
function handleConnectionReturn() {
  var url = new URL(window.location.href);
  var connected = url.searchParams.get('connected');
  if (!connected) return;

  var detail = url.searchParams.get('detail') || url.searchParams.get('reason') || '';

  url.searchParams.delete('connected');
  url.searchParams.delete('detail');
  url.searchParams.delete('reason');
  history.replaceState({}, '', url.toString());

  if (connected === 'instagram') {
    showSync('🎉 Instagram connecté !', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('connexion_instagram_completed');
    if (typeof renderFeed === 'function') renderFeed();
  } else if (connected === 'linkedin') {
    showSync('🎉 LinkedIn connecté !', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('connexion_linkedin_completed');
  } else if (connected === 'tiktok') {
    showSync('🎉 TikTok connecté !', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('connexion_tiktok_completed');
  } else if (connected === 'error') {
    console.error('Connect error:', detail);
    showSync('❌ Échec de la connexion' + (detail ? ' — ' + detail : ''), 'rgba(220,38,38,.85)');
  }
}

// ─── Quick LinkedIn post modal ───
async function openLinkedinPostModal() {
  closeSettingsMenu && closeSettingsMenu();
  if (typeof openModal !== 'function' || !sb || !window._VEYRA_UID) return;

  // Check connection
  var conn = null;
  try {
    var res = await sb.from('social_connections')
      .select('id, account_name, account_username, account_avatar_url')
      .eq('user_id', window._VEYRA_UID)
      .eq('platform', 'linkedin')
      .eq('status', 'active')
      .maybeSingle();
    conn = res.data;
  } catch (_e) {}

  if (!conn) {
    openModal('<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
      + '<h2>💼 Publier sur LinkedIn</h2>'
      + '<p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0 0 16px;">Tu dois d\'abord connecter ton compte LinkedIn depuis l\'onglet Feed → bannière de connexion.</p>'
      + '<div class="modal-acts"><button class="btn-s" onclick="closeModal()">Fermer</button>'
      + '<button class="btn-p" onclick="closeModal();openConnexionsModal()">Connecter LinkedIn →</button></div>');
    return;
  }

  var name = conn.account_name || conn.account_username || 'Toi';
  openModal('<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>💼 Publier sur LinkedIn</h2>'
    + '<div class="li-post-author">'
    +   (conn.account_avatar_url
        ? '<img src="' + escapeHtml(conn.account_avatar_url) + '" class="li-avatar" alt="">'
        : '<div class="li-avatar li-avatar-ph">' + escapeHtml(name.charAt(0).toUpperCase()) + '</div>')
    +   '<div><div class="li-name">' + escapeHtml(name) + '</div><div class="li-meta">Publication publique · fil principal</div></div>'
    + '</div>'
    + '<textarea id="li-post-text" rows="7" placeholder="Quoi de neuf ?" maxlength="3000" oninput="document.getElementById(\'li-char-count\').textContent=this.value.length+\'/3000\';"></textarea>'
    + '<div class="li-char-count"><span id="li-char-count">0/3000</span></div>'
    + '<div class="modal-acts">'
    +   '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    +   '<button class="btn-p" id="li-publish-btn" onclick="publishLinkedin()">Publier sur LinkedIn</button>'
    + '</div>');

  setTimeout(function() { var ta = document.getElementById('li-post-text'); if (ta) ta.focus(); }, 50);
}

async function publishLinkedin() {
  var ta = document.getElementById('li-post-text');
  if (!ta) return;
  var text = (ta.value || '').trim();
  if (!text) { showSync('⚠️ Écris quelque chose d\'abord', 'rgba(245,158,11,.8)'); return; }

  var btn = document.getElementById('li-publish-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Publication…'; }

  try {
    var res = await sb.functions.invoke('linkedin-publish', { body: { text: text } });
    if (res.error || (res.data && res.data.error)) {
      var detail = (res.data && (res.data.detail || res.data.error)) || (res.error && res.error.message) || 'erreur';
      showSync('❌ ' + String(detail).slice(0, 120), 'rgba(220,38,38,.8)');
      if (btn) { btn.disabled = false; btn.textContent = 'Publier sur LinkedIn'; }
      return;
    }
    closeModal();
    showSync('🎉 Publié sur LinkedIn !', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('linkedin_post_published');
  } catch (e) {
    showSync('❌ Erreur réseau', 'rgba(220,38,38,.8)');
    if (btn) { btn.disabled = false; btn.textContent = 'Publier sur LinkedIn'; }
  }
}

// ─── TikTok publish modal (video upload + publish) ───
async function openTiktokPostModal() {
  closeSettingsMenu && closeSettingsMenu();
  if (typeof openModal !== 'function' || !sb || !window._VEYRA_UID) return;

  var conn = null;
  try {
    var res = await sb.from('social_connections')
      .select('id, account_name, account_username, account_avatar_url')
      .eq('user_id', window._VEYRA_UID)
      .eq('platform', 'tiktok')
      .eq('status', 'active')
      .maybeSingle();
    conn = res.data;
  } catch (_e) {}

  if (!conn) {
    openModal('<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
      + '<h2>🎵 Publier sur TikTok</h2>'
      + '<p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0 0 16px;">Tu dois d\'abord connecter ton compte TikTok depuis l\'onglet Feed → bannière de connexion.</p>'
      + '<div class="modal-acts"><button class="btn-s" onclick="closeModal()">Fermer</button>'
      + '<button class="btn-p" onclick="closeModal();openConnexionsModal()">Connecter TikTok →</button></div>');
    return;
  }

  var name = conn.account_username || conn.account_name || 'Toi';
  openModal('<button class="modal-x" onclick="closeModal()" aria-label="Fermer">&times;</button>'
    + '<h2>🎵 Publier sur TikTok</h2>'
    + '<div class="li-post-author">'
    +   (conn.account_avatar_url
        ? '<img src="' + escapeHtml(conn.account_avatar_url) + '" class="li-avatar" alt="">'
        : '<div class="li-avatar li-avatar-ph" style="background:#0A0A14;">' + escapeHtml(name.charAt(0).toUpperCase()) + '</div>')
    +   '<div><div class="li-name">@' + escapeHtml(name) + '</div><div class="li-meta">Publication TikTok</div></div>'
    + '</div>'
    + '<div class="tt-upload-row" id="tt-upload-row">'
    +   '<label class="tt-upload-label">'
    +     '<input type="file" id="tt-video-file" accept="video/mp4,video/quicktime,video/webm" onchange="_ttFilePicked(event)" style="display:none;">'
    +     '<span class="tt-upload-ic">🎬</span>'
    +     '<span class="tt-upload-txt">Choisir une vidéo (.mp4 / .mov / .webm)</span>'
    +   '</label>'
    +   '<div id="tt-video-preview"></div>'
    + '</div>'
    + '<textarea id="tt-post-title" rows="3" placeholder="Légende (optionnel)" maxlength="2200"></textarea>'
    + '<div class="fr" style="margin-top:10px;"><label>Confidentialité</label>'
    +   '<select id="tt-post-privacy">'
    +     '<option value="SELF_ONLY">Privé (seulement moi)</option>'
    +     '<option value="MUTUAL_FOLLOW_FRIENDS">Amis (follow mutuel)</option>'
    +     '<option value="FOLLOWER_OF_CREATOR">Mes abonnés</option>'
    +     '<option value="PUBLIC_TO_EVERYONE">Public</option>'
    +   '</select>'
    + '</div>'
    + '<div class="cx-note" style="margin-top:14px;font-size:11px;">⚠️ En phase sandbox TikTok, seuls les comptes test peuvent publier. Démarre avec <strong>Privé</strong> et passe au public après l\'App Review.</div>'
    + '<div class="modal-acts">'
    +   '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    +   '<button class="btn-p" id="tt-publish-btn" onclick="publishTiktok()" disabled>Publier sur TikTok</button>'
    + '</div>');
}

var _TT_VIDEO_FILE = null;
function _ttFilePicked(e) {
  var f = e.target.files && e.target.files[0];
  if (!f) return;
  _TT_VIDEO_FILE = f;
  var preview = document.getElementById('tt-video-preview');
  if (preview) {
    preview.innerHTML = '<div class="tt-file-row">'
      + '<span class="tt-file-name">' + escapeHtml(f.name) + '</span>'
      + '<span class="tt-file-size">' + (f.size / 1048576).toFixed(1) + ' Mo</span>'
      + '</div>';
  }
  var btn = document.getElementById('tt-publish-btn');
  if (btn) btn.disabled = false;
}

async function publishTiktok() {
  if (!_TT_VIDEO_FILE) { showSync('⚠️ Choisis une vidéo d\'abord', 'rgba(245,158,11,.8)'); return; }
  var title = (document.getElementById('tt-post-title') || {}).value || '';
  var privacy = (document.getElementById('tt-post-privacy') || {}).value || 'SELF_ONLY';

  var btn = document.getElementById('tt-publish-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Upload…'; }

  try {
    // Upload video to post-media (public Storage bucket)
    var ext = (_TT_VIDEO_FILE.name.match(/\.(\w+)$/) || ['', 'mp4'])[1];
    var path = window._VEYRA_UID + '/' + Date.now() + '_tt.' + ext;
    var up = await sb.storage.from('post-media').upload(path, _TT_VIDEO_FILE, {
      contentType: _TT_VIDEO_FILE.type, upsert: false
    });
    if (up.error) throw new Error('upload_failed: ' + up.error.message);
    var pub = sb.storage.from('post-media').getPublicUrl(path);
    var videoUrl = pub.data.publicUrl;

    if (btn) btn.textContent = 'Envoi à TikTok…';

    var res = await sb.functions.invoke('tiktok-publish', {
      body: { video_url: videoUrl, title: title, privacy_level: privacy }
    });
    if (res.error || (res.data && res.data.error)) {
      var detail = (res.data && (res.data.detail || res.data.error)) || (res.error && res.error.message) || 'erreur';
      var detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
      showSync('❌ ' + detailStr.slice(0, 140), 'rgba(220,38,38,.8)');
      if (btn) { btn.disabled = false; btn.textContent = 'Publier sur TikTok'; }
      return;
    }
    closeModal();
    showSync('🎉 Publication TikTok lancée — TikTok traite la vidéo', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('tiktok_post_published');
    _TT_VIDEO_FILE = null;
  } catch (e) {
    showSync('❌ ' + (e.message || 'Erreur réseau'), 'rgba(220,38,38,.8)');
    if (btn) { btn.disabled = false; btn.textContent = 'Publier sur TikTok'; }
  }
}
