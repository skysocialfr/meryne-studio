/* ═══════════════════════════════════════════════
   VEYRA STUDIO — Analytics & Charts (Chart.js)
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
  var oldWrap = wrap.querySelector('.chart-cvs-wrap');
  if (oldWrap) { oldWrap.remove(); }
  else { var ex = wrap.querySelector('canvas'); if (ex) ex.remove(); }
  var inner = document.createElement('div');
  inner.className = 'chart-cvs-wrap';
  inner.style.cssText = 'position:relative;height:' + (height || 220) + 'px;width:100%;';
  var cv = document.createElement('canvas');
  inner.appendChild(cv);
  wrap.appendChild(inner);
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
  var ctx = _getCanvas(containerId, 200);
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
  // Real Instagram dataset takes precedence when available
  if (window._IG_STATS && Array.isArray(window._IG_STATS.posts)) {
    var realRows = [['Légende','Date','Type','Vues','Couverture','J\'aime','Commentaires','Enregistrements','Partages','Engagement %']];
    window._IG_STATS.posts.forEach(function(p) {
      realRows.push([
        '"' + (p.caption || '').split('\n')[0].replace(/"/g, '""') + '"',
        p.timestamp || '', p.type || '',
        p.views != null ? p.views : '', p.reach != null ? p.reach : '',
        p.likes || 0, p.comments || 0,
        p.saved != null ? p.saved : '', p.shares != null ? p.shares : '',
        _anaEng(p).toFixed(1)
      ]);
    });
    var realCsv = realRows.map(function(r) { return r.join(','); }).join('\n');
    var realBlob = new Blob(['﻿' + realCsv], { type: 'text/csv;charset=utf-8;' });
    var realUrl = URL.createObjectURL(realBlob);
    var ra = document.createElement('a');
    ra.href = realUrl; ra.download = 'veyra-studio-stats-instagram.csv';
    document.body.appendChild(ra); ra.click();
    document.body.removeChild(ra); URL.revokeObjectURL(realUrl);
    return;
  }

  var rows = [['Titre','Plateforme','Date','Semaine','Vues','Likes','Comments','Saves','Shares','Visionnage(s)','Engagement %']];
  PUBS.filter(function(p) { return p.done; }).forEach(function(p) {
    if (!p.stats) p.stats = {};
    rows.push([
      '"' + (p.title || '').replace(/"/g, '""') + '"',
      p.plat, p.date, p.sem,
      p.stats.v || 0, p.stats.l || 0, p.stats.c || 0, p.stats.s || 0, p.stats.sh || 0,
      p.stats.wt || 0,
      eng(p)
    ]);
  });
  var csv = rows.map(function(r) { return r.join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'veyra-studio-stats.csv';
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
// When Instagram is connected, the tab is driven by real API data
// (instagram-stats). Otherwise it falls back to the manual PUBS dataset.
async function renderAnalytics() {
  var connected = false;
  try {
    if (typeof sb !== 'undefined' && sb && window._VEYRA_UID) {
      var connRes = await sb.from('social_connections')
        .select('id')
        .eq('user_id', window._VEYRA_UID)
        .eq('platform', 'instagram')
        .eq('status', 'active')
        .maybeSingle();
      connected = !!(connRes && connRes.data);
    }
  } catch (e) { connected = false; }

  var tip = document.querySelector('.ana-tip');

  if (!connected) {
    if (tip) tip.style.display = '';
    _renderAnalyticsManual();
    return;
  }

  // Connected — pull the real dataset
  if (tip) tip.style.display = 'none';
  var kpiEl = document.getElementById('ana-kpis');
  if (kpiEl) kpiEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#9CA3AF;font-size:13px;">Chargement de tes statistiques Instagram…</div>';

  try {
    var res = await sb.functions.invoke('instagram-stats', { body: {} });
    if (res.error || (res.data && res.data.error)) {
      // API failed — fall back to manual so the tab isn't empty
      if (tip) tip.style.display = '';
      _renderAnalyticsManual();
      return;
    }
    window._IG_STATS = res.data;
    _renderAnalyticsReal(res.data);
  } catch (e) {
    console.error('renderAnalytics (real) failed:', e);
    if (tip) tip.style.display = '';
    _renderAnalyticsManual();
  }
}

// ─── Render Analytics Tab — manual PUBS fallback ───
function _renderAnalyticsManual() {
  var posted = PUBS.filter(function(p) { return p.done; });
  var withStats = posted.filter(function(p) { return p.stats && p.stats.v > 0; });

  var tv = withStats.reduce(function(s, p) { return s + (p.stats.v || 0); }, 0);
  var tl = withStats.reduce(function(s, p) { return s + (p.stats.l || 0); }, 0);
  var ts = withStats.reduce(function(s, p) { return s + (p.stats.s || 0); }, 0);
  var tc = withStats.reduce(function(s, p) { return s + (p.stats.c || 0); }, 0);
  var tsh = withStats.reduce(function(s, p) { return s + (p.stats.sh || 0); }, 0);
  var avgWt = withStats.length ? Math.round(withStats.reduce(function(s, p) { return s + (p.stats.wt || 0); }, 0) / withStats.length) : 0;
  var avgE = withStats.length ? (withStats.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / withStats.length).toFixed(1) : 0;

  // Account engagement rate (total interactions / last follower count × 100)
  var igLast = FW.filter(function(f) { return f.ig > 0; });
  var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
  var totalInter = tl + tc + ts + tsh;
  var acctEng = (igC > 0 && posted.length > 0) ? ((totalInter / (igC * posted.length)) * 100).toFixed(2) : null;

  // ─── Video stats ───
  var videoPosts = withStats.filter(function(p) { return p.stats && p.stats.dur > 0 && p.stats.wt > 0; });
  var avgCompletion = videoPosts.length
    ? (videoPosts.reduce(function(s, p) { return s + Math.min(p.stats.wt / p.stats.dur * 100, 100); }, 0) / videoPosts.length).toFixed(1)
    : null;
  var saveRate = tv > 0 ? (ts / tv * 100).toFixed(2) : null;
  var pvRate = tv > 0 ? (withStats.reduce(function(s, p) { return s + (p.stats.pv || 0); }, 0) / tv * 100).toFixed(2) : null;

  // Best format by engagement
  var fmtEngMap = {};
  withStats.forEach(function(p) {
    var f = p.fmt || 'Autre';
    if (!fmtEngMap[f]) fmtEngMap[f] = { total: 0, count: 0 };
    fmtEngMap[f].total += parseFloat(eng(p));
    fmtEngMap[f].count++;
  });
  var bestFmt = null, bestFmtEng = 0;
  Object.keys(fmtEngMap).forEach(function(f) {
    var avg = fmtEngMap[f].total / fmtEngMap[f].count;
    if (avg > bestFmtEng) { bestFmtEng = avg; bestFmt = f; }
  });

  // ─── KPI Cards ───
  var kpis = [
    { l: 'Posts publiés',      v: posted.length,                        s: 'sur ' + PUBS.length + ' planifiés',  c: '#FF2D7A', i: '📸', animate: false },
    { l: 'Vues totales',        v: tv,                                   s: 'tous posts confondus',               c: '#06B6D4', i: '👁',  animate: true },
    { l: 'Engagement moyen',    v: avgE + '%',                           s: 'par post avec stats',                c: '#7C3AED', i: '💜', animate: false },
    { l: 'Engagement compte',   v: acctEng ? acctEng + '%' : '—',       s: 'interactions / (abonnés × posts)',   c: '#059669', i: '📊', animate: false },
    { l: 'Save rate',           v: saveRate ? saveRate + '%' : '—',     s: 'saves / vues · signal algo fort',    c: '#F59E0B', i: '🔖', animate: false },
    { l: 'Complétion vidéo',    v: avgCompletion ? avgCompletion + '%' : '—', s: 'visionnage moy. / durée',      c: '#EF4444', i: '⏱', animate: false },
    { l: 'Visite profil',       v: pvRate ? pvRate + '%' : '—',         s: 'spectateurs qui veulent en savoir +',c: '#8B5CF6', i: '👤', animate: false },
    { l: 'Meilleur format',     v: bestFmt || '—',                       s: bestFmt ? bestFmtEng.toFixed(1) + '% eng. moy.' : 'pas assez de données', c: '#EC4899', i: '🏆', animate: false }
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

  // ─── Platform split ───
  var igPosts = withStats.filter(function(p) { return p.plat === 'insta'; });
  var ttPosts = withStats.filter(function(p) { return p.plat === 'tiktok'; });
  var igV = igPosts.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var ttV = ttPosts.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var igE = igPosts.length ? (igPosts.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / igPosts.length).toFixed(1) : 0;
  var ttE = ttPosts.length ? (ttPosts.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / ttPosts.length).toFixed(1) : 0;
  var ttAvgWt = ttPosts.length ? Math.round(ttPosts.reduce(function(s, p) { return s + (p.stats.wt || 0); }, 0) / ttPosts.length) : 0;

  var platEl = document.getElementById('plat-split');
  if (platEl) {
    platEl.innerHTML =
      '<div class="ps-card">'
      + '<div class="ps-head" style="color:var(--ig)">📸 Instagram</div>'
      + '<div class="ps-stat"><span>' + igPosts.length + ' posts</span></div>'
      + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + igV.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Engagement</span><span class="ps-val" style="color:var(--violet)">' + igE + '%</span></div>'
      + '</div>'
      + '<div class="ps-card">'
      + '<div class="ps-head" style="color:var(--tt)">🎵 TikTok</div>'
      + '<div class="ps-stat"><span>' + ttPosts.length + ' posts</span></div>'
      + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + ttV.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Engagement</span><span class="ps-val" style="color:var(--violet)">' + ttE + '%</span></div>'
      + (ttAvgWt ? '<div class="ps-stat"><span>Visionnage moy.</span><span class="ps-val">' + ttAvgWt + 's</span></div>' : '')
      + '</div>';
  }

  // ─── Top 5 posts — text list ───
  var sorted = withStats.slice().sort(function(a, b) { return b.stats.v - a.stats.v; }).slice(0, 5);
  var bestEl = document.getElementById('best-block');
  if (bestEl) {
    if (sorted.length) {
      bestEl.innerHTML = '<div class="chart-title">🏆 Top 5 posts par vues</div>'
        + sorted.map(function(p, i) {
            var colors = ['var(--rose)','var(--violet)','var(--cyan)','#059669','#F59E0B'];
            return '<div class="best-item">'
              + '<span class="best-rank">#' + (i + 1) + '</span>'
              + '<span class="best-title">' + escapeHtml(p.title.length > 35 ? p.title.slice(0, 35) + '…' : p.title) + '</span>'
              + '<span class="best-val" style="color:' + colors[i] + '">' + (p.stats.v || 0).toLocaleString('fr-FR') + '</span>'
              + '</div>';
          }).join('');
    } else {
      bestEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">Aucune donnée</div>';
    }
  }

  // ─── Top 5 bar chart ───
  if (sorted.length) {
    setTimeout(function() {
      _makeHBarChart('ch-top5',
        sorted.map(function(p) { return p.title.length > 22 ? p.title.slice(0, 22) + '…' : p.title; }),
        sorted.map(function(p) { return p.stats.v; })
      );
    }, 50);
  }

  // ─── Engagement per post bar chart ───
  if (withStats.length) {
    setTimeout(function() {
      _makeBarChart('ch-eng',
        withStats.map(function(p) { return p.date || p.title.slice(0, 10); }),
        withStats.map(function(p) { return parseFloat(eng(p)); }),
        'Engagement %'
      );
    }, 50);
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

  // ─── Goal progress bars ───
  _ANA_IG_COUNT = igC > 0 ? igC : null;
  _ANA_FOLLOWER_SERIES = [];
  _renderGoalBars();

  // ─── Table ───
  var tbl = document.getElementById('ana-tbl');
  if (tbl) {
    tbl.innerHTML = '<table><thead><tr><th>Post</th><th>Plat.</th><th>Date</th><th>Vues</th><th>Likes</th><th>Saves</th><th>Eng.</th></tr></thead><tbody>'
      + posted.map(function(p) {
        if (!p.stats) p.stats = {};
        return '<tr>'
          + '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(p.title) + '</td>'
          + '<td>' + escapeHtml(p.plat) + '</td>'
          + '<td>' + escapeHtml(p.date) + '</td>'
          + '<td>' + (p.stats.v || 0).toLocaleString('fr-FR') + '</td>'
          + '<td>' + (p.stats.l || 0) + '</td>'
          + '<td>' + (p.stats.s || 0) + '</td>'
          + '<td style="color:var(--violet);font-weight:700;">' + eng(p) + '%</td>'
          + '</tr>';
      }).join('')
      + '</tbody></table>';
  }
}

// ═══════════════════════════════════════════════
//  Real Instagram analytics (instagram-stats data)
// ═══════════════════════════════════════════════

// Compact number formatter (1.2K, 3.4M)
function _anaNum(n) {
  if (n == null) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(Math.round(n));
}

// Engagement % of a real post: interactions / reach (falls back to views)
function _anaEng(p) {
  var inter = (p.total_interactions != null)
    ? p.total_interactions
    : ((p.likes || 0) + (p.comments || 0) + (p.saved || 0) + (p.shares || 0));
  var base = p.reach || p.views || 0;
  if (base <= 0) return 0;
  return inter / base * 100;
}

function _anaShortDate(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function _anaCaption(p, len) {
  var cap = (p.caption || '').split('\n')[0].trim();
  if (!cap) cap = 'Sans légende';
  return cap.length > len ? cap.slice(0, len) + '…' : cap;
}

// Updates the title of a .chart-block container.
function _setChartTitle(blockId, title) {
  var block = document.getElementById(blockId);
  if (!block) return;
  var t = block.querySelector('.chart-title');
  if (t) t.textContent = title;
}

function _renderAnalyticsReal(data) {
  var posts = (data.posts || []).slice();
  var account = data.account || {};
  var profile = data.profile || {};

  // Sort posts newest → oldest for the time-based charts
  posts.sort(function (a, b) {
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });
  // Chronological order for charts
  var chrono = posts.slice().reverse();

  var n = posts.length;
  var sum = function (key) {
    return posts.reduce(function (s, p) { return s + (p[key] || 0); }, 0);
  };
  var totalViews = sum('views');
  var totalReach = sum('reach');
  var totalLikes = sum('likes');
  var totalComments = sum('comments');
  var totalSaves = sum('saved');
  var totalShares = sum('shares');
  var totalInter = posts.reduce(function (s, p) {
    return s + ((p.total_interactions != null)
      ? p.total_interactions
      : (p.likes || 0) + (p.comments || 0) + (p.saved || 0) + (p.shares || 0));
  }, 0);
  var avgEng = n ? (posts.reduce(function (s, p) { return s + _anaEng(p); }, 0) / n) : 0;

  // Best post by views
  var bestPost = posts.slice().sort(function (a, b) {
    return (b.views || b.reach || 0) - (a.views || a.reach || 0);
  })[0];
  var saveRate = totalReach > 0 ? (totalSaves / totalReach * 100) : null;

  // ─── KPI cards ───
  var kpis = [
    { l: 'Posts publiés',    v: n,                                       s: '25 derniers posts',                    c: '#FF2D7A', i: '📸' },
    { l: 'Vues totales',     v: _anaNum(totalViews),                     s: 'tous posts confondus',                 c: '#06B6D4', i: '👁' },
    { l: 'Couverture totale',v: _anaNum(totalReach),                     s: 'comptes uniques touchés',              c: '#0891B2', i: '🌍' },
    { l: 'Interactions',     v: _anaNum(totalInter),                     s: 'likes + comm. + saves + partages',     c: '#7C3AED', i: '✨' },
    { l: 'Engagement moyen', v: avgEng.toFixed(1) + '%',                 s: 'interactions / couverture',            c: '#8B5CF6', i: '💜' },
    { l: 'Save rate',        v: saveRate != null ? saveRate.toFixed(2) + '%' : '—', s: 'saves / couverture · signal algo', c: '#F59E0B', i: '🔖' },
    { l: 'Abonnés',          v: profile.followers != null ? _anaNum(profile.followers) : '—', s: 'sur ton compte Instagram', c: '#EC4899', i: '👥' },
    { l: 'Meilleur post',    v: bestPost ? _anaNum(bestPost.views || bestPost.reach) : '—', s: bestPost ? _anaCaption(bestPost, 22) : 'pas de données', c: '#059669', i: '🏆' }
  ];
  var kpiEl = document.getElementById('ana-kpis');
  if (kpiEl) {
    kpiEl.innerHTML = kpis.map(function (k) {
      return '<div class="ana-kpi" style="border-top:3px solid ' + k.c + ';">'
        + '<div class="ak-i">' + k.i + '</div>'
        + '<div class="ak-l">' + k.l + '</div>'
        + '<div class="ak-v" style="color:' + k.c + '">' + k.v + '</div>'
        + '<div class="ak-sub">' + escapeHtml(String(k.s)) + '</div>'
        + '</div>';
    }).join('');
  }

  // ─── Period comparison + best time to post ───
  _renderTrendsAndTiming(posts);

  // ─── Platform split — Instagram only (real data) ───
  var platEl = document.getElementById('plat-split');
  if (platEl) {
    platEl.innerHTML =
      '<div class="ps-card">'
      + '<div class="ps-head" style="color:var(--ig)">📸 Instagram · données réelles</div>'
      + '<div class="ps-stat"><span>' + n + ' posts publiés</span></div>'
      + '<div class="ps-stat"><span>Vues</span><span class="ps-val">' + totalViews.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Couverture</span><span class="ps-val">' + totalReach.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Engagement moyen</span><span class="ps-val" style="color:var(--violet)">' + avgEng.toFixed(1) + '%</span></div>'
      + '</div>'
      + '<div class="ps-card">'
      + '<div class="ps-head" style="color:var(--violet)">💬 Détail interactions</div>'
      + '<div class="ps-stat"><span>J\'aime</span><span class="ps-val">' + totalLikes.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Commentaires</span><span class="ps-val">' + totalComments.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Enregistrements</span><span class="ps-val">' + totalSaves.toLocaleString('fr-FR') + '</span></div>'
      + '<div class="ps-stat"><span>Partages</span><span class="ps-val">' + totalShares.toLocaleString('fr-FR') + '</span></div>'
      + '</div>';
  }

  // ─── Top 5 posts by views ───
  var top5 = posts.slice().sort(function (a, b) {
    return (b.views || b.reach || 0) - (a.views || a.reach || 0);
  }).slice(0, 5);
  var bestEl = document.getElementById('best-block');
  if (bestEl) {
    if (top5.length) {
      var topColors = ['var(--rose)', 'var(--violet)', 'var(--cyan)', '#059669', '#F59E0B'];
      bestEl.innerHTML = '<div class="chart-title">🏆 Top 5 posts par vues</div>'
        + top5.map(function (p, i) {
            return '<div class="best-item">'
              + '<span class="best-rank">#' + (i + 1) + '</span>'
              + '<span class="best-title">' + escapeHtml(_anaCaption(p, 38)) + '</span>'
              + '<span class="best-val" style="color:' + topColors[i] + '">' + _anaNum(p.views || p.reach) + '</span>'
              + '</div>';
          }).join('');
    } else {
      bestEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">Aucune donnée</div>';
    }
  }

  // ─── Week progress → repurposed as "posts récents" summary ───
  var semEl = document.getElementById('sem-progs');
  if (semEl) {
    semEl.innerHTML = posts.slice(0, 8).map(function (p) {
      var e = _anaEng(p);
      var pct = Math.min(Math.round(e * 4), 100); // visual scale
      return '<div class="sem-prog-row"><div class="sem-prog-lbl">' + escapeHtml(_anaCaption(p, 24)) + '</div>'
        + '<div class="sem-prog-bar"><div class="sem-prog-fill" style="width:' + pct + '%;background:var(--violet)"></div></div>'
        + '<div class="sem-prog-val">' + e.toFixed(1) + '%</div></div>';
    }).join('');
  }
  var semHdr = semEl && semEl.parentElement
    ? semEl.parentElement.querySelector('div') : null;
  if (semHdr) semHdr.textContent = 'Engagement des posts récents';

  // ─── Views per post (bar) ───
  _setChartTitle('ch-views', 'Vues par post');
  setTimeout(function () {
    _makeBarChart('ch-views',
      chrono.map(function (p) { return _anaShortDate(p.timestamp); }),
      chrono.map(function (p) { return p.views || p.reach || 0; }),
      'Vues'
    );
  }, 50);

  // ─── Likes / Comments / Saves per post (multi-line) ───
  _setChartTitle('ch-metrics', 'J\'aime · Commentaires · Enregistrements par post');
  setTimeout(function () {
    _makeLineChart('ch-metrics',
      chrono.map(function (p) { return _anaShortDate(p.timestamp); }),
      [
        { data: chrono.map(function (p) { return p.likes || 0; }),    color: '#FF2D7A', label: 'J\'aime' },
        { data: chrono.map(function (p) { return p.saved || 0; }),    color: '#7C3AED', label: 'Enregistrements' },
        { data: chrono.map(function (p) { return p.comments || 0; }), color: '#06B6D4', label: 'Commentaires' }
      ]
    );
  }, 50);

  // ─── Top 5 bar chart ───
  _setChartTitle('ch-top5', 'Top 5 posts');
  if (top5.length) {
    setTimeout(function () {
      _makeHBarChart('ch-top5',
        top5.map(function (p) { return _anaCaption(p, 22); }),
        top5.map(function (p) { return p.views || p.reach || 0; })
      );
    }, 50);
  }

  // ─── Engagement per post (bar) ───
  _setChartTitle('ch-eng', 'Engagement par post');
  setTimeout(function () {
    _makeBarChart('ch-eng',
      chrono.map(function (p) { return _anaShortDate(p.timestamp); }),
      chrono.map(function (p) { return parseFloat(_anaEng(p).toFixed(1)); }),
      'Engagement %'
    );
  }, 50);

  // ─── Followers KPI ───
  var fwKpis = document.getElementById('fw-ana-kpis');
  if (fwKpis) {
    var followNow = profile.followers;
    var followSeries = account.followers || [];
    var grew = null;
    if (followSeries.length >= 2) {
      grew = (followSeries[followSeries.length - 1].value || 0) - (followSeries[0].value || 0);
    }
    fwKpis.innerHTML =
      '<div class="ana-kpi" style="border-top:3px solid var(--ig);">'
      + '<div class="ak-i">👥</div><div class="ak-l">Abonnés Instagram</div>'
      + '<div class="ak-v" style="color:var(--ig)">' + (followNow != null ? followNow.toLocaleString('fr-FR') : '—') + '</div>'
      + '<div class="ak-sub">compte connecté</div>'
      + '</div>'
      + '<div class="ana-kpi" style="border-top:3px solid var(--violet);">'
      + '<div class="ak-i">📈</div><div class="ak-l">Évolution 30 j</div>'
      + '<div class="ak-v" style="color:var(--violet)">' + (grew != null ? (grew >= 0 ? '+' : '') + grew.toLocaleString('fr-FR') : '—') + '</div>'
      + '<div class="ak-sub">' + (grew != null ? 'sur les 30 derniers jours' : 'données indisponibles') + '</div>'
      + '</div>';
  }

  // ─── Goal progress (moved here from the old Abonnés tab) ───
  _ANA_IG_COUNT = (profile.followers != null) ? profile.followers : null;
  _ANA_FOLLOWER_SERIES = account.followers || [];
  _renderGoalBars();


  // ─── Follower growth chart (real account series) ───
  var fSeries = account.followers || [];
  _setChartTitle('ch-followers', 'Croissance des abonnés · 30 jours');
  if (fSeries.length) {
    setTimeout(function () {
      _makeLineChart('ch-followers',
        fSeries.map(function (v) { return _anaShortDate(v.date); }),
        [{ data: fSeries.map(function (v) { return v.value || 0; }), color: '#C13584', label: 'Abonnés' }]
      );
    }, 50);
  } else {
    var fEl = document.getElementById('ch-followers');
    if (fEl) {
      var old = fEl.querySelector('.chart-cvs-wrap');
      if (old) old.remove();
      var msg = document.createElement('div');
      msg.className = 'chart-cvs-wrap';
      msg.style.cssText = 'text-align:center;padding:24px;color:var(--muted);font-size:12px;';
      msg.textContent = 'Instagram ne fournit pas encore l\'historique d\'abonnés pour ce compte.';
      fEl.appendChild(msg);
    }
  }

  // ─── Heatmap from real post timestamps ───
  _renderRealHeatmap(posts);

  // ─── Table — all real posts ───
  var tbl = document.getElementById('ana-tbl');
  if (tbl) {
    tbl.innerHTML = '<table><thead><tr><th>Post</th><th>Date</th><th>Vues</th><th>Couv.</th><th>J\'aime</th><th>Comm.</th><th>Saves</th><th>Eng.</th></tr></thead><tbody>'
      + posts.map(function (p) {
          return '<tr>'
            + '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(_anaCaption(p, 40)) + '</td>'
            + '<td>' + _anaShortDate(p.timestamp) + '</td>'
            + '<td>' + (p.views != null ? p.views.toLocaleString('fr-FR') : '—') + '</td>'
            + '<td>' + (p.reach != null ? p.reach.toLocaleString('fr-FR') : '—') + '</td>'
            + '<td>' + (p.likes || 0) + '</td>'
            + '<td>' + (p.comments || 0) + '</td>'
            + '<td>' + (p.saved != null ? p.saved : '—') + '</td>'
            + '<td style="color:var(--violet);font-weight:700;">' + _anaEng(p).toFixed(1) + '%</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>';
  }
}

// Heatmap of real post publication dates
// Splits posts in two halves chronologically and compares averages.
function _periodCompare(posts) {
  if (!posts || posts.length < 4) return null;
  var sorted = posts.slice().sort(function(a, b) {
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });
  var half = Math.floor(sorted.length / 2);
  var recent = sorted.slice(0, half);
  var prior  = sorted.slice(half, half * 2);
  function avg(arr, fn) {
    if (!arr.length) return 0;
    return arr.reduce(function(s, p){ return s + (fn(p) || 0); }, 0) / arr.length;
  }
  function pct(now, prev) { return prev > 0 ? ((now - prev) / prev * 100) : null; }
  var vNow = avg(recent, function(p){ return p.views || p.reach || 0; });
  var vPrev = avg(prior,  function(p){ return p.views || p.reach || 0; });
  var eNow = avg(recent, _anaEng);
  var ePrev = avg(prior,  _anaEng);
  return {
    halfCount: half,
    viewsAvgNow: vNow, viewsAvgPrev: vPrev, viewsPct: pct(vNow, vPrev),
    engAvgNow: eNow,   engAvgPrev: ePrev,   engPct: pct(eNow, ePrev)
  };
}

// Computes the 3 hours-of-day with the highest average engagement.
function _bestHours(posts) {
  var buckets = {};
  posts.forEach(function(p) {
    if (!p.timestamp) return;
    var hr = new Date(p.timestamp).getHours();
    if (isNaN(hr)) return;
    if (!buckets[hr]) buckets[hr] = { sum: 0, count: 0 };
    buckets[hr].sum += _anaEng(p);
    buckets[hr].count++;
  });
  return Object.keys(buckets)
    .map(function(h) {
      return { hour: +h, avg: buckets[h].sum / buckets[h].count, count: buckets[h].count };
    })
    .sort(function(a, b) { return b.avg - a.avg; })
    .slice(0, 3);
}

function _renderTrendsAndTiming(posts) {
  var host = document.getElementById('ana-trends-timing');
  if (!host) return;

  var cmp = _periodCompare(posts);
  var best = _bestHours(posts);

  function deltaBadge(pct) {
    if (pct == null) return '<span class="trend-pill trend-neutral">—</span>';
    var cls = pct >= 0 ? 'trend-up' : 'trend-down';
    var sign = pct >= 0 ? '+' : '';
    return '<span class="trend-pill ' + cls + '">' + sign + pct.toFixed(0) + '%</span>';
  }

  var trendHtml = '';
  if (cmp) {
    trendHtml = '<div class="chart-block trends-block">'
      + '<div class="chart-title">📈 Tendance · ' + cmp.halfCount + ' derniers posts vs précédents</div>'
      + '<div class="trends-grid">'
      +   '<div class="trend-row">'
      +     '<div class="trend-label">Vues moyennes par post</div>'
      +     '<div class="trend-value">' + _anaNum(Math.round(cmp.viewsAvgNow)) + '</div>'
      +     deltaBadge(cmp.viewsPct)
      +   '</div>'
      +   '<div class="trend-row">'
      +     '<div class="trend-label">Engagement moyen</div>'
      +     '<div class="trend-value">' + cmp.engAvgNow.toFixed(1) + '%</div>'
      +     deltaBadge(cmp.engPct)
      +   '</div>'
      + '</div>'
      + '</div>';
  }

  var timeHtml = '';
  if (best.length) {
    timeHtml = '<div class="chart-block timing-block">'
      + '<div class="chart-title">⏰ Meilleurs créneaux pour publier <span style="font-weight:400;color:#9CA3AF;">· calculés sur tes posts</span></div>'
      + '<div class="timing-row">'
      + best.map(function(h, i) {
          var medals = ['🥇','🥈','🥉'];
          return '<div class="timing-card">'
            + '<div class="timing-medal">' + medals[i] + '</div>'
            + '<div class="timing-hour">' + (h.hour < 10 ? '0' + h.hour : h.hour) + 'h</div>'
            + '<div class="timing-sub">' + h.avg.toFixed(1) + '% eng. · ' + h.count + ' post' + (h.count > 1 ? 's' : '') + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
      + '</div>';
  }

  host.innerHTML = trendHtml + timeHtml;
}

function _renderRealHeatmap(posts) {
  var el = document.getElementById('heatmap-grid');
  if (!el) return;
  var counts = {};
  posts.forEach(function (p) {
    if (!p.timestamp) return;
    var d = new Date(p.timestamp);
    if (isNaN(d.getTime())) return;
    var key = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
    counts[key] = (counts[key] || 0) + 1;
  });
  var vals = Object.keys(counts).map(function (k) { return counts[k]; });
  var max = vals.length ? Math.max.apply(null, vals) : 1;
  // Last ~22 weeks ending today
  var end = new Date();
  var start = new Date(end.getTime() - 154 * 86400000);
  var html = '<div class="hm-grid">';
  for (var i = 0; i < 154; i++) {
    var d = new Date(start.getTime() + i * 86400000);
    var key = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
    var c = counts[key] || 0;
    var alpha = c ? (0.25 + (c / max) * 0.75).toFixed(2) : 0;
    var bg = c ? 'background:linear-gradient(135deg,rgba(255,45,122,' + alpha + '),rgba(124,58,237,' + alpha + '))' : 'background:#F3F4F6';
    html += '<div class="hm-cell" title="' + key + (c ? ' — ' + c + ' post(s)' : '') + '" style="' + bg + '"></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  Follower goal bars (moved from the old Abonnés tab)
// ═══════════════════════════════════════════════

var _ANA_IG_COUNT = null;
var _ANA_FOLLOWER_SERIES = [];

// Projects the goal-reach date from the real 30-day follower series.
function _anaProjectGoal(series, goal, current) {
  if (current != null && current >= goal) return '🎉 Objectif atteint !';
  if (!series || series.length < 2 || current == null) return null;
  var first = series[0].value || 0;
  var last = series[series.length - 1].value || 0;
  var perDay = (last - first) / (series.length - 1);
  if (perDay <= 0) return null;
  var days = Math.ceil((goal - current) / perDay);
  var d = new Date();
  d.setDate(d.getDate() + days);
  var mo = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return '~' + Math.round(days / 7) + ' sem. → ' + d.getDate() + ' ' + mo[d.getMonth()] + ' ' + d.getFullYear();
}

function _renderGoalBars() {
  var el = document.getElementById('ana-goal-prog');
  if (!el) return;
  var igGoal = (typeof GOALS !== 'undefined' && GOALS.ig) || 0;
  var ttGoal = (typeof GOALS !== 'undefined' && GOALS.tt) || 0;
  var igCount = _ANA_IG_COUNT;

  var igHtml;
  if (igCount != null && igGoal > 0) {
    var igPct = Math.min(100, Math.round(igCount / igGoal * 100));
    var proj = _anaProjectGoal(_ANA_FOLLOWER_SERIES, igGoal, igCount);
    var alert = igPct >= 90 ? '<span class="goal-alert">🎉 Presque !</span>' : '';
    igHtml = '<div class="fw-prog-item">'
      + '<div class="fw-prog-label">Instagram — Objectif <span id="ig-goal-display">' + igGoal.toLocaleString('fr-FR') + '</span>'
      + ' <button class="goal-edit-btn" onclick="editGoal(\'ig\')" title="Modifier l\'objectif">✏️</button>' + alert + '</div>'
      + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:' + igPct + '%;background:var(--ig)"></div></div>'
      + '<div class="fw-prog-text"><strong>' + igCount.toLocaleString('fr-FR') + '</strong> / ' + igGoal.toLocaleString('fr-FR') + ' abonnés (' + igPct + '%)'
      + (proj ? '<span class="fw-proj"> — ' + proj + '</span>' : '') + '</div>'
      + '</div>';
  } else {
    igHtml = '<div class="fw-prog-item">'
      + '<div class="fw-prog-label">Instagram — Objectif <span id="ig-goal-display">' + igGoal.toLocaleString('fr-FR') + '</span>'
      + ' <button class="goal-edit-btn" onclick="editGoal(\'ig\')" title="Modifier l\'objectif">✏️</button></div>'
      + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:0%;background:var(--ig)"></div></div>'
      + '<div class="fw-prog-text">Connecte ton compte Instagram pour suivre ta progression.</div>'
      + '</div>';
  }

  var ttHtml = '<div class="fw-prog-item">'
    + '<div class="fw-prog-label">TikTok — Objectif <span id="tt-goal-display">' + ttGoal.toLocaleString('fr-FR') + '</span>'
    + ' <button class="goal-edit-btn" onclick="editGoal(\'tt\')" title="Modifier l\'objectif">✏️</button></div>'
    + '<div class="fw-prog-bar"><div class="fw-prog-fill" style="width:0%;background:var(--tt)"></div></div>'
    + '<div class="fw-prog-text">L\'intégration TikTok arrive bientôt.</div>'
    + '</div>';

  el.innerHTML = igHtml + ttHtml;
}

function editGoal(plat) {
  var span = document.getElementById(plat + '-goal-display');
  if (!span) return;
  span.innerHTML = '<input type="number" id="goal-inp-' + plat + '" value="' + GOALS[plat]
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
    if (sb && window._VEYRA_UID && window._USER_PROFILE) {
      var col = plat === 'ig' ? 'ig_goal' : 'tt_goal';
      window._USER_PROFILE[col] = val;
      var patch = {};
      patch[col] = val;
      sb.from('profiles').update(patch).eq('id', window._VEYRA_UID).then(function(){}, function(){});
    }
    if (typeof applyProfileToUI === 'function') applyProfileToUI();
  }
  _renderGoalBars();
}
