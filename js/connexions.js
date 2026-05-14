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

  body.innerHTML = ''
    + '<div class="cx-sub" style="margin-bottom:14px;">Lie tes comptes pour publier automatiquement et analyser tes vraies statistiques directement depuis Veyra Studio.</div>'
    + _cxInstagramCard(ig)
    + _cxTiktokCard()
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
    +     '<span class="cx-badge cx-badge-soon">Bientôt</span>'
    +   '</div>'
    +   '<p class="cx-empty">L\'intégration TikTok arrive prochainement.</p>'
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
    // Re-render the Feed so the beautiful header + grid pick up the real data
    if (typeof renderFeed === 'function') renderFeed();
  } else if (connected === 'error') {
    console.error('Instagram connect error:', detail);
    showSync('❌ Échec connexion Instagram' + (detail ? ' — ' + detail : ''), 'rgba(220,38,38,.85)');
  }
}
