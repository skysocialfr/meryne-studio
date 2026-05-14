/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Connexions
   Link Instagram / TikTok accounts for auto-posting
   and the comment inbox.
   ═══════════════════════════════════════════════ */

// OAuth start URL for "Instagram API with Instagram Login".
// IMPORTANT: this must match Meta's generated "URL d'intégration" byte-for-byte
// — in particular redirect_uri is NOT url-encoded and the scope commas are %2C.
// Instagram compares the redirect_uri of the authorize step against the one
// sent in the token exchange; any encoding difference => "Error validating
// verification code".
var INSTAGRAM_AUTH_BASE =
  'https://www.instagram.com/oauth/authorize'
  + '?force_reauth=true'
  + '&client_id=1271135391865752'
  + '&redirect_uri=https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/instagram-oauth'
  + '&response_type=code'
  + '&scope=instagram_business_basic%2Cinstagram_business_manage_messages'
  + '%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish'
  + '%2Cinstagram_business_manage_insights';

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

// ─── Real Instagram feed (live API data) — rendered in the Feed tab ───
function _iglNum(n) {
  if (n == null) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

async function renderInstagramLive() {
  var panel = document.getElementById('ig-live-panel');
  if (!panel) return;

  // Is Instagram connected?
  var conn = null;
  if (sb && window._VEYRA_UID) {
    try {
      var res = await sb.from('social_connections')
        .select('id, account_username, status')
        .eq('user_id', window._VEYRA_UID)
        .eq('platform', 'instagram')
        .eq('status', 'active')
        .maybeSingle();
      conn = res.data;
    } catch (e) {}
  }

  if (!conn) {
    panel.innerHTML =
        '<div class="igl-prompt">'
      +   '<div class="igl-prompt-txt"><strong>Connecte ton Instagram</strong> pour voir ton vrai feed, tes vraies stats et tes commentaires en direct.</div>'
      +   '<button class="igl-prompt-btn" onclick="goToConnexionsTab()">Connecter mon Instagram &rarr;</button>'
      + '</div>';
    return;
  }

  panel.innerHTML = '<div class="igl-loading">Synchronisation de ton feed Instagram&hellip;</div>';

  try {
    var syncRes = await sb.functions.invoke('instagram-sync', { body: {} });
    if (syncRes.error) throw new Error(syncRes.error.message || 'sync_failed');
    var data = syncRes.data || {};
    if (data.error) throw new Error(data.detail ? JSON.stringify(data.detail) : data.error);

    var p = data.profile || {};
    var media = data.media || [];

    var grid = media.map(function (m) {
      var thumb = m.thumbnail || m.url;
      var isVideo = m.type === 'VIDEO';
      return '<a class="igl-cell" href="' + escapeHtml(m.permalink || '#') + '" target="_blank" rel="noopener">'
        + (thumb
            ? '<img src="' + escapeHtml(thumb) + '" alt="" loading="lazy">'
            : '<div class="igl-cell-ph"></div>')
        + (isVideo ? '<span class="igl-cell-vid">&#9658;</span>' : '')
        + '<div class="igl-cell-stats"><span>&#9829; ' + _iglNum(m.likes) + '</span>'
        + '<span>&#128172; ' + _iglNum(m.comments) + '</span></div>'
        + '</a>';
    }).join('');

    panel.innerHTML =
        '<div class="igl-card">'
      +   '<div class="igl-head">'
      +     (p.avatar
            ? '<img class="igl-avatar" src="' + escapeHtml(p.avatar) + '" alt="">'
            : '<div class="igl-avatar igl-avatar-ph"></div>')
      +     '<div class="igl-head-info">'
      +       '<div class="igl-username">@' + escapeHtml(p.username || '—')
      +         ' <span class="igl-live-badge">&#9679; LIVE</span></div>'
      +       '<div class="igl-head-stats">'
      +         '<span><strong>' + _iglNum(p.media_count) + '</strong> posts</span>'
      +         '<span><strong>' + _iglNum(p.followers) + '</strong> abonn&eacute;s</span>'
      +         '<span><strong>' + _iglNum(p.follows) + '</strong> abonnements</span>'
      +       '</div>'
      +     '</div>'
      +     '<button class="igl-refresh" onclick="renderInstagramLive()" title="Resynchroniser">&#8635;</button>'
      +   '</div>'
      +   (media.length
            ? '<div class="igl-grid">' + grid + '</div>'
            : '<div class="igl-empty">Aucun post publi&eacute; sur ce compte pour l\'instant.</div>')
      + '</div>';
  } catch (err) {
    console.error('instagram-sync failed:', err);
    panel.innerHTML =
        '<div class="igl-error">Impossible de charger ton feed Instagram'
      +   '<span class="igl-error-detail">' + escapeHtml(String(err && err.message || err)) + '</span>'
      +   '<button class="igl-prompt-btn" onclick="renderInstagramLive()">R&eacute;essayer</button>'
      + '</div>';
  }
}

// Jump to the Connexions tab (used by the "connect" prompt)
function goToConnexionsTab() {
  var btns = document.querySelectorAll('.bnt');
  for (var i = 0; i < btns.length; i++) {
    if (/connexions/i.test(btns[i].getAttribute('onclick') || '')) {
      btns[i].click();
      return;
    }
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
    // Re-render the Feed so the beautiful header + grid pick up the real data
    if (typeof renderFeed === 'function') renderFeed();
  } else if (connected === 'error') {
    console.error('Instagram connect error:', detail);
    showSync('❌ Échec connexion Instagram' + (detail ? ' — ' + detail : ''), 'rgba(220,38,38,.85)');
  }
}
