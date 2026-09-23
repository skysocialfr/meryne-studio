// ═══ Stats : abonnés, régularité, ce qui marche ═══
import { S, logFollowers, latestFollowers } from '../store.js';
import { icon, esc, nf, toast, PLATFORMS, startOfDay } from '../ui.js';
import { postItem, bindPostItems } from './common.js';

const st = { pf: 'all', days: 30 };
const SERIES = { instagram: 'var(--series-ig)', tiktok: 'var(--series-tt)' };

export function renderStats(el) {
  const pfs = st.pf === 'all' ? ['instagram', 'tiktok'] : [st.pf];
  const since = st.days ? Date.now() - st.days * 86_400_000 : 0;
  const prevSince = st.days ? since - st.days * 86_400_000 : 0;
  const pub = S.posts.filter((p) => p.status === 'published' && pfs.includes(p.platform) && p.published_at);
  const inPeriod = pub.filter((p) => new Date(p.published_at) >= since);
  const prevPeriod = st.days ? pub.filter((p) => { const t = new Date(p.published_at); return t >= prevSince && t < since; }) : [];
  const withViews = inPeriod.filter((p) => p.stats?.views);
  const avgViews = withViews.length ? withViews.reduce((s, p) => s + p.stats.views, 0) / withViews.length : null;
  const eng = withViews.length ? withViews.reduce((s, p) => s + ((p.stats.likes || 0) + (p.stats.comments || 0) + (p.stats.shares || 0) + (p.stats.saves || 0)) / p.stats.views, 0) / withViews.length : null;
  const followersNow = pfs.map(latestFollowers).filter((x) => x != null);
  const totalF = followersNow.length ? followersNow.reduce((a, b) => a + b, 0) : null;
  const fDelta = followerDelta(pfs, since);
  const top = [...inPeriod].filter((p) => p.stats?.views).sort((a, b) => b.stats.views - a.stats.views).slice(0, 5);
  const missing = pub.filter((p) => !p.stats?.views).slice(0, 6);

  el.innerHTML = `
    <header class="topbar"><h1><small>Ce qui marche, en un coup d’œil</small>Stats</h1></header>
    <div class="view">
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Réseau">
          ${[['all', 'Tous'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']].map(([k, l]) => `<button data-pf="${k}" aria-pressed="${st.pf === k}">${l}</button>`).join('')}
        </div>
        <div class="seg" role="group" aria-label="Période">
          ${[[7, '7 j'], [30, '30 j'], [90, '90 j'], [0, 'Tout']].map(([k, l]) => `<button data-days="${k}" aria-pressed="${st.days === k}">${l}</button>`).join('')}
        </div>
      </div>

      <div class="kpis">
        ${kpi('Abonnés', nf(totalF), fDelta != null ? delta(fDelta, st.days ? `sur ${st.days} j` : 'au total') : '<span class="d">Note-les ci-dessous</span>')}
        ${kpi('Posts publiés', inPeriod.length, st.days ? delta(inPeriod.length - prevPeriod.length, 'vs période d’avant') : '')}
        ${kpi('Vues moyennes', nf(avgViews && Math.round(avgViews)), `<span class="d">${withViews.length} post${withViews.length > 1 ? 's' : ''} avec vues</span>`)}
        ${kpi('Engagement', eng != null ? (eng * 100).toFixed(1).replace('.', ',') + ' %' : '—', '<span class="d">interactions / vues</span>')}
      </div>

      <form class="card row wrap section" data-f style="gap:10px">
        <strong class="grow" style="min-width:160px">Noter mes abonnés du jour</strong>
        ${st.pf === 'all' ? `<select class="input" name="pf" style="width:auto">${Object.entries(PLATFORMS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>` : `<input type="hidden" name="pf" value="${st.pf}">`}
        <input class="input" name="n" inputmode="numeric" placeholder="Ex. 12 450" style="width:140px" aria-label="Nombre d’abonnés" required>
        <button class="btn btn-primary">Noter</button>
      </form>

      <div class="charts2 section">
        <section class="card">
          <div class="section-h"><h2>Abonnés</h2></div>
          ${pfs.length > 1 ? legend(pfs) : ''}
          <div class="chart" id="ch-f">${followersChart(pfs, since)}</div>
          ${followersTable(pfs)}
        </section>
        <section class="card">
          <div class="section-h"><h2>Régularité</h2><span class="count">posts / semaine</span></div>
          ${pfs.length > 1 ? legend(pfs) : ''}
          <div class="chart" id="ch-w">${weeksChart(pfs)}</div>
        </section>
      </div>

      <section class="section"><div class="section-h"><h2>Top posts</h2><span class="count">par vues</span></div>
        ${top.length ? `<div class="plist">${top.map(postItem).join('')}</div>` : `<div class="empty"><p>Ajoute les vues de tes posts publiés pour voir ceux qui marchent le mieux.</p></div>`}</section>

      ${missing.length ? `<section class="section"><div class="section-h"><h2>Vues à compléter</h2><span class="count">${missing.length}</span></div>
        <p class="small muted" style="margin:-4px 0 10px">Touche un post pour noter ses vues, j’aime, partages…</p>
        <div class="plist">${missing.map(postItem).join('')}</div></section>` : ''}
    </div>`;

  el.querySelectorAll('[data-pf]').forEach((b) => b.addEventListener('click', () => { st.pf = b.dataset.pf; renderStats(el); }));
  el.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { st.days = +b.dataset.days; renderStats(el); }));
  el.querySelector('[data-f]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = parseInt(e.target.n.value.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n)) return;
    try { await logFollowers(e.target.pf.value, n); toast('Abonnés notés'); } catch (err) { toast(err.message, 'alert'); }
  });
  bindPostItems(el);
  bindChartHover(el.querySelector('#ch-f'));
  bindChartHover(el.querySelector('#ch-w'));
}

const kpi = (l, v, d) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div>${d}</div>`;
const delta = (n, ctx) => `<span class="d ${n > 0 ? 'up' : n < 0 ? 'down' : ''}">${n > 0 ? '▲ +' : n < 0 ? '▼ ' : ''}${nf(n)} ${ctx}</span>`;
const legend = (pfs) => `<div class="legend">${pfs.map((p) => `<span><i style="background:${SERIES[p]}"></i>${PLATFORMS[p].label}</span>`).join('')}</div>`;

function followerDelta(pfs, since) {
  let total = 0, any = false;
  for (const pf of pfs) {
    const rows = S.followers.filter((f) => f.platform === pf);
    if (rows.length < 2) continue;
    const last = rows[rows.length - 1];
    const base = [...rows].reverse().find((r) => new Date(r.day) <= since) || rows[0];
    if (base === last) continue;
    total += last.count - base.count; any = true;
  }
  return any ? total : null;
}

// ─── Graphiques SVG (un seul axe, traits fins, survol) ───
const W = 360, H = 200, PAD = { l: 40, r: 10, t: 12, b: 26 };

function niceTicks(min, max, count = 4) {
  if (min === max) { min = min * 0.9; max = max * 1.1 || 1; }
  const step0 = (max - min) / count, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = []; for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
const axisY = (ticks, y) => ticks.map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/>
  <text x="${PAD.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${nf(t)}</text>`).join('');
const dm = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');

function followersChart(pfs, since) {
  const series = pfs.map((pf) => ({ pf, pts: S.followers.filter((f) => f.platform === pf && (!st.days || new Date(f.day) >= since - 86_400_000 * 0)).map((f) => ({ t: new Date(f.day).getTime(), v: f.count })) }))
    .filter((s) => s.pts.length);
  if (!series.some((s) => s.pts.length >= 2)) return `<div class="empty" style="margin-top:8px"><p>Note tes abonnés au moins deux jours différents pour voir la courbe.</p></div>`;
  const all = series.flatMap((s) => s.pts);
  const t0 = Math.min(...all.map((p) => p.t)), t1 = Math.max(...all.map((p) => p.t));
  const ticks = niceTicks(Math.min(...all.map((p) => p.v)), Math.max(...all.map((p) => p.v)));
  const x = (t) => PAD.l + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - ((v - ticks[0]) / (ticks.at(-1) - ticks[0] || 1)) * (H - PAD.t - PAD.b);
  const days = [...new Set(all.map((p) => p.t))].sort((a, b) => a - b);
  const hover = days.map((t) => ({ x: x(t), label: `<b>${dm(t)}</b>` + series.map((s) => { const p = s.pts.find((q) => q.t === t); return p ? `<br>${PLATFORMS[s.pf].label} : ${nf(p.v)}` : ''; }).join(''),
    dots: series.map((s) => { const p = s.pts.find((q) => q.t === t); return p ? { y: y(p.v), c: SERIES[s.pf] } : null; }).filter(Boolean) }));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des abonnés">
    ${axisY(ticks, y)}
    <text x="${PAD.l}" y="${H - 8}" font-size="11" fill="var(--ink-3)">${dm(t0)}</text>
    <text x="${W - PAD.r}" y="${H - 8}" font-size="11" fill="var(--ink-3)" text-anchor="end">${dm(t1)}</text>
    ${series.map((s) => `<polyline fill="none" stroke="${SERIES[s.pf]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${s.pts.map((p) => `${x(p.t)},${y(p.v)}`).join(' ')}"/>
      <circle cx="${x(s.pts.at(-1).t)}" cy="${y(s.pts.at(-1).v)}" r="4" fill="${SERIES[s.pf]}" stroke="var(--surface)" stroke-width="2"/>`).join('')}
    <g class="hl" style="display:none"><line y1="${PAD.t}" y2="${H - PAD.b}" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="3 3"/></g>
    <rect class="hit" x="${PAD.l}" y="0" width="${W - PAD.l - PAD.r}" height="${H}" fill="transparent"/>
  </svg><script type="application/json">${JSON.stringify(hover).replace(/</g, '\\u003c')}</script>`;
}

function followersTable(pfs) {
  const rows = S.followers.filter((f) => pfs.includes(f.platform)).slice(-10).reverse();
  if (!rows.length) return '';
  return `<details style="margin-top:10px"><summary class="small faint" style="cursor:pointer">Voir les données</summary>
    <table class="table" style="margin-top:6px"><thead><tr><th>Date</th><th>Réseau</th><th style="text-align:right">Abonnés</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${dm(r.day)}</td><td>${PLATFORMS[r.platform].label}</td><td style="text-align:right">${nf(r.count)}</td></tr>`).join('')}</tbody></table></details>`;
}

function weeksChart(pfs) {
  const N = 8;
  const monday = startOfDay(new Date()); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = Array.from({ length: N }, (_, i) => { const s = new Date(monday); s.setDate(s.getDate() - (N - 1 - i) * 7); return s; });
  const data = weeks.map((s) => {
    const e = s.getTime() + 7 * 86_400_000;
    return { s, v: pfs.map((pf) => S.posts.filter((p) => p.platform === pf && p.status === 'published' && p.published_at && new Date(p.published_at) >= s && new Date(p.published_at) < e).length) };
  });
  const maxV = Math.max(1, ...data.map((d) => d.v.reduce((a, b) => a + b, 0)));
  const ticks = niceTicks(0, maxV, Math.min(4, maxV)).filter((t) => Number.isInteger(t));
  const y = (v) => H - PAD.b - (v / ticks.at(-1)) * (H - PAD.t - PAD.b);
  const bw = (W - PAD.l - PAD.r) / N, barW = Math.min(24, bw * 0.6);
  const hover = [];
  const bars = data.map((d, i) => {
    const cx = PAD.l + bw * i + bw / 2;
    let acc = 0;
    const segs = d.v.map((v, k) => {
      if (!v) return '';
      const y0 = y(acc), y1 = y(acc + v); acc += v;
      const top = acc === d.v.reduce((a, b) => a + b, 0);
      const h = Math.max(0, y0 - y1 - (k > 0 ? 2 : 0));
      return top
        ? `<path d="M${cx - barW / 2},${y0 - (k > 0 ? 2 : 0)} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z" fill="${SERIES[pfs[k]]}"/>`
        : `<rect x="${cx - barW / 2}" y="${y1}" width="${barW}" height="${h}" fill="${SERIES[pfs[k]]}"/>`;
    }).join('');
    hover.push({ x: cx, label: `<b>Semaine du ${dm(d.s)}</b>` + pfs.map((pf, k) => `<br>${PLATFORMS[pf].label} : ${d.v[k]}`).join(''), dots: [] });
    return segs + `<text x="${cx}" y="${H - 8}" font-size="11" fill="var(--ink-3)" text-anchor="middle">${i === N - 1 ? 'cette sem.' : i % 2 === 1 ? dm(d.s) : ''}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Posts publiés par semaine">
    ${axisY(ticks, y)}${bars}
    <g class="hl" style="display:none"><line y1="${PAD.t}" y2="${H - PAD.b}" stroke="transparent"/></g>
    <rect class="hit" x="${PAD.l}" y="0" width="${W - PAD.l - PAD.r}" height="${H}" fill="transparent"/>
  </svg><script type="application/json">${JSON.stringify(hover).replace(/</g, '\\u003c')}</script>`;
}

function bindChartHover(box) {
  const svg = box?.querySelector('svg'); const json = box?.querySelector('script[type="application/json"]');
  if (!svg || !json) return;
  const pts = JSON.parse(json.textContent);
  const hl = svg.querySelector('.hl'), line = hl.querySelector('line');
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; box.appendChild(tip);
  const dotsG = document.createElementNS('http://www.w3.org/2000/svg', 'g'); svg.appendChild(dotsG);
  const move = (e) => {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const p = pts.reduce((a, b) => (Math.abs(b.x - sx) < Math.abs(a.x - sx) ? b : a));
    hl.style.display = ''; line.setAttribute('x1', p.x); line.setAttribute('x2', p.x);
    dotsG.innerHTML = p.dots.map((d) => `<circle cx="${p.x}" cy="${d.y}" r="5" fill="${d.c}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    tip.innerHTML = p.label; tip.hidden = false;
    const top = p.dots.length ? Math.min(...p.dots.map((d) => d.y)) : PAD.t + 20;
    tip.style.left = `${Math.min(Math.max((p.x / W) * r.width, 70), r.width - 70)}px`;
    tip.style.top = `${(top / H) * r.height}px`;
  };
  const leave = () => { hl.style.display = 'none'; dotsG.innerHTML = ''; tip.hidden = true; };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', leave);
}
