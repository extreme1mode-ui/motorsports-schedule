// '한 바퀴' 순위표 — Vercel Function.
//   GET /api/lap?track=lvg26&period=week|all[&ms=95800[&pid=p_…]]
//   → { period, count, rows: [{ pid, ms, at }], topGhost, ctx, at }
//
// - Supabase RPC lap_board(supabase/migrations/0003_lap.sql)를 publishable 키로 부른다(비밀 키는 쓰지 않는다).
//   rows = 위 50줄, count = 사람 수, topGhost = 1위의 움직임(0.1초마다 위치 m, 옅은 차).
//   ms를 주면 ctx = 그 기록이 설 자리 { ahead, above, below, listed }(pid를 주면 그 사람의 줄은 빼고 센다).
// - 이름 · user_id는 나가지 않는다. 이름은 앱이 pid로 만든다.
// - CDN 캐시 30초(ms가 있으면 주소가 사람마다 달라 사실상 캐시되지 않는다). 토스 미니앱이 다른 출처에서 읽는다.
// - env가 없거나 실패하면 503 + no-store. 앱은 이 기기 기록만으로 순위표를 보인다(지금과 같다).
const TIMEOUT_MS = 5000;
const TRACK = /^[a-z0-9]{2,12}$/;
const PID = /^p_[0-9a-f]{24}$/;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

async function fetchBoard(args) {
  const env = globalThis.process?.env || {};   // eslint 설정이 브라우저 전역이라 globalThis로 읽는다
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('supabase env missing');

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let timer;
  try {
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS); });
    const { data, error } = await Promise.race([client.rpc('lap_board', args), timeout]);
    if (error) throw error;
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// 모양이 맞는 값만 통과시킨다(DB가 이미 맞춰 주지만 한 번 더)
const cleanRow = (r) => (r && typeof r === 'object' && PID.test(r.pid) && isInt(r.ms, 1000, 600000) ? { pid: r.pid, ms: r.ms } : null);
export function cleanBoard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rows = (Array.isArray(raw.rows) ? raw.rows : []).slice(0, 50)
    .map((r) => { const c = cleanRow(r); return c ? { ...c, at: Number.isFinite(r.at) ? Math.round(r.at) : 0 } : null; }).filter(Boolean);
  const g = Array.isArray(raw.top_ghost) && raw.top_ghost.length <= 7000 && raw.top_ghost.every((v) => Number.isFinite(v)) ? raw.top_ghost : null;
  let ctx = null;
  const c = raw.ctx;
  if (c && typeof c === 'object' && isInt(c.ahead, 0, 1e9)) {
    const list = (v) => (Array.isArray(v) ? v.slice(0, 2).map(cleanRow).filter(Boolean) : []);
    ctx = { ahead: c.ahead, above: list(c.above), below: list(c.below), listed: c.listed === true };
  }
  return { period: typeof raw.period === 'string' ? raw.period.slice(0, 10) : '', count: isInt(raw.count, 0, 1e9) ? raw.count : rows.length, rows, topGhost: g, ctx };
}

// 쿼리 → lap_board 인자. 모양이 틀리면 null
export function parseQuery(q) {
  const track = String(q.track || ''); const period = String(q.period || '');
  if (!TRACK.test(track) || (period !== 'week' && period !== 'all')) return null;
  const args = { track, period, ms: null, pid: null };
  if (q.ms != null && q.ms !== '') { const ms = Number(q.ms); if (!isInt(ms, 1000, 600000)) return null; args.ms = ms; }
  if (q.pid != null && q.pid !== '') { if (!PID.test(String(q.pid)) || args.ms == null) return null; args.pid = String(q.pid); }
  return args;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');   // 토스 미니앱이 다른 출처에서 읽는다
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD'); res.status(204).send(''); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method Not Allowed');
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Vercel은 req.query를 채운다. 개발 서버(vite dev-api)는 주소에서 읽는다
  const args = parseQuery(req.query || Object.fromEntries(new URL(req.url || '/', 'http://local').searchParams));
  if (!args) {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
    res.status(400).send('{"error":"bad request"}');
    return;
  }
  let board;
  try {
    board = cleanBoard(await fetchBoard(args));
    if (!board) throw new Error('bad shape');
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('{"error":"unavailable"}');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
  res.status(200).send(JSON.stringify({ ...board, ms: args.ms, at: new Date().toISOString() }));
}
