/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Coaching hub
   Espace IA (idées & scripts) + Tendances + Calendrier marketing.
   Tendances & calendrier sont gérés par l'admin (table coaching_resources)
   et lus par tous les utilisateurs.
   ═══════════════════════════════════════════════ */

var COACH_RESOURCES = { trend: [], calendar: [] };

async function renderCoaching() {
  await loadCoachingResources();
  renderCoachTrends();
  renderCoachCalendar();
  var results = document.getElementById('coach-ai-results');
  if (results && !window._COACH_IDEAS) results.innerHTML = '';
}

// ─── Shared editorial content (admin-managed) ───
async function loadCoachingResources() {
  COACH_RESOURCES = { trend: [], calendar: [] };
  if (typeof sb === 'undefined' || !sb) return;
  try {
    var res = await sb.from('coaching_resources')
      .select('id, kind, title, body, event_date, emoji, sort')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true });
    if (res.data) {
      res.data.forEach(function (r) {
        if (COACH_RESOURCES[r.kind]) COACH_RESOURCES[r.kind].push(r);
      });
    }
  } catch (e) {
    console.error('loadCoachingResources failed:', e);
  }
}

function renderCoachTrends() {
  var el = document.getElementById('coach-trends');
  if (!el) return;
  var trends = COACH_RESOURCES.trend || [];
  if (!trends.length) {
    el.innerHTML = '<div class="coach-empty">Aucune tendance pour le moment — reviens bientôt !</div>';
    return;
  }
  el.innerHTML = trends.map(function (t) {
    return '<div class="coach-card">'
      + '<div class="coach-card-emoji">' + escapeHtml(t.emoji || '🔥') + '</div>'
      + '<div class="coach-card-body">'
      + '<div class="coach-card-title">' + escapeHtml(t.title || '') + '</div>'
      + (t.body ? '<div class="coach-card-text">' + escapeHtml(t.body) + '</div>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}

function renderCoachCalendar() {
  var el = document.getElementById('coach-calendar');
  if (!el) return;
  var cal = COACH_RESOURCES.calendar || [];
  if (!cal.length) {
    el.innerHTML = '<div class="coach-empty">Aucune date clé pour le moment.</div>';
    return;
  }
  el.innerHTML = cal.map(function (c) {
    return '<div class="coach-cal-row">'
      + '<div class="coach-cal-date">' + escapeHtml(c.emoji || '📌') + ' ' + escapeHtml(c.event_date || '') + '</div>'
      + '<div class="coach-cal-body">'
      + '<div class="coach-cal-title">' + escapeHtml(c.title || '') + '</div>'
      + (c.body ? '<div class="coach-cal-text">' + escapeHtml(c.body) + '</div>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════
//  Espace IA — idées de contenu + scripts
// ═══════════════════════════════════════════════

async function coachGenerateIdeas() {
  if (!getAiKey()) { showAiKeyModal(function () { coachGenerateIdeas(); }); return; }

  var inp = document.getElementById('coach-ai-topic');
  var topic = inp ? inp.value.trim() : '';

  var btn = document.getElementById('coach-ai-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Génération…'; }

  var prompt = _aiPersonaBlock()
    + 'Génère 6 idées de contenu court (Reel / Carrousel / Story) pour Instagram et TikTok'
    + (topic ? ' sur le thème : ' + topic : ' adaptées à sa niche')
    + '.\n\nRéponds UNIQUEMENT avec ce JSON (sans bloc markdown, sans explication) :\n'
    + '[{"title":"titre court et accrocheur","hook":"phrase d\'accroche pour les 3 premières secondes","format":"Reel|Carrousel|Story","angle":"pourquoi ça marche, en 1 phrase"}]\n'
    + '6 idées variées, concrètes et actionnables, dans la voix du créateur.';

  var result = await callClaude(prompt);
  if (btn) { btn.disabled = false; btn.textContent = 'Générer des idées'; }
  if (!result) return;

  try {
    var clean = result.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    var ideas = JSON.parse(clean);
    if (!Array.isArray(ideas)) throw new Error('not array');
    window._COACH_IDEAS = ideas;
    renderCoachIdeas();
    showSync('✨ ' + ideas.length + ' idées générées !', 'rgba(124,58,237,.8)');
  } catch (e) {
    showSync('❌ Format invalide — réessaie', 'rgba(220,38,38,.8)');
  }
}

function renderCoachIdeas() {
  var el = document.getElementById('coach-ai-results');
  if (!el) return;
  var ideas = window._COACH_IDEAS || [];
  if (!ideas.length) { el.innerHTML = ''; return; }

  el.innerHTML = ideas.map(function (idea, i) {
    return '<div class="coach-idea" id="coach-idea-' + i + '">'
      + '<div class="coach-idea-head">'
      + '<span class="coach-idea-fmt">' + escapeHtml(idea.format || 'Reel') + '</span>'
      + '<span class="coach-idea-title">' + escapeHtml(idea.title || '') + '</span>'
      + '</div>'
      + (idea.hook ? '<div class="coach-idea-hook">🎬 <strong>Hook :</strong> ' + escapeHtml(idea.hook) + '</div>' : '')
      + (idea.angle ? '<div class="coach-idea-angle">💡 ' + escapeHtml(idea.angle) + '</div>' : '')
      + '<button class="coach-idea-btn" id="coach-script-btn-' + i + '" onclick="coachGenerateScript(' + i + ')">✨ Générer le script</button>'
      + '<div class="coach-idea-script" id="coach-script-' + i + '"></div>'
      + '</div>';
  }).join('');
}

async function coachGenerateScript(idx) {
  if (!getAiKey()) { showAiKeyModal(function () { coachGenerateScript(idx); }); return; }
  var idea = (window._COACH_IDEAS || [])[idx];
  if (!idea) return;

  var btn = document.getElementById('coach-script-btn-' + idx);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Génération…'; }

  var prompt = _aiPersonaBlock()
    + 'Génère un script de tournage complet pour cette idée de contenu :\n'
    + 'Titre : ' + (idea.title || '') + '\n'
    + 'Format : ' + (idea.format || 'Reel') + '\n'
    + (idea.hook ? 'Hook : ' + idea.hook + '\n' : '')
    + '\nRéponds UNIQUEMENT avec ce JSON (sans bloc markdown) :\n'
    + '[{"n":1,"d":"description concrète et courte du plan"},...]\n'
    + 'Règles : 5 à 8 plans. Plan 1 = HOOK fort (1-3s). Dernier plan = CTA. Langage direct et actionnable.';

  var result = await callClaude(prompt);
  if (btn) { btn.disabled = false; btn.textContent = '✨ Régénérer le script'; }
  if (!result) return;

  try {
    var clean = result.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    var shots = JSON.parse(clean);
    if (!Array.isArray(shots)) throw new Error('not array');
    var scriptEl = document.getElementById('coach-script-' + idx);
    if (scriptEl) {
      scriptEl.innerHTML = shots.map(function (s, i) {
        return '<div class="coach-shot"><span class="coach-shot-n">' + (s.n || (i + 1)) + '</span>'
          + '<span class="coach-shot-d">' + escapeHtml(s.d || '') + '</span></div>';
      }).join('');
    }
    showSync('✨ Script généré !', 'rgba(124,58,237,.8)');
  } catch (e) {
    showSync('❌ Format invalide — réessaie', 'rgba(220,38,38,.8)');
  }
}
