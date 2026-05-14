/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Connexions
   Link Instagram / TikTok accounts for auto-posting
   and the comment inbox.
   ═══════════════════════════════════════════════ */

// OAuth start URL for "Instagram API with Instagram Login".
// The Veyra user's Supabase JWT is appended as `state` so the
// instagram-oauth edge function knows who is connecting.
var INSTAGRAM_AUTH_BASE =
  'https://www.instagram.com/oauth/authorize'
  + '?force_reauth=true'
  + '&client_id=1271135391865752'
  + '&redirect_uri=' + encodeURIComponent('https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/instagram-oauth')
  + '&response_type=code'
  + '&scope=' + encodeURIComponent(
      'instagram_business_basic,instagram_business_manage_messages,'
      + 'instagram_business_manage_comments,instagram_business_content_publish,'
      + 'instagram_business_manage_insights');

async function renderConnexions() {
  var c = document.getElementById('tab-connexions');
  if (!c) return;
  c.innerHTML = '<div class="cx-wrap"><div class="cx-loading">Chargement…</div></div>';

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
  var tt = connections.filter(function (x) { return x.platform === 'tiktok'; });

  c.innerHTML = ''
    + '<div class="cx-wrap">'
    +   '<div class="cx-head">'
    +     '<div class="cx-title">Connexions</div>'
    +     '<div class="cx-sub">Lie tes comptes pour publier automatiquement et g&eacute;rer tes commentaires directement depuis Veyra Studio.</div>'
    +   '</div>'
    +   _cxInstagramCard(ig)
    +   _cxTiktokCard(tt)
    +   '<div class="cx-note">'
    +     '&#x1F512; Tes jetons d\'acc&egrave;s sont stock&eacute;s chiffr&eacute;s et ne sont jamais visibles. '
    +     'Tu peux d&eacute;connecter un compte &agrave; tout moment.'
    +   '</div>'
    + '</div>';
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
        ? '<span class="cx-badge cx-badge-ok">Connect&eacute;</span>'
        : '<span class="cx-badge cx-badge-warn">' + escapeHtml(conn.status) + '</span>';
      return ''
        + '<div class="cx-account">'
        +   avatar
        +   '<div class="cx-account-info">'
        +     '<div class="cx-account-name">@' + escapeHtml(conn.account_username || '—') + '</div>'
        +     '<div class="cx-account-meta">' + statusBadge + '</div>'
        +   '</div>'
        +   '<button class="cx-btn-disconnect" onclick="disconnectSocial(\'' + conn.id + '\')">D&eacute;connecter</button>'
        + '</div>';
    }).join('')
    + '<button class="cx-btn-add" onclick="connectInstagram()">+ Connecter un autre compte</button>';
  } else {
    inner = ''
      + '<p class="cx-empty">Aucun compte Instagram connect&eacute;. Connecte ton compte '
      + '<strong>Instagram Professionnel</strong> (Business ou Cr&eacute;ateur) pour publier et g&eacute;rer tes commentaires.</p>'
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
    +       '<div class="cx-card-desc">Publication automatique &middot; Bo&icirc;te de r&eacute;ception</div>'
    +     '</div>'
    +   '</div>'
    +   inner
    + '</div>';
}

// ─── TikTok card (coming soon) ───
function _cxTiktokCard() {
  return ''
    + '<div class="cx-card cx-card-soon">'
    +   '<div class="cx-card-head">'
    +     '<div class="cx-card-icon cx-icon-tiktok">'
    +       '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 8.5a6.5 6.5 0 0 0 4 1.4V6.7a3.3 3.3 0 0 1-2.6-2.7H14v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .4 0 .6.1V9.8a5.6 5.6 0 1 0 4.7 5.5z"/></svg>'
    +     '</div>'
    +     '<div>'
    +       '<div class="cx-card-title">TikTok</div>'
    +       '<div class="cx-card-desc">Publication automatique</div>'
    +     '</div>'
    +     '<span class="cx-badge cx-badge-soon">Bient&ocirc;t</span>'
    +   '</div>'
    +   '<p class="cx-empty">L\'int&eacute;gration TikTok arrive prochainement. Ton acc&egrave;s API est en cours de validation c&ocirc;t&eacute; TikTok.</p>'
    + '</div>';
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
  if (!confirm('Déconnecter ce compte ? Veyra n\'aura plus accès à la publication ni aux commentaires.')) return;
  if (!sb) return;
  try {
    // social_tokens row cascades on delete via the FK
    var { error } = await sb.from('social_connections').delete().eq('id', connectionId);
    if (error) throw error;
    showSync('Compte déconnecté', 'rgba(5,150,105,.8)');
    if (typeof track === 'function') track('connexion_disconnected');
    renderConnexions();
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
    var panel = document.getElementById('tab-connexions');
    if (panel && panel.classList.contains('active')) renderConnexions();
  } else if (connected === 'error') {
    console.error('Instagram connect error:', detail);
    showSync('❌ Échec connexion Instagram' + (detail ? ' — ' + detail : ''), 'rgba(220,38,38,.85)');
  }
}
