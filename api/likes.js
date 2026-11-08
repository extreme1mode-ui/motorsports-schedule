// 경기별 즐겨찾기 수 — Vercel Function.
//   GET /api/likes → { counts: { <경기 id>: n }, min: 10, at }
//
// - 수 = 그 경기에 하트를 켜 둔 기기(익명 사용자) 수. Supabase RPC like_counts()가 기준(10) 이상인 경기만 돌려준다.
//   작은 수는 서버 밖으로 나오지 않는다(supabase/migrations/0002_likes.sql).
// - publishable 키만 쓴다(비밀 키는 쓰지 않는다). 주소는 하나라 CDN 캐시도 하나다(5분).
// - env가 없거나 실패하면 503 + no-store. 앱은 숫자를 숨기고 하트만 보인다.
const LIKE_MIN = 10;
const TIMEOUT_MS = 5000;

async function fetchCounts() {
  const env = globalThis.process?.env || {};   // eslint 설정이 브라우저 전역이라 globalThis로 읽는다
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('supabase env missing');

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let timer;
  try {
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS); });
    const { data, error } = await Promise.race([client.rpc('like_counts'), timeout]);
    if (error) throw error;
    return data && typeof data === 'object' ? data : {};
  } finally {
    clearTimeout(timer);
  }
}

// 숫자만, 기준 이상만 통과시킨다(DB가 이미 거르지만 한 번 더).
export function cleanCounts(raw) {
  const out = {};
  for (const [id, n] of Object.entries(raw || {})) {
    if (/^[a-z0-9-]{1,80}$/.test(id) && Number.isInteger(n) && n >= LIKE_MIN) out[id] = n;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');   // 토스 미니앱이 다른 출처에서 읽는다
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD'); res.status(204).send(''); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method Not Allowed');
    return;
  }
  let counts;
  try {
    counts = cleanCounts(await fetchCounts());
  } catch {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('{"error":"unavailable"}');
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(JSON.stringify({ counts, min: LIKE_MIN, at: new Date().toISOString() }));
}
