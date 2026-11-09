// 챔피언 상태 — 시각(now)에 따라 정한다. 데모 시계로 과거로 가면 확정 전 모습이 그대로 보인다.
//  decided  : 확정. 확정 경기의 결정 시각이 지났다
//  deciding : 결정 전, 마지막 경기에서 정해진다(그 경기가 끝나기 전까지). 이미 확정된 다른 타이틀은 같이 보인다
//  partial  : 결정 경기는 끝났는데 결과를 아직 옮겨 적지 않았다 → 확정된 다른 타이틀만
//  null     : 보일 것이 없다
import { CHAMPIONS, SEASON } from './data-2026.js';
import { getPrimarySession } from '../schedule/utils.js';
import { getRaceEnd, isCancelled } from '../home/time.js';
import { getStaticFallbackRaces } from '../schedule/service.js';

// 시즌 데이터는 앱의 경기 목록(그 해 시즌만 들고 있다 — 1월이 되면 2027만)과 상관없이 정적 시즌 파일에서 읽는다.
// 그래야 해가 바뀐 뒤 시즌 정리 기간에도 2026 챔피언이 그대로 보인다.
export const SEASON_RACES = getStaticFallbackRaces(SEASON);
const NEXT_RACES = getStaticFallbackRaces(SEASON + 1);
const BY_ID = new Map(SEASON_RACES.map((r) => [r.id, r]));

const DAY = 86400000;
const FEATURE_DAYS = 30;   // 홈 큰 카드: 그 시리즈 마지막 경기 뒤 30일까지. 그 뒤는 한 줄로
export const SERIES_ORDER = ['F1', 'WEC', 'IMSA', 'WRC', 'GTWC'];
export const CATEGORY_SERIES = { F1: ['F1'], ENDURANCE: ['WEC', 'IMSA'], WRC: ['WRC'], GTWC: ['GTWC'] };

const ms = (v) => (v ? Date.parse(v) : null);
function decidedAt(race, at = 'end') {
  if (!race) return null;
  if (at === 'start') return ms(getPrimarySession(race)?.startUtc);
  return getRaceEnd(race)?.getTime() ?? null;
}

// 그 시리즈 이번 시즌 경기(취소 제외) — 남은 경기 수 · 시즌 끝
function seasonRaces(series) {
  return SEASON_RACES.filter((r) => r.series === series && !isCancelled(r) && String(r.id).includes(`-${SEASON}-`)
    && (series !== 'GTWC' || r.championship === 'GTWC_EU'));
}
export function remainingOf(series, now) {
  return seasonRaces(series).filter((r) => (getRaceEnd(r)?.getTime() ?? Infinity) > now).length;
}
function seasonEndOf(series) {
  const ends = seasonRaces(series).map((r) => getRaceEnd(r)?.getTime()).filter(Number.isFinite);
  return ends.length ? Math.max(...ends) : null;
}
// 다음 시즌 첫 경기(시각이 없으면 주말 시작일). 없으면 다음 해 1월 말까지로 본다
function nextSeasonStart(series) {
  const next = NEXT_RACES.filter((r) => r.series === series && !isCancelled(r))
    .map((r) => ms(getPrimarySession(r)?.startUtc) ?? ms(r.weekendStart)).filter(Number.isFinite);
  return next.length ? Math.min(...next) : Date.UTC(SEASON + 1, 0, 31);
}

export function championState(series, now) {
  const c = CHAMPIONS[series];
  if (!c) return null;
  const byId = BY_ID;
  const mainAt = c.decidedBy ? decidedAt(byId.get(c.decidedBy), c.at) : null;
  // 다른 타이틀: 따로 확정 경기가 있으면 그 시각, 없으면 대표 타이틀과 같은 때
  const others = (c.others || []).filter((o) => {
    const t = o.decidedBy ? decidedAt(byId.get(o.decidedBy), o.at) : mainAt;
    return t != null && now >= t;
  });
  const base = { series, c, others, remaining: remainingOf(series, now), seasonEnd: seasonEndOf(series) };
  if (mainAt != null && now >= mainAt) return { ...base, status: 'decided', at: mainAt, race: byId.get(c.decidedBy) };
  if (c.deciding) {
    const race = byId.get(c.deciding.race);
    const end = race ? getRaceEnd(race)?.getTime() : null;
    const start = race ? ms(race.weekendStart) : null;
    if (end != null && now < end && (others.length || (start != null && now >= start))) return { ...base, status: 'deciding', race };
    if (end != null && now >= end && others.length) return { ...base, status: 'partial', race };
  }
  return null;
}

// 홈: F1(모두에게, 화제) + 관심 시리즈. 다음 시즌 첫 경기 전까지. 결정 중이 먼저, 그다음 최근 확정 순
export function homeChampions(now, preferences) {
  const followed = (s) => s === 'F1' || (preferences?.series?.[s] && preferences.series[s] !== 'off');
  const list = SERIES_ORDER.filter(followed)
    .map((s) => championState(s, now))
    .filter((x) => x && now < nextSeasonStart(x.series));
  const f1 = list.find((x) => x.series === 'F1' && x.status === 'decided');
  const feature = f1 && (f1.seasonEnd == null || now < f1.seasonEnd + FEATURE_DAYS * DAY) ? f1 : null;
  const rows = list.filter((x) => x !== feature)
    .sort((a, b) => (a.status === 'deciding' ? -1 : 0) - (b.status === 'deciding' ? -1 : 0) || (b.at ?? 0) - (a.at ?? 0));
  return { feature, rows };
}

// 시리즈 탭: 그 분류의 시리즈 전부(관심과 상관없이)
export function categoryChampions(category, now) {
  return (CATEGORY_SERIES[category] || []).map((s) => championState(s, now)).filter(Boolean);
}

// 시즌 사이: 관심 시리즈의 다음 시즌 첫 경기. 시각이 없으면 주말 시작일
export function nextSeasonOpeners(now, preferences) {
  const followed = (s) => preferences?.series?.[s] && preferences.series[s] !== 'off';
  const firsts = new Map();
  for (const r of NEXT_RACES) {
    if (isCancelled(r) || !followed(r.series)) continue;
    if (r.series === 'GTWC' && r.championship && r.championship !== 'GTWC_EU') continue;
    const s = ms(getPrimarySession(r)?.startUtc);
    const t = s ?? ms(r.weekendStart);
    if (!Number.isFinite(t) || t < now) continue;
    const cur = firsts.get(r.series);
    if (!cur || t < cur.t) firsts.set(r.series, { series: r.series, race: r, t, timed: s != null });
  }
  return [...firsts.values()].sort((a, b) => a.t - b.t);
}

// 홈 챔피언 카드의 '순위 보기' → 시리즈 탭이 열릴 때 F1 드라이버 순위로. 한 번 읽으면 지운다
let wantView = null;
export function requestSeriesView(view) { wantView = view; }
// 렌더 중에 읽으므로(StrictMode는 두 번 부른다) 바로 지우지 않고 다음 틱에 지운다
export function takeSeriesView() { const v = wantView; if (v) setTimeout(() => { wantView = null; }, 0); return v; }

export function isChampionCode(series, code, now) {
  const st = championState(series, now);
  return !!(st && st.status === 'decided' && st.c.code === code);
}
