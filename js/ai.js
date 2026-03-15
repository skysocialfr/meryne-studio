/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — IA (Claude API)
   ═══════════════════════════════════════════════ */

var AI_KEY_LS = 'claude_api_key';

function getAiKey() { return localStorage.getItem(AI_KEY_LS) || ''; }

// ─── Key Configuration Modal ───
function showAiKeyModal(onSuccess) {
  var current = getAiKey();
  var html = '<button class="modal-x" onclick="closeModal()">&times;</button>'
    + '<h2>\uD83E\uDD16 Clé API Claude</h2>'
    + '<p style="font-size:12px;color:var(--muted);margin:0 0 16px">Obtiens ta clé sur <strong>console.anthropic.com</strong><br>Stockée localement sur ton appareil uniquement.</p>'
    + '<div class="fr"><label>Clé API</label><input id="ai-key-inp" type="password" value="' + escapeHtml(current) + '" placeholder="sk-ant-api03-..." style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:.5px;"></div>'
    + '<div class="modal-acts">'
    + '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="saveAiKey()">Enregistrer \u2713</button>'
    + '</div>';
  openModal(html);
  window._aiKeyCallback = onSuccess;
}

function saveAiKey() {
  var inp = document.getElementById('ai-key-inp');
  if (!inp) return;
  var key = inp.value.trim();
  if (!key.startsWith('sk-')) { inp.style.borderColor = 'var(--rose)'; return; }
  localStorage.setItem(AI_KEY_LS, key);
  closeModal();
  showSync('\u2705 Clé API sauvegardée', 'rgba(5,150,105,.8)');
  if (window._aiKeyCallback) { window._aiKeyCallback(); window._aiKeyCallback = null; }
}

// ─── Core API Call ───
async function callClaude(prompt) {
  var key = getAiKey();
  if (!key) return null;
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    var data = await res.json();
    if (data.error) { showSync('\u274C ' + (data.error.message || 'Erreur API'), 'rgba(220,38,38,.8)'); return null; }
    if (data.content && data.content[0]) return data.content[0].text;
    return null;
  } catch(e) {
    showSync('\u274C Erreur réseau — vérifie ta connexion', 'rgba(220,38,38,.8)');
    return null;
  }
}

// ─── Generate Script for Production Card ───
async function generateProdScript(prodId) {
  if (!getAiKey()) { showAiKeyModal(function() { generateProdScript(prodId); }); return; }

  var p = PROD.find(function(x) { return x.id === prodId; });
  if (!p) return;

  var btn = document.getElementById('ai-prod-btn-' + prodId);
  if (btn) { btn.textContent = '\u23F3'; btn.disabled = true; }

  var prompt = 'Tu es un assistant pour Meryne.eis, créatrice de contenu mode sur TikTok et Instagram.\n'
    + 'Profil : Parisienne, 1m82, style grande taille, lifestyle luxe accessible, authentique.\n\n'
    + 'Génère un plan de tournage pour ce contenu :\n'
    + 'Titre : ' + p.title + '\n'
    + 'Description : ' + p.desc + '\n'
    + 'Plateforme : ' + p.plat + '\n'
    + 'Format : ' + p.fmt + '\n\n'
    + 'Réponds UNIQUEMENT avec un tableau JSON (sans bloc markdown, sans explication) :\n'
    + '[{"n":1,"d":"description concrète et courte du plan"},...]\n'
    + 'Règles : 5 à 8 plans. Plan 1 = HOOK fort. Dernier plan = CTA. Langage direct et actionnable.';

  var result = await callClaude(prompt);
  if (btn) { btn.textContent = '\u2728 IA'; btn.disabled = false; }
  if (!result) return;

  try {
    var clean = result.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    var shots = JSON.parse(clean);
    if (!Array.isArray(shots)) throw new Error('not array');
    p.script.shots = shots;
    save();
    renderProd();
    showSync('\u2728 Script généré !', 'rgba(124,58,237,.8)');
  } catch(e) {
    showSync('\u274C Format invalide — réessaie', 'rgba(220,38,38,.8)');
  }
}

// ─── Generate Script inside Production Modal ───
async function generateProdModalScript() {
  if (!getAiKey()) { showAiKeyModal(function() { generateProdModalScript(); }); return; }

  var titleEl = document.getElementById('pe-title');
  var titleVal = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : '';
  if (!titleVal) { showSync('\u26A0\uFE0F Entre un titre d\'abord', 'rgba(245,158,11,.8)'); return; }

  var descEl  = document.getElementById('pe-desc');
  var descVal = (descEl && descEl.value.trim()) ? descEl.value.trim() : '';
  var platEl  = document.getElementById('pe-plat');
  var platVal = (platEl && platEl.value) ? platEl.value : '';
  var fmtEl   = document.getElementById('pe-fmt');
  var fmtVal  = (fmtEl && fmtEl.value) ? fmtEl.value : '';

  var btn = document.getElementById('ai-prod-modal-btn');
  if (btn) { btn.textContent = '\u23F3'; btn.disabled = true; }

  var prompt = 'Tu es un assistant pour Meryne.eis, créatrice de contenu mode sur TikTok et Instagram.\n'
    + 'Profil : Parisienne, 1m82, style grande taille, lifestyle luxe accessible, authentique.\n\n'
    + 'Génère un plan de tournage pour :\n'
    + 'Titre : ' + titleVal + '\n'
    + (descVal ? 'Description : ' + descVal + '\n' : '')
    + (platVal ? 'Plateforme : ' + platVal + '\n' : '')
    + (fmtVal  ? 'Format : '     + fmtVal  + '\n' : '')
    + '\nRéponds UNIQUEMENT avec ce JSON (sans bloc markdown) :\n'
    + '{"script_title":"titre court du script","shots":[{"d":"description concrète et courte"}]}\n'
    + 'Règles : 5 à 8 plans. Plan 1 = HOOK fort. Dernier plan = CTA. Langage direct et actionnable.';

  var result = await callClaude(prompt);
  if (btn) { btn.textContent = '\u2728 Générer script IA'; btn.disabled = false; }
  if (!result) return;

  try {
    var clean = result.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    var data = JSON.parse(clean);
    if (data.script_title) {
      var stitleEl = document.getElementById('pe-script-title');
      if (stitleEl) stitleEl.value = data.script_title;
      if (typeof _pe !== 'undefined' && _pe) _pe.script.title = data.script_title;
    }
    if (data.shots && Array.isArray(data.shots) && typeof _pe !== 'undefined' && _pe) {
      _pe.script.shots = data.shots.map(function(s) { return { d: s.d || '' }; });
      var container = document.getElementById('pe-shots');
      if (container && typeof shotEditHtml === 'function') {
        container.innerHTML = _pe.script.shots.map(function(s, i) { return shotEditHtml(i, s.d); }).join('');
      }
    }
    showSync('\u2728 Script généré !', 'rgba(124,58,237,.8)');
  } catch(e) {
    showSync('\u274C Format invalide \u2014 réessaie', 'rgba(220,38,38,.8)');
  }
}

// ─── Generate Caption + Hashtags for Planning Post ───
async function generateCaption(pubId) {
  if (!getAiKey()) { showAiKeyModal(function() { generateCaption(pubId); }); return; }

  var p = PUBS.find(function(x) { return x.id === pubId; });
  if (!p && typeof _pubbe !== 'undefined' && _pubbe && _pubbe.id === pubId) p = _pubbe;
  if (!p) return;

  var btn = document.getElementById('ai-caption-btn');
  if (btn) { btn.textContent = '\u23F3'; btn.disabled = true; }

  // Lire le titre saisi dans le modal (même si le post n'est pas encore sauvegardé)
  var titleEl = document.getElementById('ppe-title');
  var titleVal = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : (p.title || '');
  var platEl = document.getElementById('ppe-plat');
  var platVal = (platEl && platEl.value) ? platEl.value : (p.plat || 'tiktok');
  var fmtEl = document.getElementById('ppe-fmt');
  var fmtVal = (fmtEl && fmtEl.value) ? fmtEl.value : (p.fmt || '');
  var platLabel = platVal === 'tiktok' ? 'TikTok' : platVal === 'insta' ? 'Instagram' : 'Stories';

  var prompt = 'Tu es un assistant pour Meryne.eis, créatrice de contenu mode. Parisienne, 1m82, grande taille, lifestyle luxe accessible.\n\n'
    + 'Génère une caption, des hashtags ET un script de tournage complet pour :\n'
    + 'Titre du post : ' + titleVal + '\n'
    + 'Plateforme : ' + platLabel + '\n'
    + 'Format : ' + fmtVal + '\n\n'
    + 'Réponds UNIQUEMENT avec ce JSON (sans bloc markdown) :\n'
    + '{\n'
    + '  "caption": "2-3 phrases max, ton naturel et authentique, 1-2 emojis",\n'
    + '  "tags": "#tag1 #tag2 ... (15-20 hashtags pertinents)",\n'
    + '  "script_title": "titre court du script",\n'
    + '  "shots": [{"n":1,"d":"description concrète et courte du plan"},...]\n'
    + '}\n'
    + 'Règles script : 5 à 8 plans. Plan 1 = HOOK fort (1-3s). Dernier plan = CTA. Langage direct et actionnable.\n'
    + 'La caption doit sonner comme si c\'était Meryne qui écrit, pas un robot.';

  var result = await callClaude(prompt);
  if (btn) { btn.textContent = '\u2728 Caption IA'; btn.disabled = false; }
  if (!result) return;

  try {
    var clean = result.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    var data = JSON.parse(clean);

    // ─ Caption
    var captionDiv = document.getElementById('ai-caption-result');
    if (captionDiv && data.caption) {
      window._aiCaption = data.caption;
      captionDiv.innerHTML = '<div class="ai-result-box">'
        + '<div class="ai-result-label">\u2728 Caption générée</div>'
        + '<div class="ai-result-text">' + escapeHtml(data.caption) + '</div>'
        + '<button class="ai-copy-btn" onclick="(function(){if(navigator.clipboard)navigator.clipboard.writeText(window._aiCaption).then(function(){showSync(\'📋 Copié !\',\'rgba(5,150,105,.8)\')});})()">📋 Copier</button>'
        + '</div>';
    }

    // ─ Hashtags
    if (data.tags) {
      var tagsEl = document.getElementById('ppe-tags');
      if (tagsEl) {
        tagsEl.value = data.tags;
        if (typeof _pubbe !== 'undefined' && _pubbe) _pubbe.tags = data.tags;
      }
    }

    // ─ Script
    if (data.shots && Array.isArray(data.shots) && data.shots.length > 0) {
      var stitleEl = document.getElementById('ppe-stitle');
      if (stitleEl && data.script_title) {
        stitleEl.value = data.script_title;
        if (typeof _pubbe !== 'undefined' && _pubbe) _pubbe.script.title = data.script_title;
      }
      if (typeof _pubbe !== 'undefined' && _pubbe) {
        _pubbe.script.shots = data.shots.map(function(s, i) { return { n: i + 1, d: s.d || '' }; });
        var shotsContainer = document.getElementById('ppe-shots');
        if (shotsContainer && typeof pubShotHtml === 'function') {
          shotsContainer.innerHTML = _pubbe.script.shots.map(function(s, i) {
            return pubShotHtml(i, s.d);
          }).join('');
        }
      }
    }

    showSync('\u2728 Script + Caption générés !', 'rgba(124,58,237,.8)');
  } catch(e) {
    showSync('\u274C Format invalide — réessaie', 'rgba(220,38,38,.8)');
  }
}
