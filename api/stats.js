import { timingSafeEqual } from 'node:crypto';
import { redis } from './_redis.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function authorized(given) {
  const secret = process.env.STATS_KEY;
  if (!secret || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseUA(ua = '') {
  const bot = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i.test(ua);
  const browser =
    /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' :
    /Firefox\/|FxiOS/.test(ua) ? 'Firefox' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' :
    /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const device = bot ? 'Bot' : /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, os, device };
}

const fmtDur = (s) => (s == null ? '' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

function topList(visits, fn, n = 8) {
  const counts = {};
  for (const v of visits) { const k = fn(v) || 'Unknown'; counts[k] = (counts[k] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k, c]) => `<li><span>${esc(k)}</span><b>${c}</b></li>`).join('');
}

export async function GET(request) {
  const url = new URL(request.url);
  if (!authorized(url.searchParams.get('key'))) return new Response('Not found', { status: 404 });

  const limit = Math.min(Number(url.searchParams.get('n')) || 500, 10000);
  const [ids] = await redis(['LRANGE', 'visits', 0, limit - 1]);
  let visits = [];
  if (ids?.length) {
    const [raws] = await redis(['MGET', ...ids.map((id) => `visit:${id}`)]);
    visits = raws.filter(Boolean).map((r) => ({ ...JSON.parse(r), ...parseUA(JSON.parse(r).ua) }));
  }

  if (url.searchParams.get('format') === 'json') {
    return Response.json(visits, { headers: { 'Cache-Control': 'no-store' } });
  }

  const humans = visits.filter((v) => v.device !== 'Bot');
  const uniqueIps = new Set(humans.map((v) => v.ip)).size;
  const loc = (v) => [v.city, v.region, v.country].filter(Boolean).join(', ');
  const ref = (v) => { try { return v.referrer ? new URL(v.referrer).hostname : 'Direct'; } catch { return v.referrer; } };

  const rows = visits.map((v) => `<tr${v.device === 'Bot' ? ' class="bot"' : ''}>
    <td title="${esc(v.time)}">${esc(new Date(v.time).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'short', timeStyle: 'short' }))}</td>
    <td><a href="https://ipinfo.io/${esc(v.ip)}" target="_blank" rel="noreferrer">${esc(v.ip)}</a></td>
    <td>${v.lat ? `<a href="https://www.google.com/maps?q=${esc(v.lat)},${esc(v.lon)}" target="_blank" rel="noreferrer">${esc(loc(v))}</a>` : esc(loc(v))}</td>
    <td>${esc(v.device)} · ${esc(v.os)} · ${esc(v.browser)}</td>
    <td>${esc(v.screen)}${v.dpr ? ` @${esc(v.dpr)}x` : ''}</td>
    <td>${esc(v.page)}</td>
    <td title="${esc(v.referrer)}">${esc(ref(v))}</td>
    <td>${esc(v.lang)}<br><small>${esc(v.tz)}</small></td>
    <td>${fmtDur(v.duration)}</td>
    <td class="ua">${esc(v.ua)}</td>
  </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Visits</title>
<style>
  body{font:14px/1.4 -apple-system,system-ui,sans-serif;margin:24px;background:#0f1115;color:#e6e6e6}
  a{color:#7cb7ff}h1{margin:0 0 4px}.muted{color:#888}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:20px 0}
  .card{background:#181b22;border-radius:10px;padding:12px 14px}.card h3{margin:0 0 8px;font-size:13px;color:#aaa;text-transform:uppercase}
  .big{font-size:28px;font-weight:700}ul{list-style:none;margin:0;padding:0}li{display:flex;justify-content:space-between;gap:8px}
  .wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #262a33;vertical-align:top;white-space:nowrap}
  th{position:sticky;top:0;background:#0f1115}.ua{white-space:normal;min-width:300px;color:#888;font-size:11px}
  tr.bot{opacity:.4}label{user-select:none}
</style></head><body>
<h1>Visits</h1>
<div class="muted">Showing latest ${visits.length} · <a href="?key=${esc(url.searchParams.get('key'))}&format=json&n=${limit}">JSON</a> ·
<label><input type="checkbox" id="hidebots"> hide bots</label> ·
<label><input type="checkbox" id="nolog"> don't log my visits on this browser</label></div>
<div class="cards">
  <div class="card"><h3>Visits (humans)</h3><div class="big">${humans.length}</div><div class="muted">${uniqueIps} unique IPs</div></div>
  <div class="card"><h3>Countries</h3><ul>${topList(humans, (v) => v.country)}</ul></div>
  <div class="card"><h3>Cities</h3><ul>${topList(humans, loc)}</ul></div>
  <div class="card"><h3>Referrers</h3><ul>${topList(humans, ref)}</ul></div>
  <div class="card"><h3>Devices</h3><ul>${topList(humans, (v) => `${v.device} · ${v.os}`)}</ul></div>
  <div class="card"><h3>Pages</h3><ul>${topList(humans, (v) => v.page)}</ul></div>
</div>
<div class="wrap"><table>
<thead><tr><th>Time (PT)</th><th>IP</th><th>Location</th><th>Device</th><th>Screen</th><th>Page</th><th>From</th><th>Lang / TZ</th><th>Stayed</th><th>User agent</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<script>
  const nl = document.getElementById('nolog'); nl.checked = !!localStorage.getItem('nolog');
  nl.onchange = () => nl.checked ? localStorage.setItem('nolog', '1') : localStorage.removeItem('nolog');
  document.getElementById('hidebots').onchange = (e) =>
    document.querySelectorAll('tr.bot').forEach((r) => (r.style.display = e.target.checked ? 'none' : ''));
</script>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
