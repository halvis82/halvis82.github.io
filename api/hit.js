import { redis } from './_redis.js';

const MAX_VISITS = 10000;
const clip = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : v ?? null);
const dec = (v) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };

export async function POST(request) {
  let body;
  try { body = JSON.parse(await request.text()); } catch { return new Response(null, { status: 400 }); }
  const id = clip(body.id, 40);
  if (!id || !/^[\w-]+$/.test(id)) return new Response(null, { status: 400 });
  const key = `visit:${id}`;

  // Second ping when the visitor leaves: just record time on page.
  if (body.type === 'leave') {
    const [raw] = await redis(['GET', key]);
    if (raw) {
      const v = JSON.parse(raw);
      v.duration = Math.min(Math.max(Number(body.duration) || 0, 0), 86400);
      await redis(['SET', key, JSON.stringify(v), 'KEEPTTL']);
    }
    return new Response(null, { status: 204 });
  }

  const h = request.headers;
  const visit = {
    id,
    time: new Date().toISOString(),
    ip: h.get('x-real-ip') || (h.get('x-forwarded-for') || '').split(',')[0].trim() || null,
    city: dec(h.get('x-vercel-ip-city')),
    region: h.get('x-vercel-ip-country-region'),
    country: h.get('x-vercel-ip-country'),
    lat: h.get('x-vercel-ip-latitude'),
    lon: h.get('x-vercel-ip-longitude'),
    ipTimezone: h.get('x-vercel-ip-timezone'),
    ua: clip(h.get('user-agent'), 500),
    page: clip(body.page),
    referrer: clip(body.referrer),
    lang: clip(body.lang, 50),
    tz: clip(body.tz, 60),
    screen: clip(body.screen, 30),
    viewport: clip(body.viewport, 30),
    dpr: clip(String(body.dpr ?? ''), 10),
    touch: !!body.touch,
    duration: null,
  };

  await redis(
    ['SET', key, JSON.stringify(visit), 'EX', 60 * 60 * 24 * 365],
    ['LPUSH', 'visits', id],
    ['LTRIM', 'visits', 0, MAX_VISITS - 1],
  );
  return new Response(null, { status: 204 });
}
