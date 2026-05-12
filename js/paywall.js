/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Paywall
   Shown when an authenticated user is not entitled (no active sub).
   Lets them start the 7-day trial via Stripe Checkout.
   ═══════════════════════════════════════════════ */

function showPaywall() {
  var p = window._USER_PROFILE || {};
  var page = document.getElementById('paywall-page');
  if (!page) {
    page = document.createElement('div');
    page.id = 'paywall-page';
    document.body.appendChild(page);
  }

  var status = p.subscription_status || 'none';
  var headline, sub;
  if (status === 'past_due' || status === 'unpaid') {
    headline = 'Ton paiement a échoué';
    sub = 'Mets à jour ta carte pour reprendre l\'accès à ton studio.';
  } else if (status === 'canceled') {
    headline = 'Ton abonnement est terminé';
    sub = 'Réactive Veyra Pro pour retrouver ton studio.';
  } else {
    headline = 'Bienvenue, ' + escapeHtml(p.display_name || 'créateur·rice') + ' ✨';
    sub = 'Démarre ton essai gratuit pour accéder à ton studio.';
  }

  var hasCustomer = !!p.stripe_customer_id;
  var primaryCta = (status === 'past_due' || status === 'unpaid' || status === 'canceled')
    ? '<button class="pw-cta" onclick="openCustomerPortal()">Gérer mon abonnement →</button>'
    : '<button class="pw-cta" onclick="startCheckout()">Démarrer mon essai 7 jours →</button>';

  var secondaryCta = hasCustomer
    ? '<button class="pw-secondary" onclick="openCustomerPortal()">Gérer ma facturation</button>'
    : '';

  var feats = [
    ['🖼️',  'Feed Instagram & TikTok',          'Simule ton feed et planifie tes visuels'],
    ['🎬',  'Production',                         'Tâches, scripts, plans de tournage'],
    ['📅',  'Planning multi-réseaux',             'Calendrier de publication unifié'],
    ['📈',  'Stats & objectifs',                  'Suivi de croissance hebdomadaire'],
    ['🤖',  'IA Claude intégrée',                 'Captions, hashtags, scripts à ta voix'],
    ['☁️',  'Sync cloud temps réel',              'Tout synchronisé, sur tous tes devices']
  ];
  var featsHtml = feats.map(function(f) {
    return '<div class="pw-feat">'
      + '<div class="pw-feat-icon">' + f[0] + '</div>'
      + '<div><div class="pw-feat-title">' + f[1] + '</div>'
      + '<div class="pw-feat-desc">' + f[2] + '</div></div>'
      + '</div>';
  }).join('');

  page.innerHTML =
      '<div class="pw-wrap">'
    +   '<div class="pw-brand">Veyra Studio</div>'
    +   '<h1 class="pw-headline">' + headline + '</h1>'
    +   '<p class="pw-sub">' + sub + '</p>'
    +   '<div class="pw-card">'
    +     '<div class="pw-card-top">'
    +       '<div>'
    +         '<div class="pw-card-tag">VEYRA PRO</div>'
    +         '<div class="pw-card-price"><strong>9,99 €</strong><span>/ mois</span></div>'
    +         '<div class="pw-card-trial">✨ 7 jours d\'essai gratuit — sans engagement</div>'
    +       '</div>'
    +     '</div>'
    +     '<div class="pw-features">' + featsHtml + '</div>'
    +     primaryCta
    +     '<div class="pw-trust">'
    +       '<span>🔒 Paiement sécurisé Stripe</span>'
    +       '<span>·</span>'
    +       '<span>Annulation 1 clic</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="pw-foot">'
    +     (secondaryCta || '')
    +     '<button class="pw-logout" onclick="doLogout()">Se déconnecter</button>'
    +   '</div>'
    + '</div>';

  page.style.display = 'flex';
}

function hidePaywall() {
  var page = document.getElementById('paywall-page');
  if (page) page.style.display = 'none';
}

// Subscription status badge in the app header
function renderSubscriptionBadge() {
  var el = document.getElementById('sub-badge');
  if (!el) return;
  var p = window._USER_PROFILE || {};

  if (p.role === 'admin') {
    el.className = 'sub-badge admin';
    el.innerHTML = '<span>👑 ADMIN</span>';
    el.style.display = 'inline-flex';
    el.onclick = openCustomerPortal;
    return;
  }

  if (p.subscription_status === 'trialing') {
    var trialEnd = p.trial_end ? new Date(p.trial_end) : null;
    var daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : null;
    el.className = 'sub-badge trial';
    el.innerHTML = '<span>✨ ESSAI' + (daysLeft != null ? ' · ' + daysLeft + 'j' : '') + '</span>';
    el.style.display = 'inline-flex';
    el.onclick = openCustomerPortal;
    return;
  }

  if (p.subscription_status === 'active') {
    el.className = 'sub-badge active';
    el.innerHTML = '<span>PRO</span>';
    el.style.display = 'inline-flex';
    el.onclick = openCustomerPortal;
    return;
  }

  el.style.display = 'none';
}

// Kick off Stripe Checkout
async function startCheckout() {
  var btn = document.querySelector('.pw-cta');
  if (btn) { btn.disabled = true; btn.textContent = 'Préparation…'; }

  try {
    var res = await sb.functions.invoke('create-checkout', { body: {} });
    if (res.error) throw new Error(res.error.message || 'invoke_failed');
    var data = res.data || {};
    if (data.error === 'already_subscribed') {
      showSync('Tu es déjà abonné·e', 'rgba(5,150,105,.8)');
      refreshProfileAndRoute();
      return;
    }
    if (!data.url) throw new Error('no_session_url');
    window.location.href = data.url;
  } catch (err) {
    console.error('Checkout failed:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Démarrer mon essai 7 jours →'; }
    showSync('❌ Impossible de démarrer le paiement', 'rgba(220,38,38,.8)');
  }
}

// Open Stripe customer portal (cancel, update card, view invoices)
async function openCustomerPortal() {
  try {
    var res = await sb.functions.invoke('customer-portal', { body: {} });
    if (res.error) throw new Error(res.error.message || 'invoke_failed');
    var data = res.data || {};
    if (data.error === 'no_customer') {
      // Not a customer yet — fall back to starting checkout
      startCheckout();
      return;
    }
    if (!data.url) throw new Error('no_session_url');
    window.location.href = data.url;
  } catch (err) {
    console.error('Portal failed:', err);
    showSync('❌ Erreur ouverture du portail', 'rgba(220,38,38,.8)');
  }
}

// Handle return from Stripe Checkout (?checkout=success|cancel).
// Webhook syncs the DB; we poll briefly so the user sees the update without manual refresh.
async function handleCheckoutReturn() {
  var url = new URL(window.location.href);
  var checkout = url.searchParams.get('checkout');
  if (!checkout) return;

  url.searchParams.delete('checkout');
  history.replaceState({}, '', url.toString());

  if (checkout === 'cancel') {
    showSync('Paiement annulé', 'rgba(245,158,11,.8)');
    return;
  }

  // success: poll the profile up to 10s until subscription_status flips
  showSync('🎉 Bienvenue dans Veyra Pro ! Activation en cours…', 'rgba(5,150,105,.8)');
  for (var i = 0; i < 10; i++) {
    await new Promise(function(r) { setTimeout(r, 1000); });
    if (!sb || !window._VEYRA_UID) break;
    try {
      var { data: profile } = await sb.from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', window._VEYRA_UID)
        .single();
      if (profile && (profile.subscription_status === 'trialing' || profile.subscription_status === 'active')) {
        window._USER_PROFILE = profile;
        hidePaywall();
        _routeAfterAuth();
        return;
      }
    } catch (e) {}
  }
  // Timeout: still no sync — leave a friendly message
  showSync('⚠️ Activation un peu lente — rafraîchis la page dans quelques secondes', 'rgba(245,158,11,.9)');
}
