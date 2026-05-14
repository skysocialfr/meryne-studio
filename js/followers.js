/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Objectifs de croissance
   Slim goals page, fed by the real Instagram follower count.
   ═══════════════════════════════════════════════ */

async function renderFollowers() {
  var progEl = document.getElementById('fw-prog');
  if (!progEl) return;

  // Resolve the real Instagram follower count + 30-day series.
  // Prefer data already fetched by other tabs; otherwise fetch it.
  var igCount = null;
  var followerSeries = [];

  if (window._IG_STATS && window._IG_STATS.profile) {
    igCount = window._IG_STATS.profile.followers;
    followerSeries = (window._IG_STATS.account && window._IG_STATS.account.followers) || [];
  } else if (window._IG_LIVE && window._IG_LIVE.profile) {
    igCount = window._IG_LIVE.profile.followers;
  }

  if (igCount == null) {
    progEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px;">Chargement…</div>';
    try {
      if (typeof sb !== 'undefined' && sb && window._VEYRA_UID) {
        var connRes = await sb.from('social_connections')
          .select('id').eq('user_id', window._VEYRA_UID)
          .eq('platform', 'instagram').eq('status', 'active').maybeSingle();
        if (connRes && connRes.data) {
          var syncRes = await sb.functions.invoke('instagram-sync', { body: {} });
          if (syncRes && syncRes.data && syncRes.data.profile) {
            igCount = syncRes.data.profile.followers;
          }
        }
      }
    } catch (e) { /* not connected — fall back below */ }
  }

  _renderGoals(igCount, followerSeries);
}

function _renderGoals(igCount, followerSeries) {
  var progEl = document.getElementById('fw-prog');
  if (!progEl) return;

  var igGoal = GOALS.ig;
  var ttGoal = GOALS.tt;

  // ─── Instagram — real data ───
  var igHtml;
  if (igCount != null) {
    var igPct = igGoal > 0 ? Math.min(100, Math.round(igCount / igGoal * 100)) : 0;
    var igProj = _projectFromSeries(followerSeries, igGoal, igCount);
    var igAlert = igPct >= 90 ? '<span class="goal-alert">🎉 Presque !</span>' : '';
    igHtml = '<div class="fw-prog-item">'
      + '<div class="fw-prog-label">Instagram — Objectif <span id="ig-goal-display">' + igGoal.toLocaleString('fr-FR') + '</span>'
      + ' <button class="goal-edit-btn" onclick="editGoal(\'ig\')" title="Modifier l\'objectif">✏️</button>' + igAlert + '</div>'
      + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:' + igPct + '%;background:var(--ig)"></div></div>'
      + '<div class="fw-prog-text"><strong>' + igCount.toLocaleString('fr-FR') + '</strong> / ' + igGoal.toLocaleString('fr-FR') + ' abonnés (' + igPct + '%)'
      + (igProj ? '<span class="fw-proj"> — ' + igProj + '</span>' : '') + '</div>'
      + '</div>';
  } else {
    igHtml = '<div class="fw-prog-item">'
      + '<div class="fw-prog-label">Instagram — Objectif <span id="ig-goal-display">' + igGoal.toLocaleString('fr-FR') + '</span>'
      + ' <button class="goal-edit-btn" onclick="editGoal(\'ig\')" title="Modifier l\'objectif">✏️</button></div>'
      + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:0%;background:var(--ig)"></div></div>'
      + '<div class="fw-prog-text">Connecte ton compte Instagram (onglet Connexions) pour suivre ta progression en temps réel.</div>'
      + '</div>';
  }

  // ─── TikTok — goal only (no TikTok integration yet) ───
  var ttHtml = '<div class="fw-prog-item">'
    + '<div class="fw-prog-label">TikTok — Objectif <span id="tt-goal-display">' + ttGoal.toLocaleString('fr-FR') + '</span>'
    + ' <button class="goal-edit-btn" onclick="editGoal(\'tt\')" title="Modifier l\'objectif">✏️</button></div>'
    + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:0%;background:var(--tt)"></div></div>'
    + '<div class="fw-prog-text">L\'intégration TikTok arrive bientôt — fixe déjà ton objectif.</div>'
    + '</div>';

  progEl.innerHTML = igHtml + ttHtml;
}

// Projects the goal-reach date from the real 30-day follower series.
function _projectFromSeries(series, goal, current) {
  if (current >= goal) return '🎉 Objectif atteint !';
  if (!series || series.length < 2) return null;
  var first = series[0].value || 0;
  var last = series[series.length - 1].value || 0;
  var spanDays = series.length - 1;
  var perDay = (last - first) / spanDays;
  if (perDay <= 0) return null;
  var remaining = goal - current;
  var days = Math.ceil(remaining / perDay);
  var d = new Date();
  d.setDate(d.getDate() + days);
  var mo = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var weeks = Math.round(days / 7);
  return '~' + weeks + ' sem. → ' + d.getDate() + ' ' + mo[d.getMonth()] + ' ' + d.getFullYear();
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
    // Sync goal back to user profile so it persists across sessions
    if (sb && window._VEYRA_UID && window._USER_PROFILE) {
      var col = plat === 'ig' ? 'ig_goal' : 'tt_goal';
      window._USER_PROFILE[col] = val;
      var patch = {};
      patch[col] = val;
      sb.from('profiles').update(patch).eq('id', window._VEYRA_UID).then(function(){}, function(){});
    }
    applyProfileToUI();
  }
  renderFollowers();
}
