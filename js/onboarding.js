/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Onboarding Wizard
   Multi-step wizard shown on first login.
   ═══════════════════════════════════════════════ */

var OB_STEP = 0;
var OB_DATA = {
  display_name: '',
  niche: '',
  location: '',
  tagline: '',
  ig_handle: '',
  tt_handle: '',
  ig_goal: '',
  tt_goal: '',
  ai_persona: ''
};

var OB_NICHES = ['Mode','Beauté','Fitness','Lifestyle','Food','Voyage','Tech','Gaming','Musique','Art','Business','Éducation','Famille','Humour','Autre'];

function showOnboardingWizard() {
  // Seed with existing profile if any (won't fire for already-onboarded users)
  var p = window._USER_PROFILE || {};
  Object.keys(OB_DATA).forEach(function(k) {
    if (p[k] != null) OB_DATA[k] = p[k];
  });
  if (!OB_DATA.display_name && window._USER_EMAIL) {
    OB_DATA.display_name = window._USER_EMAIL.split('@')[0];
  }
  OB_STEP = 0;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  var steps = [obStepIdentity, obStepSocials, obStepGoals, obStepPersona];
  var totalSteps = steps.length;
  var dots = '';
  for (var i = 0; i < totalSteps; i++) {
    dots += '<span class="ob-dot' + (i === OB_STEP ? ' active' : (i < OB_STEP ? ' done' : '')) + '"></span>';
  }

  var stepHtml = steps[OB_STEP]();
  var isLast = OB_STEP === totalSteps - 1;
  var prevBtn = OB_STEP > 0
    ? '<button class="btn-s" onclick="obPrev()">← Précédent</button>'
    : '<span></span>';
  var nextBtn = isLast
    ? '<button class="btn-p" onclick="obFinish()">Terminer ✓</button>'
    : '<button class="btn-p" onclick="obNext()">Suivant →</button>';

  var html =
      '<div class="ob-wrap">'
    +   '<div class="ob-progress">'
    +     '<div class="ob-step-label">Étape ' + (OB_STEP + 1) + ' / ' + totalSteps + '</div>'
    +     '<div class="ob-dots">' + dots + '</div>'
    +   '</div>'
    +   '<div class="ob-step">' + stepHtml + '</div>'
    +   '<div class="ob-actions">' + prevBtn + nextBtn + '</div>'
    + '</div>';

  openModal(html);
  // Prevent dismiss-on-overlay-click during onboarding
  var overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.setAttribute('data-ob', '1');
}

function obStepIdentity() {
  var nicheOpts = OB_NICHES.map(function(n) {
    var sel = OB_DATA.niche === n ? ' selected' : '';
    return '<option value="' + escapeHtml(n) + '"' + sel + '>' + escapeHtml(n) + '</option>';
  }).join('');

  return ''
    + '<h2 style="margin-bottom:6px;">Bienvenue sur Veyra Studio ✨</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 18px;">Commençons par te connaître. Tous les champs sont modifiables plus tard.</p>'
    + '<div class="fr"><label>Comment t\'appelles-tu ?</label>'
    +   '<input type="text" id="ob-display_name" value="' + escapeHtml(OB_DATA.display_name) + '" placeholder="Ton prénom ou pseudo" autofocus></div>'
    + '<div class="fr"><label>Ta niche principale</label>'
    +   '<select id="ob-niche"><option value="">— Choisir —</option>' + nicheOpts + '</select></div>'
    + '<div class="fr"><label>Tu es basé·e où ?</label>'
    +   '<input type="text" id="ob-location" value="' + escapeHtml(OB_DATA.location) + '" placeholder="Paris, Lyon, Montréal..."></div>'
    + '<div class="fr"><label>Une signature courte (optionnel)</label>'
    +   '<input type="text" id="ob-tagline" value="' + escapeHtml(OB_DATA.tagline) + '" placeholder="Ex: 1m82, maman de 3, ex-banquière..."></div>';
}

function obStepSocials() {
  return ''
    + '<h2 style="margin-bottom:6px;">Tes réseaux 📱</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 18px;">Tes handles servent à personnaliser l\'app (feed, liens, IA).</p>'
    + '<div class="fr"><label>Ton handle Instagram</label>'
    +   '<div style="display:flex;align-items:center;gap:6px;">'
    +     '<span style="color:var(--muted);font-size:13px;">@</span>'
    +     '<input type="text" id="ob-ig_handle" value="' + escapeHtml(OB_DATA.ig_handle) + '" placeholder="ton.handle" style="flex:1;" autofocus>'
    +   '</div></div>'
    + '<div class="fr"><label>Ton handle TikTok</label>'
    +   '<div style="display:flex;align-items:center;gap:6px;">'
    +     '<span style="color:var(--muted);font-size:13px;">@</span>'
    +     '<input type="text" id="ob-tt_handle" value="' + escapeHtml(OB_DATA.tt_handle) + '" placeholder="ton.handle" style="flex:1;">'
    +   '</div></div>';
}

function obStepGoals() {
  return ''
    + '<h2 style="margin-bottom:6px;">Tes objectifs 🎯</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 18px;">Combien d\'abonnés tu vises ? On affichera ta progression vers ces chiffres.</p>'
    + '<div class="fr"><label>Objectif Instagram</label>'
    +   '<input type="number" id="ob-ig_goal" value="' + escapeHtml(String(OB_DATA.ig_goal || '')) + '" placeholder="Ex: 30000" min="1" autofocus></div>'
    + '<div class="fr"><label>Objectif TikTok</label>'
    +   '<input type="number" id="ob-tt_goal" value="' + escapeHtml(String(OB_DATA.tt_goal || '')) + '" placeholder="Ex: 100000" min="1"></div>'
    + '<p style="font-size:11px;color:var(--muted);margin-top:8px;">💡 Astuce : choisis des objectifs ambitieux mais réalistes pour cette année.</p>';
}

function obStepPersona() {
  return ''
    + '<h2 style="margin-bottom:6px;">Personnalité IA 🤖</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 18px;">Décris ton style pour que l\'IA génère du contenu qui te ressemble (captions, scripts...). Optionnel.</p>'
    + '<div class="fr"><label>Ta personnalité de créateur·rice</label>'
    +   '<textarea id="ob-ai_persona" rows="4" placeholder="Ex: ton authentique, lifestyle accessible, humour léger, sensibilité body positive..." autofocus>' + escapeHtml(OB_DATA.ai_persona) + '</textarea></div>'
    + '<p style="font-size:11px;color:var(--muted);margin-top:8px;">L\'IA s\'en servira pour adapter chaque script et caption à ta voix.</p>';
}

function obCaptureStep() {
  if (OB_STEP === 0) {
    OB_DATA.display_name = (document.getElementById('ob-display_name') || {}).value || '';
    OB_DATA.niche        = (document.getElementById('ob-niche') || {}).value || '';
    OB_DATA.location     = (document.getElementById('ob-location') || {}).value || '';
    OB_DATA.tagline      = (document.getElementById('ob-tagline') || {}).value || '';
  } else if (OB_STEP === 1) {
    OB_DATA.ig_handle = ((document.getElementById('ob-ig_handle') || {}).value || '').replace(/^@/, '').trim();
    OB_DATA.tt_handle = ((document.getElementById('ob-tt_handle') || {}).value || '').replace(/^@/, '').trim();
  } else if (OB_STEP === 2) {
    var ig = parseInt((document.getElementById('ob-ig_goal') || {}).value, 10);
    var tt = parseInt((document.getElementById('ob-tt_goal') || {}).value, 10);
    OB_DATA.ig_goal = isNaN(ig) ? '' : ig;
    OB_DATA.tt_goal = isNaN(tt) ? '' : tt;
  } else if (OB_STEP === 3) {
    OB_DATA.ai_persona = (document.getElementById('ob-ai_persona') || {}).value || '';
  }
}

function obValidateStep() {
  if (OB_STEP === 0) {
    if (!OB_DATA.display_name.trim()) { showSync('⚠️ Ton nom est requis', 'rgba(245,158,11,.8)'); return false; }
    if (!OB_DATA.niche)                { showSync('⚠️ Choisis une niche', 'rgba(245,158,11,.8)'); return false; }
  } else if (OB_STEP === 1) {
    if (!OB_DATA.ig_handle && !OB_DATA.tt_handle) {
      showSync('⚠️ Renseigne au moins un handle', 'rgba(245,158,11,.8)');
      return false;
    }
  } else if (OB_STEP === 2) {
    if (!OB_DATA.ig_goal && !OB_DATA.tt_goal) {
      showSync('⚠️ Renseigne au moins un objectif', 'rgba(245,158,11,.8)');
      return false;
    }
  }
  return true;
}

function obNext() {
  obCaptureStep();
  if (!obValidateStep()) return;
  OB_STEP++;
  renderOnboardingStep();
}

function obPrev() {
  obCaptureStep();
  OB_STEP--;
  renderOnboardingStep();
}

async function obFinish() {
  obCaptureStep();
  if (!obValidateStep()) return;

  var btn = document.querySelector('.ob-actions .btn-p');
  if (btn) { btn.textContent = '⏳ Enregistrement...'; btn.disabled = true; }

  var patch = {
    display_name: OB_DATA.display_name.trim(),
    niche:        OB_DATA.niche || null,
    location:     OB_DATA.location.trim() || null,
    tagline:      OB_DATA.tagline.trim() || null,
    ig_handle:    OB_DATA.ig_handle || null,
    tt_handle:    OB_DATA.tt_handle || null,
    ig_goal:      OB_DATA.ig_goal || null,
    tt_goal:      OB_DATA.tt_goal || null,
    ai_persona:   OB_DATA.ai_persona.trim() || null,
    onboarded:    true
  };

  if (!sb || !window._VEYRA_UID) {
    showSync('⚠️ Pas de connexion serveur', 'rgba(220,38,38,.8)');
    if (btn) { btn.textContent = 'Terminer ✓'; btn.disabled = false; }
    return;
  }

  var res = await sb.from('profiles').update(patch).eq('id', window._VEYRA_UID).select().single();
  if (res.error) {
    showSync('❌ Erreur ' + res.error.message, 'rgba(220,38,38,.8)');
    if (btn) { btn.textContent = 'Terminer ✓'; btn.disabled = false; }
    return;
  }

  // Reload via refreshProfileAndRoute() so all profile columns (incl. subscription) are fresh
  window._USER_PROFILE = res.data;
  closeModal();
  showSync('✨ Profil configuré', 'rgba(5,150,105,.8)');
  // Route: onboarding done → paywall (or app if entitled / admin)
  refreshProfileAndRoute();
}
