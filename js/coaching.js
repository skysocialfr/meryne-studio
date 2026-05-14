/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Coaching hub
   Newsletters + Tendances + Calendrier marketing.
   Tout est géré par l'admin (table coaching_resources) et lu par
   l'ensemble des utilisateurs.
   ═══════════════════════════════════════════════ */

var COACH_RESOURCES = { newsletter: [], trend: [], calendar: [] };

async function renderCoaching() {
  await loadCoachingResources();
  renderCoachNewsletters();
  renderCoachTrends();
  renderCoachCalendar();
}

// ─── Shared editorial content (admin-managed) ───
async function loadCoachingResources() {
  COACH_RESOURCES = { newsletter: [], trend: [], calendar: [] };
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

function renderCoachNewsletters() {
  var el = document.getElementById('coach-newsletters');
  if (!el) return;
  var items = COACH_RESOURCES.newsletter || [];
  if (!items.length) {
    el.innerHTML = '<div class="coach-empty">Aucune newsletter pour le moment — reviens vite !</div>';
    return;
  }
  el.innerHTML = items.map(function (nl, i) {
    var preview = (nl.body || '').replace(/\s+/g, ' ').trim();
    if (preview.length > 130) preview = preview.slice(0, 130) + '…';
    return '<article class="coach-nl reveal" style="animation-delay:' + (i * 70) + 'ms;" onclick="openNewsletter(\'' + nl.id + '\')">'
      + '<div class="coach-nl-top">'
      + '<span class="coach-nl-emoji">' + escapeHtml(nl.emoji || '📬') + '</span>'
      + (nl.event_date ? '<span class="coach-nl-tag">' + escapeHtml(nl.event_date) + '</span>' : '')
      + '</div>'
      + '<h3 class="coach-nl-title">' + escapeHtml(nl.title || '') + '</h3>'
      + (preview ? '<p class="coach-nl-body">' + escapeHtml(preview) + '</p>' : '')
      + '<span class="coach-nl-cta">Lire la newsletter →</span>'
      + '</article>';
  }).join('');
}

// Opens the full newsletter in a modal, formatted like a real article.
function openNewsletter(id) {
  var nl = (COACH_RESOURCES.newsletter || []).find(function (x) { return x.id === id; });
  if (!nl || typeof openModal !== 'function') return;

  var paragraphs = (nl.body || '').split(/\n+/).filter(function (p) { return p.trim(); });
  var bodyHtml = paragraphs.length
    ? paragraphs.map(function (p) { return '<p class="nl-modal-p">' + escapeHtml(p.trim()) + '</p>'; }).join('')
    : '<p class="nl-modal-p" style="color:var(--muted);">Cette newsletter est vide pour le moment.</p>';

  var html = '<button class="modal-x" onclick="closeModal()">&times;</button>'
    + '<div class="nl-modal">'
    + '<div class="nl-modal-head">'
    + '<span class="nl-modal-emoji">' + escapeHtml(nl.emoji || '📬') + '</span>'
    + (nl.event_date ? '<span class="coach-nl-tag">' + escapeHtml(nl.event_date) + '</span>' : '')
    + '</div>'
    + '<h2 class="nl-modal-title">' + escapeHtml(nl.title || '') + '</h2>'
    + '<div class="nl-modal-body">' + bodyHtml + '</div>'
    + '</div>';
  openModal(html);
}

function renderCoachTrends() {
  var el = document.getElementById('coach-trends');
  if (!el) return;
  var trends = COACH_RESOURCES.trend || [];
  if (!trends.length) {
    el.innerHTML = '<div class="coach-empty">Aucune tendance pour le moment.</div>';
    return;
  }
  el.innerHTML = trends.map(function (t, i) {
    return '<div class="coach-card reveal" style="animation-delay:' + (i * 60) + 'ms;">'
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
  el.innerHTML = cal.map(function (c, i) {
    return '<div class="coach-cal-row reveal" style="animation-delay:' + (i * 60) + 'ms;">'
      + '<div class="coach-cal-date">' + escapeHtml(c.emoji || '📌') + ' ' + escapeHtml(c.event_date || '') + '</div>'
      + '<div class="coach-cal-body">'
      + '<div class="coach-cal-title">' + escapeHtml(c.title || '') + '</div>'
      + (c.body ? '<div class="coach-cal-text">' + escapeHtml(c.body) + '</div>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}
