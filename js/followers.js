/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Followers Tracking
   ═══════════════════════════════════════════════ */

function renderFollowers() {
  var el = document.getElementById('fw-grid');
  if (!el) return;

  el.innerHTML = FW.map(function(w, i) {
    var prev = i > 0 ? FW[i - 1] : null;
    var dIg = prev && prev.ig && w.ig ? w.ig - prev.ig : null;
    var dTt = prev && prev.tt && w.tt ? w.tt - prev.tt : null;
    var igColor = dIg === null ? 'var(--muted)' : dIg >= 0 ? 'var(--green)' : 'var(--red)';
    var ttColor = dTt === null ? 'var(--muted)' : dTt >= 0 ? 'var(--green)' : 'var(--red)';

    return '<div class="fw-week">'
      + '<div class="fw-wl">' + escapeHtml(w.l) + '</div>'
      + '<div class="fw-wdt">' + escapeHtml(w.dt) + '</div>'
      + '<div class="fw-inputs">'
      + '<div class="fw-inp-wrap"><span class="fw-inp-lbl" style="color:var(--ig)">Instagram</span>'
      + '<input class="fw-inp" type="number" value="' + (w.ig || '') + '" placeholder="0" oninput="updFw(\'' + w.id + '\',\'ig\',this.value)" /></div>'
      + '<div class="fw-inp-wrap"><span class="fw-inp-lbl" style="color:var(--tt)">TikTok</span>'
      + '<input class="fw-inp" type="number" value="' + (w.tt || '') + '" placeholder="0" oninput="updFw(\'' + w.id + '\',\'tt\',this.value)" /></div>'
      + '</div>'
      + '<div class="fw-delta">'
      + '<span class="fw-d-val" style="color:' + igColor + '">IG: ' + (dIg !== null ? (dIg >= 0 ? '+' : '') + dIg : '\u2014') + '</span>'
      + '<span class="fw-d-val" style="color:' + ttColor + '">TT: ' + (dTt !== null ? (dTt >= 0 ? '+' : '') + dTt : '\u2014') + '</span>'
      + '</div>'
      + '</div>';
  }).join('');

  // Progress bars
  var igLast = FW.filter(function(f) { return f.ig > 0; });
  var ttLast = FW.filter(function(f) { return f.tt > 0; });
  var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
  var ttC = ttLast.length ? ttLast[ttLast.length - 1].tt : 0;
  var igPct = Math.min(100, Math.round(igC / 30000 * 100));
  var ttPct = Math.min(100, Math.round(ttC / 100000 * 100));

  document.getElementById('fw-prog').innerHTML =
    '<div class="fw-prog-item">'
    + '<div class="fw-prog-label">Instagram \u2014 Objectif 30K</div>'
    + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:' + igPct + '%;background:var(--ig)"></div></div>'
    + '<div class="fw-prog-text"><strong>' + igC.toLocaleString('fr-FR') + '</strong> / 30 000 abonn\u00E9s (' + igPct + '%)</div>'
    + '</div>'
    + '<div class="fw-prog-item">'
    + '<div class="fw-prog-label">TikTok \u2014 Objectif 100K</div>'
    + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:' + ttPct + '%;background:var(--tt)"></div></div>'
    + '<div class="fw-prog-text"><strong>' + ttC.toLocaleString('fr-FR') + '</strong> / 100 000 abonn\u00E9s (' + ttPct + '%)</div>'
    + '</div>';
}

function updFw(id, key, val) {
  var w = FW.find(function(x) { return x.id === id; });
  if (w) {
    w[key] = parseInt(val) || 0;
    save();
    renderKPIs();
  }
}
