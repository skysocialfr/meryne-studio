/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Paywall
   Shown when an authenticated user is not entitled (no active sub).
   Lets them start the 7-day trial via Stripe Checkout.
   ═══════════════════════════════════════════════ */

var VEYRA_PLANS = [
  {
    id: 'solo',
    price_id: 'price_1TWY5oAIFObJ3lA9b1ioqI8c',
    tag: 'SOLO',
    name: 'Pour créateur·rice solo',
    price: '9,99 €',
    period: '/ mois',
    feats: [
      '1 utilisateur',
      '1 compte Instagram + 1 TikTok',
      'Feed simulation',
      'Production / Planning / Stats',
      'IA Claude (50 générations / mois)',
      'Sync cloud temps réel',
      'Support par email'
    ]
  },
  {
    id: 'pro',
    price_id: 'price_1TWjvS0wPb5M8Vv3ipQvWtU7',
    tag: 'PRO',
    name: 'Pour power creator',
    price: '19,99 €',
    period: '/ mois',
    popular: true,
    feats: [
      '1 utilisateur',
      '3 comptes Instagram + 3 TikTok',
      'Tout Solo, plus :',
      'IA Claude illimitée',
      'Statistiques avancées',
      'Support prioritaire',
      'Accès anticipé aux nouvelles features'
    ]
  },
  {
    id: 'agency',
    price_id: 'price_1TWjvl0wPb5M8Vv3887w92ru',
    tag: 'AGENCY',
    name: 'Pour agence / équipe',
    price: '59,99 €',
    period: '/ mois',
    feats: [
      '5 utilisateurs en équipe',
      '10 comptes Instagram + 10 TikTok',
      'Tout Pro, plus :',
      "Gestion d'équipe (rôles)",
      'Bibliothèque partagée',
      'Support dédié',
      'SLA réponse < 4h'
    ]
  }
];

function showPaywall() {
  if (typeof track === 'function') track('paywall_viewed');
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
    sub = 'Réactive ton plan pour retrouver ton studio.';
  } else {
    headline = 'Bienvenue, ' + escapeHtml(p.display_name || 'créateur·rice') + ' ✨';
    sub = 'Choisis ton plan pour démarrer ton essai gratuit de 7 jours.';
  }

  var hasCustomer = !!p.stripe_customer_id;
  var portalLink = hasCustomer
    ? '<button class="pw-secondary" onclick="openCustomerPortal()">Gérer ma facturation</button>'
    : '';

  // Recovery state (canceled / past_due) — show single CTA to portal, not 3 plans
  if (status === 'past_due' || status === 'unpaid' || status === 'canceled') {
    page.innerHTML =
        '<div class="pw-wrap">'
      +   '<div class="pw-brand">Veyra Studio</div>'
      +   '<h1 class="pw-headline">' + headline + '</h1>'
      +   '<p class="pw-sub">' + sub + '</p>'
      +   '<div class="pw-card" style="text-align:center;padding:32px;">'
      +     '<button class="pw-cta" onclick="openCustomerPortal()">Gérer mon abonnement →</button>'
      +   '</div>'
      +   '<div class="pw-foot">'
      +     '<button class="pw-logout" onclick="doLogout()">Se déconnecter</button>'
      +   '</div>'
      + '</div>';
    page.style.display = 'flex';
    return;
  }

  var cardsHtml = VEYRA_PLANS.map(function(plan) {
    var feats = plan.feats.map(function(f) {
      return '<li>' + escapeHtml(f) + '</li>';
    }).join('');
    return ''
      + '<div class="pw-plan' + (plan.popular ? ' pw-plan-popular' : '') + '">'
      +   (plan.popular ? '<div class="pw-plan-badge">RECOMMANDÉ</div>' : '')
      +   '<div class="pw-plan-tag">' + plan.tag + '</div>'
      +   '<div class="pw-plan-name">' + plan.name + '</div>'
      +   '<div class="pw-plan-price"><strong>' + plan.price + '</strong><span>' + plan.period + '</span></div>'
      +   '<div class="pw-plan-trial">✨ 7 jours d\'essai gratuit</div>'
      +   '<ul class="pw-plan-feats">' + feats + '</ul>'
      +   '<button class="' + (plan.popular ? 'pw-cta' : 'pw-cta-ghost') + ' pw-plan-cta" '
      +     'onclick="startCheckout(\'' + plan.price_id + '\')" data-plan="' + plan.id + '">'
      +     'Démarrer ' + plan.tag.charAt(0) + plan.tag.slice(1).toLowerCase()
      +   '</button>'
      + '</div>';
  }).join('');

  page.innerHTML =
      '<div class="pw-wrap pw-wrap-wide">'
    +   '<div class="pw-brand">Veyra Studio</div>'
    +   '<h1 class="pw-headline">' + headline + '</h1>'
    +   '<p class="pw-sub">' + sub + '</p>'
    +   '<div class="pw-plans">' + cardsHtml + '</div>'
    +   '<div class="pw-trust">'
    +     '<span>🔒 Paiement sécurisé Stripe</span>'
    +     '<span>·</span>'
    +     '<span>Annulation 1 clic depuis ton espace</span>'
    +   '</div>'
    +   '<div class="pw-foot">'
    +     portalLink
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

// Kick off Stripe Checkout for a given plan price_id
async function startCheckout(priceId) {
  if (typeof track === 'function') track('checkout_started', { price_id: priceId });
  // Find the button that was clicked to disable it
  var btn = document.querySelector('[onclick*="' + priceId + '"]');
  var originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Préparation…'; }

  try {
    var res = await sb.functions.invoke('create-checkout', {
      body: { price_id: priceId }
    });
    if (res.error) throw new Error(res.error.message || 'invoke_failed');
    var data = res.data || {};
    if (data.error === 'already_subscribed') {
      showSync('Tu es déjà abonné·e', 'rgba(5,150,105,.8)');
      refreshProfileAndRoute();
      return;
    }
    if (data.error === 'invalid_price_id') {
      throw new Error('invalid_price_id');
    }
    if (!data.url) throw new Error('no_session_url');
    window.location.href = data.url;
  } catch (err) {
    console.error('Checkout failed:', err);
    if (btn) { btn.disabled = false; btn.textContent = originalLabel || 'Démarrer'; }
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

  if (typeof track === 'function') track('checkout_completed');
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
