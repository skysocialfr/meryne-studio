/* ═══════════════════════════════════════════════
   MERYNE STUDIO V5 — Analytics & Charts (Chart.js)
   ═══════════════════════════════════════════════ */

// ─── Chart.js instance registry ───
var _charts = {};

function _destroyChart(id) {
  if (_charts[id]) {
    _charts[id].destroy();
    delete _charts[id];
  }
}

// ─── Shared Chart.js defaults ───
function _chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24,24,27,.95)',
        titleFont: { family: 'DM Sans', size: 11 },
        bodyFont: { family: 'DM Mono', size: 11 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      x: {
        ticks: { font: { family: 'DM Sans', size: 10 }, color: '#9CA3AF', maxRotation: 30 },
        grid: { display: false }
      },
      y: {
        ticks: { font: { family: 'DM Sans', size: 10 }, color: '#9CA3AF' },
        grid: { color: 'rgba(0,0,0,.05)' },
        beginAtZero: true
      }
    }
  };
}

// ─── Create / recreate a canvas inside a container ───
function _getCanvas(containerId, height) {
  var wrap = document.getElementById(containerId);
  if (!wrap) return null;
  var existing = wrap.querySelector('canvas');
  if (existing) { existing.remove(); }
  var cv = document.createElement('canvas');
  cv.style.height = (height || 200) + 'px';
  wrap.appendChild(cv);
  return cv.getContext('2d');
}

// ─── Bar chart (views) ───
function _makeBarChart(containerId, labels, data, label) {
  _destroyChart(containerId);
  var ctx = _getCanvas(containerId, 200);
  if (!ctx) return;
  var grad = ctx.createLinearGradient(0, 0, 400, 0);
  grad.addColorStop(0, '#FF2D7A');
  grad.addColorStop(1, '#7C3AED');
  var opts = _chartDefaults();
  opts.plugins.legend = { display: false };
  _charts[containerId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: label, data: data, backgroundColor: grad, borderRadius: 6, borderSkipped: false }]
    },
    options: opts
  });
}

// ─── Multi-line chart ───
function _makeLineChart(containerId, labels, datasets) {
  _destroyChart(containerId);
  var ctx = _getCanvas(containerId, 200);
  if (!ctx) return;
  var opts = _chartDefaults();
  opts.plugins.legend = {
    display: datasets.length > 1,
    labels: { font: { family: 'DM Sans', size: 11 }, color: '#6B7280', boxWidth: 10, padding: 16 }
  };
  _charts[containerId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets.map(function(ds) {
        return {
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color.replace(')', ',.12)').replace('rgb', 'rgba').replace('#', 'rgba(') || 'transparent',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: datasets.length === 1
        };
      })
    },
    options: opts
  });
}

// ─── Horizontal bar chart (top 5) ───
function _makeHBarChart(containerId, labels, data) {
  _destroyChart(containerId);
  var ctx = _getCanvas(containerId, 180);
  if (!ctx) return;
  var opts = _chartDefaults();
  opts.indexAxis = 'y';
  opts.scales.x.grid = { color: 'rgba(0,0,0,.05)' };
  opts.scales.y.grid = { display: false };
  _charts[containerId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: ['#FF2D7A','#7C3AED','#0891B2','#059669','#F59E0B'], borderRadius: 4, borderSkipped: false }]
    },
    options: opts
  });
}

// ─── Export CSV ───
function exportCSV() {
  var rows = [['Titre','Plateforme','Date','Semaine','Vues','Likes','Comments','Saves','Shares','Portée','Visionnage(s)','Engagement %']];
  PUBS.filter(function(p) { return p.done; }).forEach(function(p) {
    if (!p.stats) p.stats = {};
    rows.push([
      '"' + (p.title || '').replace(/"/g, '""') + '"',
      p.plat, p.date, p.sem,
      p.stats.v || 0, p.stats.l || 0, p.stats.c || 0, p.stats.s || 0, p.stats.sh || 0,
      p.stats.reach || 0, p.stats.wt || 0,
      eng(p)
    ]);
  });
  var csv = rows.map(function(r) { return r.join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
  ['Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].forEach(function(m) { html += '<span>' + m + '</span>'; });
  html += '</div><div class="hm-grid">';
  for (var i = 0; i < 308; i++) {
    var d = new Date(start.getTime() + i * 86400000);
    var key = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
    var n = counts[key] || 0;
    var alpha = n ? (0.25 + (n / max) * 0.75).toFixed(2) : 0;
    var bg = n ? 'background:linear-gradient(135deg,rgba(255,45,122,' + alpha + '),rgba(124,58,237,' + alpha + '))' : 'background:#F3F4F6';
    html += '<div class="hm-cell" title="' + key + (n ? ' — ' + n + ' post(s)' : '') + '" style="' + bg + '"></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ─── Count-up animation ───
function _countUp(el, target, suffix) {
  if (!el) return;
  var start = 0;
  var duration = 800;
  var step = duration / 60;
  var increment = target / (duration / step);
  var current = 0;
  var timer = setInterval(function() {
    current = Math.min(current + increment, target);
    el.textContent = Math.round(current).toLocaleString('fr-FR') + (suffix || '');
    if (current >= target) clearInterval(timer);
  }, step);
}

// ─── Render Analytics Tab ───
function renderAnalytics() {
  var posted = PUBS.filter(function(p) { return p.done; });
  var withStats = posted.filter(function(p) { return p.stats && p.stats.v > 0; });

  var tv = withStats.reduce(function(s, p) { return s + (p.stats.v || 0); }, 0);
  var tl = withStats.reduce(function(s, p) { return s + (p.stats.l || 0); }, 0);
  var ts = withStats.reduce(function(s, p) { return s + (p.stats.s || 0); }, 0);
  var tc = withStats.reduce(function(s, p) { return s + (p.stats.c || 0); }, 0);
  var tsh = withStats.reduce(function(s, p) { return s + (p.stats.sh || 0); }, 0);
  var treach = posted.reduce(function(s, p) { return s + (p.stats && p.stats.reach ? p.stats.reach : 0); }, 0);
  var avgWt = withStats.length ? Math.round(withStats.reduce(function(s, p) { return s + (p.stats.wt || 0); }, 0) / withStats.length) : 0;
  var avgE = withStats.length ? (withStats.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / withStats.length).toFixed(1) : 0;

  // Account engagement rate (total interactions / last follower count × 100)
  var igLast = FW.filter(function(f) { return f.ig > 0; });
  var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
  var totalInter = tl + tc + ts + tsh;
  var acctEng = (igC > 0 && posted.length > 0) ? ((totalInter / (igC * posted.length)) * 100).toFixed(2) : null;

  // ─── KPI Cards ───
  var kpis = [
    { l: 'Posts publiés',      v: posted.length,              s: 'sur ' + PUBS.length + ' planifiés',    c: '#FF2D7A',  i: '📸', animate: false },
    { l: 'Vues totales',        v: tv,                         s: 'tous posts confondus',                 c: '#06B6D4',  i: '👁',  animate: true },
    { l: 'Engagement moyen',    v: avgE + '%',                 s: 'par post avec stats',                  c: '#7C3AED',  i: '💜', animate: false },
    { l: 'Engagement compte',   v: acctEng ? acctEng + '%' : '—', s: 'vs abonnés IG × posts',           c: '#059669',  i: '📊', animate: false },
    { l: 'Portée totale',       v: treach,                     s: 'comptes atteints',                     c: '#F59E0B',  i: '📡', animate: true },
    { l: 'Visionnage moyen',    v: avgWt ? avgWt + 's' : '—', s: 'TikTok / Reels',                       c: '#EF4444',  i: '⏱', animate: false }
  ];

  document.getElementById('ana-kpis').innerHTML = kpis.map(function(k, i) {
    return '<div class="ana-kpi" style="border-top:3px solid ' + k.c + ';">'
      + '<div class="ak-i">' + k.i + '</div>'
      + '<div class="ak-l">' + k.l + '</div>'
      + '<div class="ak-v" style="color:' + k.c + '" id="akv-' + i + '">' + (k.animate ? '…' : (typeof k.v === 'number' ? k.v.toLocaleString('fr-FR') : k.v)) + '</div>'
      + '<div class="ak-sub">' + k.s + '</div>'
      + '</div>';
  }).join('');

  // Animate counters
  if (tv > 0) _countUp(document.getElementById('akv-1'), tv, '');
  if (treach > 0) _countUp(document.getElementById('akv-4'), treach, '');

  // ─── Platform split ───
  var igPosts = withStats.filter(function(p) { return p.plat === 'insta'; });
  var ttPosts = withStats.filter(function(p) { return p.plat === 'tiktok'; });
  var igV = igPosts.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var ttV = ttPosts.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var igE = igPosts.length ? (igPosts.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / igPosts.length).toFixed(1) : 0;
  var ttE = ttPosts.length ? (ttPosts.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / ttPosts.length).toFixed(1) : 0;
  var igReach = igPosts.reduce(function(s, p) { return s + (p.stats.reach || 0); }, 0);
  var ttReach = ttPosts.reduce(function(s, p) { return s + (p.stats.reach || 0); }, 0);
  var ttAvgWt = ttPosts.length ? Math.round(ttPosts.reduce(function(s, p) { return s + (p.stats.wt || 0); }, 0) / ttPosts.length) : 0;

  var platEl = document.getElementById('plat-split');
  if (platEl) {
    platEl.innerHTML =
      '<div class="ps-card">'
      + '<div class="ps-head" style="color:var(--ig)">📸 Instagram</div>'
      + '<div class="ps-stat"><span>' + igPosts.length + ' posts</span></div>'
      + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + igV.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Portée</span><span class="ps-val">' + igReach.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Engagement</span><span class="ps-val" style="color:var(--violet)">' + igE + '%</span></div>'
      + '</div>'
      + '<div class="ps-card">'
      + '<div class="ps-head" style="color:var(--tt)">🎵 TikTok</div>'
      + '<div class="ps-stat"><span>' + ttPosts.length + ' posts</span></div>'
      + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + ttV.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Portée</span><span class="ps-val">' + ttReach.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Engagement</span><span class="ps-val" style="color:var(--violet)">' + ttE + '%</span></div>'
      + (ttAvgWt ? '<div class="ps-stat"><span>Visionnage moy.</span><span class="ps-val">' + ttAvgWt + 's</span></div>' : '')
      + '</div>';
  }

  // ─── Top 5 posts ───
  var sorted = withStats.slice().sort(function(a, b) { return b.stats.v - a.stats.v; }).slice(0, 5);
  var bestEl = document.getElementById('best-block');
  if (bestEl) {
    if (sorted.length) {
      bestEl.innerHTML = '<div class="chart-title">Top 5 posts par vues</div>'
        + '<div id="ch-top5" style="height:180px;position:relative;"></div>';
      setTimeout(function() {
        _makeHBarChart('ch-top5',
          sorted.map(function(p) { return p.title.length > 30 ? p.title.slice(0, 30) + '…' : p.title; }),
          sorted.map(function(p) { return p.stats.v; })
        );
      }, 50);
    } else {
      bestEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">Aucune donnée</div>';
    }
  }

  // ─── Build week labels from PUBS data ───
  var allSems = Object.keys(PUBS.reduce(function(acc, p) { if (p.sem) acc[p.sem] = 1; return acc; }, {})).sort();
  if (!allSems.length) allSems = Object.keys(SEM);
  var wLabels = allSems.map(function(s) { return SEM[s] ? SEM[s].l.replace('Semaine ', 'S') : s; });

  // ─── Views chart (bar) ───
  var vByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done && p.stats && p.stats.v > 0; }).reduce(function(a, p) { return a + p.stats.v; }, 0);
  });
  var vEl = document.getElementById('ch-views');
  if (vEl) {
    setTimeout(function() { _makeBarChart('ch-views', wLabels, vByWeek, 'Vues'); }, 50);
  }

  // ─── Metrics chart (multi-line) ───
  var lByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + (p.stats && p.stats.l || 0); }, 0);
  });
  var ssByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + (p.stats && p.stats.s || 0); }, 0);
  });
  var cByWeek = allSems.map(function(s) {
    return PUBS.filter(function(p) { return p.sem === s && p.done; }).reduce(function(a, p) { return a + (p.stats && p.stats.c || 0); }, 0);
  });
  var mEl = document.getElementById('ch-metrics');
  if (mEl) {
    setTimeout(function() {
      _makeLineChart('ch-metrics', wLabels, [
        { data: lByWeek,  color: '#FF2D7A', label: 'Likes' },
        { data: ssByWeek, color: '#7C3AED', label: 'Saves' },
        { data: cByWeek,  color: '#06B6D4', label: 'Comments' }
      ]);
    }, 50);
  }

  // ─── Followers chart (line with fill) ───
  var fwWithData = FW.filter(function(f) { return f.ig > 0 || f.tt > 0; });
  if (fwWithData.length) {
    var fwLabels = fwWithData.map(function(f) { return f.l; });
    var igVals = fwWithData.map(function(f) { return f.ig; });
    var ttVals = fwWithData.map(function(f) { return f.tt; });
    var fEl = document.getElementById('ch-followers');
    if (fEl) {
      setTimeout(function() {
        _makeLineChart('ch-followers', fwLabels, [
          { data: igVals, color: '#C13584', label: 'Instagram' },
          { data: ttVals, color: '#FF004F', label: 'TikTok' }
        ]);
      }, 50);
    }
  }

  // ─── Week progress bars ───
  var semEl = document.getElementById('sem-progs');
  if (semEl) {
    semEl.innerHTML = allSems.map(function(s) {
      var sp = PUBS.filter(function(p) { return p.sem === s; });
      var doneN = sp.filter(function(p) { return p.done; }).length;
      var pctN = sp.length ? Math.round(doneN / sp.length * 100) : 0;
      var color = SEM[s] ? SEM[s].c : '#94A3B8';
      var label = SEM[s] ? SEM[s].l : s;
      return '<div class="sem-prog-row"><div class="sem-prog-lbl">' + label + '</div>'
        + '<div class="sem-prog-bar"><div class="sem-prog-fill" style="width:' + pctN + '%;background:' + color + '"></div></div>'
        + '<div class="sem-prog-val">' + doneN + '/' + sp.length + '</div></div>';
    }).join('');
  }

  // ─── Heatmap ───
  renderHeatmap();

  // ─── Followers KPIs ───
  var fwKpis = document.getElementById('fw-ana-kpis');
  if (fwKpis) {
    var ttLast = FW.filter(function(f) { return f.tt > 0; });
    var ttC = ttLast.length ? ttLast[ttLast.length - 1].tt : 0;
    var igGoalLbl = GOALS.ig >= 1000 ? Math.round(GOALS.ig / 1000) + 'K' : GOALS.ig;
    var ttGoalLbl = GOALS.tt >= 1000 ? Math.round(GOALS.tt / 1000) + 'K' : GOALS.tt;
    var igPct = igC && GOALS.ig ? Math.min(Math.round(igC / GOALS.ig * 100), 100) : 0;
    var ttPct = ttC && GOALS.tt ? Math.min(Math.round(ttC / GOALS.tt * 100), 100) : 0;
    fwKpis.innerHTML =
      '<div class="ana-kpi" style="border-top:3px solid var(--ig);">'
      + '<div class="ak-i">📸</div><div class="ak-l">Instagram</div>'
      + '<div class="ak-v" style="color:var(--ig)">' + (igC > 0 ? igC.toLocaleString('fr-FR') : '—') + '</div>'
      + '<div class="ak-sub">Obj. ' + igGoalLbl + ' · ' + igPct + '%</div>'
      + '<div style="background:#F3F4F6;border-radius:4px;height:4px;margin-top:6px;overflow:hidden;">'
      + '<div style="height:4px;border-radius:4px;background:var(--ig);width:' + igPct + '%;transition:width .6s"></div></div>'
      + '</div>'
      + '<div class="ana-kpi" style="border-top:3px solid var(--tt);">'
      + '<div class="ak-i">🎵</div><div class="ak-l">TikTok</div>'
      + '<div class="ak-v" style="color:var(--tt)">' + (ttC > 0 ? ttC.toLocaleString('fr-FR') : '—') + '</div>'
      + '<div class="ak-sub">Obj. ' + ttGoalLbl + ' · ' + ttPct + '%</div>'
      + '<div style="background:#F3F4F6;border-radius:4px;height:4px;margin-top:6px;overflow:hidden;">'
      + '<div style="height:4px;border-radius:4px;background:var(--tt);width:' + ttPct + '%;transition:width .6s"></div></div>'
      + '</div>';
  }

  // ─── Table ───
  var tbl = document.getElementById('ana-tbl');
  if (tbl) {
    tbl.innerHTML = '<table><thead><tr><th>Post</th><th>Plat.</th><th>Date</th><th>Vues</th><th>Likes</th><th>Saves</th><th>Portée</th><th>Eng.</th></tr></thead><tbody>'
      + posted.map(function(p) {
        if (!p.stats) p.stats = {};
        return '<tr>'
          + '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(p.title) + '</td>'
          + '<td>' + escapeHtml(p.plat) + '</td>'
          + '<td>' + escapeHtml(p.date) + '</td>'
          + '<td>' + (p.stats.v || 0).toLocaleString('fr-FR') + '</td>'
          + '<td>' + (p.stats.l || 0) + '</td>'
          + '<td>' + (p.stats.s || 0) + '</td>'
          + '<td>' + (p.stats.reach || 0).toLocaleString('fr-FR') + '</td>'
          + '<td style="color:var(--violet);font-weight:700;">' + eng(p) + '%</td>'
          + '</tr>';
      }).join('')
      + '</tbody></table>';
  }
}
