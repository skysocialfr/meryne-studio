/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Analytics & Charts
   ═══════════════════════════════════════════════ */

// ─── Tooltip singleton ───
var _chartTip = null;
function getChartTip() {
  if (!_chartTip) {
    _chartTip = document.createElement('div');
    _chartTip.style.cssText = 'position:fixed;pointer-events:none;background:rgba(24,24,27,.92);color:#fff;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;opacity:0;transition:opacity .15s;z-index:9999;font-family:"DM Mono",monospace;white-space:nowrap;line-height:1.6;';
    document.body.appendChild(_chartTip);
  }
  return _chartTip;
}

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

  var pad = { t: 24, r: 16, b: 36, l: 44 };
  var maxVal = 0;
  datasets.forEach(function(d) {
    d.data.forEach(function(v) { if (v > maxVal) maxVal = v; });
  });
  if (maxVal === 0) maxVal = 10;

  var xStep = (W - pad.l - pad.r) / Math.max(labels.length - 1, 1);
  var yScale = (H - pad.t - pad.b) / maxVal;

  // Store data for tooltip
  existing._cd = { labels: labels, datasets: datasets, pad: pad, xStep: xStep, yScale: yScale, H: H };

  // Grid lines
  ctx.strokeStyle = '#F0F0F3';
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(function(v) {
    var y = H - pad.b - v * (H - pad.t - pad.b);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '9px DM Sans,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(v * maxVal), pad.l - 4, y + 3);
  });

  // Data lines
  datasets.forEach(function(ds) {
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ds.data.forEach(function(val, i) {
      var x = pad.l + i * xStep, y = H - pad.b - val * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    ctx.fillStyle = ds.color;
    ds.data.forEach(function(val, i) {
      var x = pad.l + i * xStep, y = H - pad.b - val * yScale;
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
      ctx.fillText(lbl, pad.l + i * xStep, H - pad.b + 14);
    }
  });

  // Tooltip on mousemove (setup once per canvas)
  if (!existing._tipSet) {
    existing._tipSet = true;
    existing.addEventListener('mousemove', function(e) {
      var cd = existing._cd;
      if (!cd) return;
      var rect = existing.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var best = null, bestDist = Infinity;
      cd.labels.forEach(function(lbl, i) {
        var x = cd.pad.l + i * cd.xStep;
        var d = Math.abs(mx - x);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      var tip = getChartTip();
      if (best !== null && bestDist < 28) {
        var lines = '<span style="opacity:.6;font-size:9px;">' + cd.labels[best] + '</span>';
        cd.datasets.forEach(function(ds) {
          var v = ds.data[best] || 0;
          lines += '<br>' + (ds.label ? ds.label + ' : ' : '') + v.toLocaleString('fr-FR');
        });
        tip.innerHTML = lines;
        tip.style.opacity = '1';
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = (e.clientY - 24) + 'px';
      } else {
        tip.style.opacity = '0';
      }
    });
    existing.addEventListener('mouseleave', function() { getChartTip().style.opacity = '0'; });
  }
}

// ─── Chart legend ───
function addChartLegend(containerId, datasets) {
  var c = document.getElementById(containerId);
  if (!c || datasets.length < 2) return;
  var old = c.querySelector('.chart-legend');
  if (old) old.remove();
  var el = document.createElement('div');
  el.className = 'chart-legend';
  el.innerHTML = datasets.map(function(ds) {
    return '<span class="cl-item"><span class="cl-dot" style="background:' + ds.color + '"></span>' + (ds.label || '') + '</span>';
  }).join('');
  c.appendChild(el);
}

// ─── Export CSV ───
function exportCSV() {
  var rows = [['Titre','Plateforme','Date','Semaine','Vues','Likes','Comments','Saves','Shares','Engagement %']];
  PUBS.filter(function(p) { return p.done; }).forEach(function(p) {
    rows.push([
      '"' + p.title.replace(/"/g,'""') + '"',
      p.plat, p.date, p.sem,
      p.stats.v, p.stats.l, p.stats.c, p.stats.s, p.stats.sh,
      eng(p)
    ]);
  });
  var csv = rows.map(function(r) { return r.join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'meryne-studio-stats.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Heatmap de publication ───
function renderHeatmap() {
  var el = document.getElementById('heatmap-grid');
  if (!el) return;
  var counts = {};
  PUBS.filter(function(p) { return p.done && p.date; }).forEach(function(p) {
    counts[p.date] = (counts[p.date] || 0) + 1;
  });
  var vals = Object.values(counts);
  var max = vals.length ? Math.max.apply(null, vals) : 1;
  var start = new Date(2026, 2, 1);
  var html = '<div class="hm-months">';
  var months = ['Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  months.forEach(function(m) { html += '<span>' + m + '</span>'; });
  html += '</div><div class="hm-grid">';
  for (var i = 0; i < 308; i++) {
    var d = new Date(start.getTime() + i * 86400000);
    var key = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
    var n = counts[key] || 0;
    var alpha = n ? (0.2 + (n / max) * 0.8).toFixed(2) : 0;
    html += '<div class="hm-cell" title="' + key + (n ? ' \u2014 ' + n + ' post(s)' : '') + '" style="background:rgba(255,45,122,' + alpha + ')"></div>';
  }
  html += '</div>';
  el.innerHTML = html;
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

  // Build dynamic week list from actual PUBS data (not limited to hardcoded SEM)
  var allSems = Object.keys(PUBS.reduce(function(acc, p) { if (p.sem) acc[p.sem] = 1; return acc; }, {})).sort();
  if (!allSems.length) allSems = Object.keys(SEM);

  // Week progress
  var semEl = document.getElementById('sem-progs');
  if (semEl) {
    semEl.innerHTML = allSems.map(function(s) {
      var sp = PUBS.filter(function(p) { return p.sem === s; });
      var done = sp.filter(function(p) { return p.done; }).length;
      var pct = sp.length ? Math.round(done / sp.length * 100) : 0;
      var color = SEM[s] ? SEM[s].c : '#94A3B8';
      var label = SEM[s] ? SEM[s].l : s;
      return '<div class="sem-prog-row"><div class="sem-prog-lbl">' + label + '</div><div class="sem-prog-bar"><div class="sem-prog-fill" style="width:' + pct + '%;background:' + color + '"></div></div><div class="sem-prog-val">' + done + '/' + sp.length + '</div></div>';
    }).join('');
  }

  // Charts (dynamic: adapt to all sem values present in PUBS)
  var wLabels = allSems.map(function(s) { return SEM[s] ? SEM[s].l.replace('Semaine ', 'S') : s; });
  var vByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done && p.stats.v > 0; }).reduce(function(a, p) { return a + p.stats.v; }, 0);
  });
  var lByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + p.stats.l; }, 0);
  });
  var ssByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + p.stats.s; }, 0);
  });

  // Views chart
  var vEl = document.getElementById('ch-views');
  if (vEl) {
    var c1 = document.getElementById('ch-views-canvas');
    if (!c1) { c1 = document.createElement('canvas'); c1.id = 'ch-views-canvas'; c1.height = 180; vEl.appendChild(c1); }
    setTimeout(function() { drawChart('ch-views-canvas', wLabels, [{data: vByWeek, color: 'var(--cyan)', label: 'Vues'}]); }, 50);
  }

  // Metrics chart
  var mEl = document.getElementById('ch-metrics');
  if (mEl) {
    var c2 = document.getElementById('ch-metrics-canvas');
    if (!c2) { c2 = document.createElement('canvas'); c2.id = 'ch-metrics-canvas'; c2.height = 180; mEl.appendChild(c2); }
    setTimeout(function() {
      drawChart('ch-metrics-canvas', wLabels, [
        {data: lByWeek, color: 'var(--rose)', label: 'Likes'},
        {data: ssByWeek, color: 'var(--violet)', label: 'Saves'}
      ]);
      addChartLegend('ch-metrics', [{color: 'var(--rose)', label: 'Likes'}, {color: 'var(--violet)', label: 'Saves'}]);
    }, 50);
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
      setTimeout(function() {
        drawChart('ch-fw-canvas', fwLabels, [
          {data: igVals, color: 'var(--ig)', label: 'Instagram'},
          {data: ttVals, color: 'var(--tt)', label: 'TikTok'}
        ]);
        addChartLegend('ch-followers', [{color: 'var(--ig)', label: 'Instagram'}, {color: 'var(--tt)', label: 'TikTok'}]);
      }, 50);
    }
  }

  // Heatmap
  renderHeatmap();

  // Followers KPIs
  var fwKpis = document.getElementById('fw-ana-kpis');
  if (fwKpis) {
    var igLast = FW.filter(function(f) { return f.ig > 0; });
    var ttLast = FW.filter(function(f) { return f.tt > 0; });
    var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
    var ttC = ttLast.length ? ttLast[ttLast.length - 1].tt : 0;
    var igGoalLbl = GOALS.ig >= 1000 ? Math.round(GOALS.ig / 1000) + 'K' : GOALS.ig;
    var ttGoalLbl = GOALS.tt >= 1000 ? Math.round(GOALS.tt / 1000) + 'K' : GOALS.tt;
    fwKpis.innerHTML = '<div class="ana-kpi"><div class="ak-l">Instagram actuels</div><div class="ak-v" style="color:var(--ig)">'
      + (igC > 0 ? igC.toLocaleString('fr-FR') : '\u2014') + '</div><div class="ak-sub">Objectif ' + igGoalLbl + '</div></div>'
      + '<div class="ana-kpi"><div class="ak-l">TikTok actuels</div><div class="ak-v" style="color:var(--tt)">'
      + (ttC > 0 ? ttC.toLocaleString('fr-FR') : '\u2014') + '</div><div class="ak-sub">Objectif ' + ttGoalLbl + '</div></div>';
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
