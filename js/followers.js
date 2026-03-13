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
  var igGoal = GOALS.ig;
  var ttGoal = GOALS.tt;
  var igPct = Math.min(100, Math.round(igC / igGoal * 100));
  var ttPct = Math.min(100, Math.round(ttC / ttGoal * 100));

  var igProj = calcProjection(FW, igGoal, 'ig');
  var ttProj = calcProjection(FW, ttGoal, 'tt');
  var igAlert = igPct >= 90 ? '<span class="goal-alert">\uD83C\uDF89 Presque !</span>' : '';
  var ttAlert = ttPct >= 90 ? '<span class="goal-alert">\uD83C\uDF89 Presque !</span>' : '';

  document.getElementById('fw-prog').innerHTML =
    '<div class="fw-prog-item">'
    + '<div class="fw-prog-label">Instagram \u2014 Objectif <span id="ig-goal-display">' + igGoal.toLocaleString('fr-FR') + '</span>'
    + ' <button class="goal-edit-btn" onclick="editGoal(\'ig\')" title="Modifier l\'objectif">\u270F\uFE0F</button>' + igAlert + '</div>'
    + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:' + igPct + '%;background:var(--ig)"></div></div>'
    + '<div class="fw-prog-text"><strong>' + igC.toLocaleString('fr-FR') + '</strong> / ' + igGoal.toLocaleString('fr-FR') + ' abonn\u00E9s (' + igPct + '%)'
    + (igProj ? '<span class="fw-proj"> \u2014 ' + igProj + '</span>' : '') + '</div>'
    + '</div>'
    + '<div class="fw-prog-item">'
    + '<div class="fw-prog-label">TikTok \u2014 Objectif <span id="tt-goal-display">' + ttGoal.toLocaleString('fr-FR') + '</span>'
    + ' <button class="goal-edit-btn" onclick="editGoal(\'tt\')" title="Modifier l\'objectif">\u270F\uFE0F</button>' + ttAlert + '</div>'
    + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:' + ttPct + '%;background:var(--tt)"></div></div>'
    + '<div class="fw-prog-text"><strong>' + ttC.toLocaleString('fr-FR') + '</strong> / ' + ttGoal.toLocaleString('fr-FR') + ' abonn\u00E9s (' + ttPct + '%)'
    + (ttProj ? '<span class="fw-proj"> \u2014 ' + ttProj + '</span>' : '') + '</div>'
    + '</div>';
}

function editGoal(plat) {
  var current = GOALS[plat];
  var spanId = plat + '-goal-display';
  var span = document.getElementById(spanId);
  if (!span) return;
  span.innerHTML = '<input type="number" id="goal-inp-' + plat + '" value="' + current
    + '" style="width:80px;font-size:11px;font-weight:700;border:1.5px solid var(--rose);border-radius:6px;padding:2px 6px;font-family:\'DM Mono\',monospace;"'
    + ' onblur="saveGoal(\'' + plat + '\')" onkeydown="if(event.key===\'Enter\')saveGoal(\'' + plat + '\')">';
  var inp = document.getElementById('goal-inp-' + plat);
  if (inp) { inp.focus(); inp.select(); }
}

function saveGoal(plat) {
  var inp = document.getElementById('goal-inp-' + plat);
  if (!inp) return;
  var val = parseInt(inp.value);
  if (val > 0) {
    GOALS[plat] = val;
    save();
  }
  renderFollowers();
}

// ─── Projection ───
function calcProjection(data, goal, key) {
  var withData = data.filter(function(w) { return w[key] > 0; });
  if (withData.length < 2) return null;
  var recent = withData.slice(-4);
  var growths = [];
  for (var i = 1; i < recent.length; i++) growths.push(recent[i][key] - recent[i - 1][key]);
  var avg = growths.reduce(function(a, b) { return a + b; }, 0) / growths.length;
  if (avg <= 0) return null;
  var current = withData[withData.length - 1][key];
  var remaining = goal - current;
  if (remaining <= 0) return '\uD83C\uDF89 Objectif atteint !';
  var weeks = Math.ceil(remaining / avg);
  var d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  var mo = ['jan.', 'f\u00E9v.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'ao\u00FBt', 'sept.', 'oct.', 'nov.', 'd\u00E9c.'];
  return '~' + weeks + ' sem. \u2192 ' + d.getDate() + '\u00A0' + mo[d.getMonth()] + '\u00A0' + d.getFullYear();
}

function updFw(id, key, val) {
  var w = FW.find(function(x) { return x.id === id; });
  if (w) {
    w[key] = parseInt(val) || 0;
    save();
    renderKPIs();
  }
}
