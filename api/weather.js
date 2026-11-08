// 비 예보 — Vercel Function. MET Norway Locationforecast 2.0을 중계·요약하고 CDN에 맡겨 둔다.
//   GET /api/weather → { source, updatedAt, races: { <경기 id>: { updatedAt, sessions: { <세션 시작 ISO>: { level, mm, symbol } } } } }
//   세션 키는 startUtc를 toISOString()으로 맞춘 값이다(데이터 표기가 달라도 같은 키가 되게). 브라우저도 같은 방식으로 찾는다.
//
// - 브라우저·앱은 MET를 직접 부르지 않는다(MET 이용 조건: 자체 프록시·캐시를 거칠 것). 주소는 하나라 CDN 캐시도 하나다.
// - 9일 안에 끝나지 않은 세션이 있는 경기만, 좌표가 같으면 한 번만 부른다. WRC·좌표 없는 서킷·시각 미정 세션은 뺀다.
// - 비가 오는 세션만 내보낸다(단계 0은 싣지 않는다). 판단식은 src/weather/level.js — 브라우저와 같은 코드다.
// - MET 규칙: 앱 이름과 연락처를 담은 User-Agent, 좌표 소수 4자리(버림), Expires 전에는 다시 부르지 않기, 429면 바로 줄이기.
//   이 함수는 상태를 들고 있지 않으므로 Expires는 CDN 캐시 길이로 지킨다(최소 3시간, MET Expires가 더 늦으면 그때까지).
// - 실패해도 200 + 빈 races를 30분 캐시한다. 앱은 배지를 숨기고, MET는 30분 동안 다시 불리지 않는다.
import season2026 from '../src/schedule/season-2026.json' with { type: 'json' };
import season2027 from '../src/schedule/season-2027.json' with { type: 'json' };
import { getSessionEnd, isCancelled } from '../src/home/time.js';
import { VENUES_GEO, metCoord } from '../src/schedule/venues-geo.js';
import { summarize, HORIZON_MS } from '../src/weather/level.js';

const MET_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const SITE = 'https://www.gantryracing.com';
const FETCH_TIMEOUT_MS = 6000;
const CACHE_OK_S = 3 * 3600;      // 성공: 3시간(+ MET Expires가 더 늦으면 그때까지)
const CACHE_PARTIAL_S = 3600;     // 일부 실패: 1시간 뒤 다시
const CACHE_FAIL_S = 1800;        // 전부 실패·429: 30분 동안 MET를 다시 부르지 않는다
const SWR_S = 3600;

const RACES = [...season2026, ...season2027];

function userAgent() {
  const env = globalThis.process?.env || {};   // eslint 설정이 브라우저 전역이라 globalThis로 읽는다
  const contact = (env.MET_CONTACT || '').trim();   // 비개인 연락 이메일(선택). 없으면 사이트 주소만
  return `Gantry/1.0 ${SITE}${contact ? ` ${contact}` : ''}`;
}

// 지금부터 9일 안에 끝나지 않은 세션이 있는 경기 → 좌표별로 묶는다.
export function targets(now, races = RACES) {
  const byCoord = new Map();
  for (const race of races) {
    if (!race || race.series === 'WRC' || isCancelled(race)) continue;
    const geo = VENUES_GEO[race.circuit];
    if (!geo) continue;
    const sessions = [];
    for (const s of Array.isArray(race.sessions) ? race.sessions : []) {
      if (!s?.startUtc) continue;
      const a = Date.parse(s.startUtc);
      const b = getSessionEnd(race, s)?.getTime();
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= now || a >= now + HORIZON_MS) continue;
      sessions.push({ key: new Date(a).toISOString(), a, b });
    }
    if (!sessions.length) continue;
    const lat = metCoord(geo[0]); const lon = metCoord(geo[1]);
    const k = `${lat},${lon}`;
    if (!byCoord.has(k)) byCoord.set(k, { lat, lon, races: [] });
    byCoord.get(k).races.push({ id: race.id, sessions });
  }
  return [...byCoord.values()];
}

// MET 한 점. 성공이면 { timeseries, updatedAt, expires }, 아니면 { fail, status }.
async function fetchMet({ lat, lon }, fetchImpl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetchImpl(`${MET_URL}?lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (r.status === 203) console.warn('[weather] MET: this product version is deprecated');
    if (!r.ok) return { fail: true, status: r.status };
    const json = await r.json();
    const timeseries = json?.properties?.timeseries;
    if (!Array.isArray(timeseries)) return { fail: true, status: 502 };
    const exp = Date.parse(r.headers.get('expires') || '');
    return { timeseries, updatedAt: json?.properties?.meta?.updated_at || null, expires: Number.isFinite(exp) ? exp : null };
  } catch {
    return { fail: true, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// 요청 하나를 만든다. 시계와 fetch는 바깥에서 넣을 수 있다(확인 스크립트가 같은 함수를 부른다).
export async function buildWeather({ now = Date.now(), fetchImpl = globalThis.fetch, races = RACES } = {}) {
  const points = targets(now, races);
  const results = await Promise.all(points.map((p) => fetchMet(p, fetchImpl)));
  const out = {};
  let ok = 0; let throttled = false; let latestExpires = 0;
  points.forEach((p, i) => {
    const r = results[i];
    if (r.fail) { if (r.status === 429 || r.status === 403) throttled = true; return; }
    ok += 1;
    if (r.expires) latestExpires = Math.max(latestExpires, r.expires);
    for (const race of p.races) {
      const sessions = {};
      for (const s of race.sessions) {
        const w = summarize(r.timeseries, s.a, s.b);
        if (w && w.level > 0) sessions[s.key] = w;
      }
      if (Object.keys(sessions).length) out[race.id] = { updatedAt: r.updatedAt, sessions };
    }
  });
  let maxAge = CACHE_OK_S;
  if (throttled || (points.length && ok === 0)) maxAge = CACHE_FAIL_S;
  else if (ok < points.length) maxAge = CACHE_PARTIAL_S;
  else if (latestExpires) maxAge = Math.max(CACHE_OK_S, Math.ceil((latestExpires - now) / 1000));
  return {
    body: { source: 'MET Norway', updatedAt: new Date(now).toISOString(), races: out },
    maxAge, points: points.length, ok,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');   // 토스 미니앱이 다른 출처에서 읽는다
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD'); res.status(204).send(''); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { body, maxAge } = await buildWeather();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${SWR_S}`);
  res.status(200).send(JSON.stringify(body));
}
