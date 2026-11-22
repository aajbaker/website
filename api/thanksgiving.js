/* Live sync for /thanksgiving.
   Each shared plan is a "room" named by a random code that only people with
   the invite link know. A room is a Redis hash of key -> value plus a version
   counter that goes up on every write, so phones can cheaply poll for changes.
   Storage is Upstash Redis, connected through the Vercel Marketplace, which
   sets KV_REST_API_URL / KV_REST_API_TOKEN on the project. */

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const ROOM_RE = /^[a-z0-9]{12,32}$/;
// g = guests, d = dinner time, k:<id> = checkmark, x:<id> = extra shopping item
const KEY_RE = /^(g|d|[kx]:[A-Za-z0-9:._-]{1,64})$/;
const MAX_OPS = 400;
const TTL = 60 * 60 * 24 * 90; // rooms expire 90 days after the last change

async function redis(path, body) {
  const r = await fetch(REDIS_URL + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'storage not configured' });

  try {
    if (req.method === 'GET') {
      const room = String((req.query && req.query.room) || '');
      if (!ROOM_RE.test(room)) return res.status(400).json({ error: 'bad room' });
      const have = Number(req.query.v);
      const ver = await redis('', ['GET', 'tg:' + room + ':v']);
      const v = Number(ver.result || 0);
      if (v === have) return res.status(200).json({ v });
      const all = await redis('', ['HGETALL', 'tg:' + room]);
      const arr = all.result || [];
      const data = {};
      for (let i = 0; i + 1 < arr.length; i += 2) data[arr[i]] = arr[i + 1];
      return res.status(200).json({ v, data });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
      body = body || {};
      const room = String(body.room || '');
      if (!ROOM_RE.test(room)) return res.status(400).json({ error: 'bad room' });
      const ops = body.ops && typeof body.ops === 'object' ? body.ops : {};
      const entries = Object.entries(ops).filter(([k, v]) => KEY_RE.test(k) && typeof v === 'string' && v.length <= 100);
      if (!entries.length || entries.length > MAX_OPS) return res.status(400).json({ error: 'bad ops' });

      const hk = 'tg:' + room;
      const vk = 'tg:' + room + ':v';
      // Atomic: readers see the new values and the new version together.
      const out = await redis('/multi-exec', [
        ['HSET', hk].concat(...entries),
        ['INCR', vk],
        ['EXPIRE', hk, String(TTL)],
        ['EXPIRE', vk, String(TTL)],
      ]);
      const v = Number(out && out[1] && out[1].result);
      if (!v) throw new Error('write failed');
      return res.status(200).json({ v });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(502).json({ error: 'sync failed' });
  }
};
