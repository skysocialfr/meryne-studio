/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Script modal
   Shared component used by Production + Planning to display a
   shot-by-shot tournage script in a polished card layout (instead of
   the previous inline "terminal" panel).
   ═══════════════════════════════════════════════ */

function openScriptModal(scriptObj, contextTitle) {
  var modal = document.getElementById('script-modal');
  var body = document.getElementById('script-modal-body');
  if (!modal || !body || !scriptObj) return;

  var shots = Array.isArray(scriptObj.shots) ? scriptObj.shots : [];
  var title = scriptObj.title || 'Script de tournage';
  var ctx = contextTitle || '';

  // Per-shot accent palette (rotates across the 6 base hues)
  var accents = [
    { from: '#FF2D7A', to: '#FF6BA8', shadow: 'rgba(255,45,122,.35)' },
    { from: '#7C3AED', to: '#A78BFA', shadow: 'rgba(124,58,237,.35)' },
    { from: '#06B6D4', to: '#22D3EE', shadow: 'rgba(6,182,212,.35)' },
    { from: '#10B981', to: '#34D399', shadow: 'rgba(16,185,129,.35)' },
    { from: '#F59E0B', to: '#FBBF24', shadow: 'rgba(245,158,11,.35)' },
    { from: '#EC4899', to: '#F472B6', shadow: 'rgba(236,72,153,.35)' }
  ];

  // Pulls the leading emoji of a shot description (if any) for the chip
  function leadingEmoji(text) {
    if (!text) return null;
    var m = text.match(/^\s*(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*)\s*/u);
    return m ? m[1] : null;
  }
  function stripEmoji(text) {
    if (!text) return '';
    return text.replace(/^\s*(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*)\s*/u, '').trim();
  }

  var shotsHtml = '';
  if (!shots.length) {
    shotsHtml = '<div class="script-empty">Aucun plan défini pour ce script.</div>';
  } else {
    shotsHtml = shots.map(function(sh, i) {
      var a = accents[i % accents.length];
      var emoji = leadingEmoji(sh.d) || '🎬';
      var text = stripEmoji(sh.d || '');
      return '<article class="script-shot reveal" style="animation-delay:' + (i * 50) + 'ms;">'
        + '<div class="script-shot-badge" style="background:linear-gradient(135deg,' + a.from + ',' + a.to + ');box-shadow:0 8px 20px -6px ' + a.shadow + ';">'
        +   '<span class="script-shot-n">' + (i + 1) + '</span>'
        +   '<span class="script-shot-emoji">' + escapeHtml(emoji) + '</span>'
        + '</div>'
        + '<div class="script-shot-body">'
        +   '<div class="script-shot-label">Plan ' + (i + 1) + (i === 0 ? ' · Hook' : (i === shots.length - 1 ? ' · CTA' : '')) + '</div>'
        +   '<div class="script-shot-text">' + escapeHtml(text || sh.d || '') + '</div>'
        + '</div>'
        + '</article>';
    }).join('');
  }

  body.innerHTML = ''
    + '<div class="script-modal-hero">'
    +   '<button class="script-modal-close" onclick="closeScriptModal()" aria-label="Fermer">&times;</button>'
    +   '<div class="script-modal-eyebrow">🎬 Plan de tournage</div>'
    +   '<h2 class="script-modal-title">' + escapeHtml(title) + '</h2>'
    +   (ctx ? '<div class="script-modal-ctx">Pour : ' + escapeHtml(ctx) + '</div>' : '')
    +   '<div class="script-modal-meta">' + shots.length + ' plan' + (shots.length > 1 ? 's' : '') + '</div>'
    + '</div>'
    + '<div class="script-modal-list">' + shotsHtml + '</div>';

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeScriptModal() {
  var modal = document.getElementById('script-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}
