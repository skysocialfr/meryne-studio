/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Analytics & Charts
   ═══════════════════════════════════════════════ */

// ─── Custom Canvas Chart ───
function drawChart(canvasId, labels, datasets) {
  var existing = document.getElementById(canvasId);
  if (!existing) {
    var canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.height = 180;
    var parent = document.getElementById(canvasId.replace('-canvas', ''));
    if (parent) parent.appendChild(canvas);
    else return;
    existing = canvas;
  }

  var ctx = existing.getContext('2d');
  var W = existing.offsetWidth || 400, H = 180;
  existing.width = W;
  ctx.clearRect(0, 0, W, H);

  var p = { t: 24, r: 16, b: 36, l: 44 };
  var maxVal = 0;
  datasets.forEach(function(d) {
    d.data.forEach(function(v) { if (v > maxVal) maxVal = v; });
  });
  if (maxVal === 0) maxVal = 10;

  var xStep = (W - p.l - p.r) / Math.max(labels.length - 1, 1);
  var yScale = (H - p.t - p.b) / maxVal;

  // Grid lines
  ctx.strokeStyle = '#F0F0F3';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(function(v) {
    var y = H - p.b - v * (H - p.t - p.b);
    ctx.beginPath();
    ctx.moveTo(p.l, y);
    ctx.lineTo(W - p.r, y);
    ctx.stroke();
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '9px DM Sans,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(v * maxVal), p.l - 4, y + 3);
  });

  // Data lines
  datasets.forEach(function(ds) {
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ds.data.forEach(function(val, i) {
      var x = p.l + i * xStep, y = H - p.b - val * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    ctx.fillStyle = ds.color;
    ds.data.forEach(function(val, i) {
      var x = p.l + i * xStep, y = H - p.b - val * yScale;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // X labels
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '9px DM Sans,sans-serif';
  ctx.textAlign = 'center';
  labels.forEach(function(lbl, i) {
    if (i % Math.ceil(labels.length / 8) === 0) {
      ctx.fillText(lbl, p.l + i * xStep, H - p.b + 14);
    }
  });
}

// ─── Render Analytics Tab ───
function renderAnalytics() {
  var posted = PUBS.filter(function(p) { return p.done; });
  var withStats = posted.filter(function(p) { return p.stats.v > 0; });
  var tv = withStats.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var tl = withStats.reduce(function(s, p) { return s + p.stats.l; }, 0);
  var ts = withStats.reduce(function(s, p) { return s + p.stats.s; }, 0);
  var avgE = withStats.length ? (withStats.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / withStats.length).toFixed(1) : 0;

  // KPIs
  document.getElementById('ana-kpis').innerHTML = [
    {l:'Posts publi\u00E9s', v:posted.length, s:'sur ' + PUBS.length + ' planifi\u00E9s', c:'var(--rose)'},
    {l:'Vues totales', v:tv > 0 ? tv.toLocaleString('fr-FR') : '0', s:'tous posts confondus', c:'var(--cyan)'},
    {l:'Likes totaux', v:tl > 0 ? tl.toLocaleString('fr-FR') : '0', s:'interactions', c:'var(--rose)'},
    {l:'Saves totaux', v:ts > 0 ? ts.toLocaleString('fr-FR') : '0', s:'enregistrements', c:'var(--violet)'},
    {l:'Engagement moy.', v:avgE + '%', s:'par post avec stats', c:'var(--green)'}
  ].map(function(k) {
    return '<div class="ana-kpi"><div class="ak-l">' + k.l + '</div><div class="ak-v" style="color:' + k.c + '">' + k.v + '</div><div class="ak-sub">' + k.s + '</div></div>';
  }).join('');

  // Platform split
  var igPosts = withStats.filter(function(p) { return p.plat === 'insta'; });
  var ttPosts = withStats.filter(function(p) { return p.plat === 'tiktok'; });
  var igV = igPosts.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var ttV = ttPosts.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var igE = igPosts.length ? (igPosts.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / igPosts.length).toFixed(1) : 0;
  var ttE = ttPosts.length ? (ttPosts.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / ttPosts.length).toFixed(1) : 0;

  document.getElementById('plat-split').innerHTML =
    '<div class="ps-card"><div class="ps-head" style="color:var(--ig)">Instagram</div>'
    + '<div class="ps-stat"><span>' + igPosts.length + ' posts publi\u00E9s</span></div>'
    + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + igV.toLocaleString('fr-FR') + '</span></div>'
    + '<div class="ps-stat"><span>Engagement</span><span class="ps-val" style="color:var(--violet)">' + igE + '%</span></div>'
    + '</div>'
    + '<div class="ps-card"><div class="ps-head" style="color:var(--tt)">TikTok</div>'
    + '<div class="ps-stat"><span>' + ttPosts.length + ' posts publi\u00E9s</span></div>'
    + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + ttV.toLocaleString('fr-FR') + '</span></div>'
    + '<div class="ps-stat"><span>Engagement</span><span class="ps-val" style="color:var(--violet)">' + ttE + '%</span></div>'
    + '</div>';

  // Top 5
  var sorted = withStats.slice().sort(function(a, b) { return b.stats.v - a.stats.v; }).slice(0, 5);
  document.getElementById('best-block').innerHTML = '<div class="best-block"><div class="chart-title">Top 5 posts par vues</div>'
    + sorted.map(function(p, i) {
      return '<div class="best-item"><span class="best-rank">#' + (i + 1) + '</span><span class="best-title">' + escapeHtml(p.title.slice(0, 50)) + '</span><span class="best-val" style="color:var(--cyan)">' + p.stats.v.toLocaleString('fr-FR') + '</span></div>';
    }).join('')
    + '</div>';

  // Week progress
  var semEl = document.getElementById('sem-progs');
  if (semEl) {
    semEl.innerHTML = Object.keys(SEM).map(function(s) {
      var sp = PUBS.filter(function(p) { return p.sem === s; });
      var done = sp.filter(function(p) { return p.done; }).length;
      var pct = sp.length ? Math.round(done / sp.length * 100) : 0;
      return '<div class="sem-prog-row"><div class="sem-prog-lbl">' + SEM[s].l + '</div><div class="sem-prog-bar"><div class="sem-prog-fill" style="width:' + pct + '%;background:' + SEM[s].c + '"></div></div><div class="sem-prog-val">' + done + '/' + sp.length + '</div></div>';
    }).join('');
  }

  // Charts
  var wLabels = Object.keys(SEM).map(function(s) { return SEM[s].l.replace('Semaine ', 'S'); });
  var vByWeek = Object.keys(SEM).map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done && p.stats.v > 0; }).reduce(function(a, p) { return a + p.stats.v; }, 0);
  });
  var lByWeek = Object.keys(SEM).map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + p.stats.l; }, 0);
  });
  var ssByWeek = Object.keys(SEM).map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + p.stats.s; }, 0);
  });

  // Views chart
  var vEl = document.getElementById('ch-views');
  if (vEl) {
    var c1 = document.getElementById('ch-views-canvas');
    if (!c1) { c1 = document.createElement('canvas'); c1.id = 'ch-views-canvas'; c1.height = 180; vEl.appendChild(c1); }
    setTimeout(function() { drawChart('ch-views-canvas', wLabels, [{data: vByWeek, color: 'var(--cyan)'}]); }, 50);
  }

  // Metrics chart
  var mEl = document.getElementById('ch-metrics');
  if (mEl) {
    var c2 = document.getElementById('ch-metrics-canvas');
    if (!c2) { c2 = document.createElement('canvas'); c2.id = 'ch-metrics-canvas'; c2.height = 180; mEl.appendChild(c2); }
    setTimeout(function() { drawChart('ch-metrics-canvas', wLabels, [{data: lByWeek, color: 'var(--rose)'}, {data: ssByWeek, color: 'var(--violet)'}]); }, 50);
  }

  // Followers chart
  var fwWithData = FW.filter(function(f) { return f.ig > 0 || f.tt > 0; });
  if (fwWithData.length) {
    var fwLabels = fwWithData.map(function(f) { return f.l; });
    var igVals = fwWithData.map(function(f) { return f.ig; });
    var ttVals = fwWithData.map(function(f) { return f.tt; });
    var fEl = document.getElementById('ch-followers');
    if (fEl) {
      var c3 = document.getElementById('ch-fw-canvas');
      if (!c3) { c3 = document.createElement('canvas'); c3.id = 'ch-fw-canvas'; c3.height = 180; fEl.appendChild(c3); }
      setTimeout(function() { drawChart('ch-fw-canvas', fwLabels, [{data: igVals, color: 'var(--ig)'}, {data: ttVals, color: 'var(--tt)'}]); }, 50);
    }
  }

  // Followers KPIs
  var fwKpis = document.getElementById('fw-ana-kpis');
  if (fwKpis) {
    var igLast = FW.filter(function(f) { return f.ig > 0; });
    var ttLast = FW.filter(function(f) { return f.tt > 0; });
    var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
    var ttC = ttLast.length ? ttLast[ttLast.length - 1].tt : 0;
    fwKpis.innerHTML = '<div class="ana-kpi"><div class="ak-l">Instagram actuels</div><div class="ak-v" style="color:var(--ig)">'
      + (igC > 0 ? igC.toLocaleString('fr-FR') : '\u2014') + '</div><div class="ak-sub">Objectif 30K</div></div>'
      + '<div class="ana-kpi"><div class="ak-l">TikTok actuels</div><div class="ak-v" style="color:var(--tt)">'
      + (ttC > 0 ? ttC.toLocaleString('fr-FR') : '\u2014') + '</div><div class="ak-sub">Objectif 100K</div></div>';
  }

  // Table
  var tbl = document.getElementById('ana-tbl');
  if (tbl) {
    tbl.innerHTML = '<table><thead><tr><th>Post</th><th>Plat.</th><th>Date</th><th>Vues</th><th>Likes</th><th>Saves</th><th>Eng.</th></tr></thead><tbody>'
      + posted.map(function(p) {
        return '<tr><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(p.title) + '</td><td>' + escapeHtml(p.plat) + '</td><td>' + escapeHtml(p.date) + '</td><td>' + p.stats.v.toLocaleString('fr-FR') + '</td><td>' + p.stats.l + '</td><td>' + p.stats.s + '</td><td>' + eng(p) + '%</td></tr>';
      }).join('')
      + '</tbody></table>';
  }
}
