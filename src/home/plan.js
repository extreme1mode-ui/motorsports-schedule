// 홈 조립(UX v2) — 순수 함수. 화면(Home.jsx)은 이 결과를 분 단위로 memo해서 쓴다.
// 히어로 순서(결정 1·L5), 덱(이번 주말 내 경기), 이후 일정, 지난 주말 결과, 제목 문장(결정 4).
// 시각은 보는 사람 시간대(preferences.timezone), 문구는 i18n 'home.h.*'(한 줄로 짧게 — '다음은 상파울루 GP 연습 3').
import {
  resolveTimeState, getRaceState, getMainSessionAt, getRaceEnd, getLiveSession, getNextSession,
  resolveWeekendPhase, getWeekendRange, isAliveState, isCancelled, getTimelineSessions, getSessionEnd,
} from './time.js';
import { getRaceWeekKey, groupRaceWeeks, getWeekName } from './weeks.js';
import { getPrimarySession, getRaceLabels, formatSessionLabel } from '../schedule/utils.js';
import { formatRelDay, formatDateKey, DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '../schedule/format.js';
import { t } from '../i18n/t.js';

const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;
const HERO_ORDER = ['F1', 'WEC', 'IMSA', 'GTWC', 'WRC'];
const LATER_MAX = 7;
const LAST_WITHIN_MS = 9 * DAY_MS;

const msOf = (v) => (v ? new Date(v).getTime() : null);
const modeOf = (preferences, series) => preferences?.series?.[series] || 'off';
// 세션을 셀 때의 수준: '안 보기'(즐겨찾기로 들어온 경기)는 '결승만'과 같게
const viewModeOf = (preferences, series) => (modeOf(preferences, series) === 'all' ? 'all' : 'race');
const interestOf = (preferences, series) => ({ all: 2, race: 1 }[modeOf(preferences, series)] || 0);
const startOf = (s) => msOf(s?.startUtc);
// 정렬 기준: 대표 세션 시작 → primaryStartUtc → 첫 세션, 같으면 서킷 현지 주말 끝
function sortKey(race) {
  const firsts = (race.sessions || []).map((x) => msOf(x.startUtc)).filter((x) => x != null);
  return startOf(getPrimarySession(race)) ?? msOf(race.primaryStartUtc) ?? (firsts.length ? Math.min(...firsts) : Infinity);
}
const byStart = (a, b) => sortKey(a) - sortKey(b) || String(a.weekendEnd || '').localeCompare(String(b.weekendEnd || ''));

// races: 정규화된 전체 목록. favorites: Set(id). hasResults(race): F1 결과가 있는지(지난 주말 결과용).
export function buildHomePlan(races = [], { preferences, favorites = new Set(), now = new Date(), hasResults = () => false, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const at = new Date(now).getTime();
  const isMine = (race) => modeOf(preferences, race.series) !== 'off';
  const isFav = (race) => favorites.has(race.staticId || race.id) || favorites.has(race.id);
  const mine = races.filter((race) => (isMine(race) || isFav(race)) && !isCancelled(race)).sort(byStart);
  const st = (race) => resolveTimeState(race, at).state;
  const mOf = (race) => viewModeOf(preferences, race.series);

  // 히어로(결정 1): 결승 진행 중 → 세션 진행 중 → 1시간 안(결승·세션) → 24시간 안 결승 → 오늘 주말인데 시각 미정 → 가장 가까운 주말
  const live = mine.filter((r) => st(r) === 'live');
  const liveSes = (r) => getLiveSession(r, at, mOf(r));
  const sesLive = mine.filter((r) => st(r) !== 'live' && liveSes(r)).sort((a, b) => startOf(liveSes(a)) - startOf(liveSes(b)));
  const nextOf = (r) => getNextSession(r, at, mOf(r));
  const hour = mine.filter((r) => { const n = nextOf(r); return n && startOf(n) - at <= HOUR_MS; }).sort((a, b) => startOf(nextOf(a)) - startOf(nextOf(b)));
  const soon = mine.filter((r) => st(r) === 'soon').sort((a, b) => startOf(getMainSessionAt(a, at)) - startOf(getMainSessionAt(b, at)));
  const todayTba = mine.filter((r) => {
    if (st(r) !== 'tba') return false;
    const { start, end } = getWeekendRange(r);
    return start && end && start.getTime() <= at && at <= end.getTime();
  });
  let hero = null; let pick = null;
  if (live.length) { hero = live[0]; pick = 'live'; }
  else if (sesLive.length) { hero = sesLive[0]; pick = 'session'; }
  else if (hour.length) { hero = hour[0]; pick = 'hour'; }
  else if (soon.length) { hero = soon[0]; pick = 'soon'; }
  else if (todayTba.length) { hero = todayTba[0]; pick = 'today'; }

  const weeks = groupRaceWeeks(mine, { timeZone });
  let heroWeek = null;
  if (!hero) {
    for (const g of weeks) {
      const cand = g.races.filter((r) => isAliveState(st(r)));
      if (!cand.length) continue;
      cand.sort((a, b) => interestOf(preferences, b.series) - interestOf(preferences, a.series)
        || (startOf(getPrimarySession(a)) ? 0 : 1) - (startOf(getPrimarySession(b)) ? 0 : 1)
        || HERO_ORDER.indexOf(a.series) - HERO_ORDER.indexOf(b.series));
      hero = cand[0]; heroWeek = g; pick = 'weekend'; break;
    }
  }
  if (hero && !heroWeek) heroWeek = weeks.find((g) => g.weekKey === getRaceWeekKey(hero)) || null;

  const heroMode = hero ? (modeOf(preferences, hero.series) === 'off' ? 'race' : modeOf(preferences, hero.series)) : null;
  const heroNext = hero ? getNextSession(hero, at, heroMode) : null;
  const phase = hero ? resolveWeekendPhase(hero, at, { mode: heroMode }) : null;
  const heroMain = hero ? getPrimarySession(hero) : null;
  const heroSession = pick === 'session'
    ? liveSes(hero)
    : (phase?.phase === 'session-live' && phase.session !== heroMain ? phase.session : null);
  let kind = null;
  if (pick === 'live') kind = 'live';
  else if (heroSession) kind = 'session';
  else if (pick === 'hour') kind = heroNext && heroNext.kind === 'race' ? 'count' : 'between';
  else if (pick === 'soon') kind = startOf(getMainSessionAt(hero, at)) - at <= HOUR_MS ? 'count' : 'soon';
  else if (pick === 'today') kind = 'tba';
  else if (pick === 'weekend') kind = st(hero) === 'tba' ? 'tba' : (phase.phase === 'between' || phase.phase === 'session-soon') && heroNext ? 'between' : 'weekend';

  // 그 주말의 관심 경기(아직 안 끝난 것). 덱 = 히어로 + 나머지(취소 제외, 목록 상태로 살아 있는 것)
  const weekRaces = heroWeek ? heroWeek.races.filter((r) => isAliveState(st(r))) : [];
  const deck = hero ? [hero, ...weekRaces.filter((r) => r !== hero && !isCancelled(r) && isAliveState(getRaceState(r, at)))] : [];
  // 이후 일정: 그 주말 다음 주부터, 안 끝난 관심 경기 최대 7개
  const heroKey = heroWeek?.weekKey ?? '';
  const later = mine.filter((r) => (getRaceWeekKey(r) || '') > heroKey && isAliveState(st(r))).slice(0, LATER_MAX);
  // 지난 주말 결과: F1 결과가 있는 가장 최근 경기(끝난 지 9일 안), 관심 시리즈이거나 즐겨찾기한 경기
  const last = races.filter((r) => {
    if (!hasResults(r) || !startOf(getPrimarySession(r)) || !(isMine(r) || isFav(r))) return false;
    const end = getRaceEnd(r);
    return end && at >= end.getTime() && at - end.getTime() < LAST_WITHIN_MS;
  }).sort((a, b) => startOf(getPrimarySession(b)) - startOf(getPrimarySession(a)))[0] || null;

  // 내 주말 시간표: 그 주말 관심 경기의 세션(관심 수준대로, 체커기 빼고), 보는 사람 시간대의 날짜로 묶는다. 시각 미정은 개수만.
  const timeline = [];
  let tba = 0;
  for (const r of heroWeek ? heroWeek.races : []) {
    const mode = modeOf(preferences, r.series) === 'off' ? 'race' : modeOf(preferences, r.series);
    for (const s of getTimelineSessions(r, mode)) {
      if (!s.startUtc) { tba += 1; continue; }
      timeline.push({ s, r, at: msOf(s.startUtc), end: getSessionEnd(r, s)?.getTime() ?? null });
    }
  }
  timeline.sort((a, b) => a.at - b.at);
  const days = [];
  for (const it of timeline) {
    const key = formatDateKey(it.at, { timeZone });
    let d = days[days.length - 1];
    if (!d || d.key !== key) { d = { key, items: [] }; days.push(d); }
    d.items.push(it);
  }

  return { hero, pick, kind, phase, heroSession, heroWeek, heroNext, weekRaces, deck, later, last, mine, days, tba };
}

// 덱 카드 한 장의 상태(카드마다 따로): live 결승 진행 중 · session 세션 진행 중 · count 1시간 안 결승 ·
// between(hour) 1시간 안 다른 세션 · soon 24시간 안 · tba 시각 미정 · between 세션 사이 · weekend 그 밖.
// 결정 2: 결승·세션 모두 시작 1시간 전부터 '곧'(중계 버튼). 결승이 둘인 주말은 지금 기준 결승(L1).
export function getCardState(race, now = new Date(), preferences) {
  const at = new Date(now).getTime();
  const m0 = modeOf(preferences, race.series);
  const mode = m0 === 'off' ? 'race' : m0;
  const ts = resolveTimeState(race, at).state;
  if (ts === 'live') return { kind: 'live' };
  const phase = resolveWeekendPhase(race, at, { mode });
  if (phase.phase === 'session-live' && phase.session !== getPrimarySession(race)) return { kind: 'session', ses: phase.session };
  const nx = getNextSession(race, at, mode);
  if (nx && startOf(nx) - at <= HOUR_MS) return nx.kind === 'race' ? { kind: 'count' } : { kind: 'between', nx, hour: true };
  if (ts === 'soon') return { kind: 'soon' };
  if (ts === 'tba') return { kind: 'tba' };
  if ((phase.phase === 'between' || phase.phase === 'session-soon') && nx) return { kind: 'between', nx };
  return { kind: 'weekend' };
}

// 제목 문장 { cap, title }. 한 경기를 가리키면 늘 경기 이름(결정 4). 이번·다음 주말에 볼 경기가 둘 이상이면 'N개'.
export function homeHeadline(plan, now = new Date(), { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, races = [] } = {}) {
  const at = new Date(now).getTime();
  const r = plan?.hero;
  if (!r) return { title: t(locale, 'home.h.empty') };
  const opts = { locale, timeZone };
  const wk = plan.heroWeek ? getWeekName(plan.heroWeek, at, { ...opts, races }) : null;
  const near = wk?.kind === 'this' || wk?.kind === 'next';
  // 세션 이름은 지금처럼 formatSessionLabel(ko 한글화, en 원문). 대표 세션이 없으면 '결승'
  const raceWord = formatSessionLabel('Race', 'race', locale);
  const label = (s) => formatSessionLabel(s?.tEn, s?.kind, locale) || raceWord;
  const main = getMainSessionAt(r, at) || getPrimarySession(r);
  const ml = main ? label(main) : raceWord;
  const st0 = startOf(main);
  const name = getRaceLabels(r, locale).shortName;
  let title;
  switch (plan.kind) {
    case 'live': title = t(locale, 'home.h.live', { name, label: ml }); break;
    case 'count': {
      const m = Math.max(1, Math.ceil((st0 - at) / 60000));
      title = m >= 60 ? t(locale, 'home.h.countHour', { name, label: ml }) : t(locale, 'home.h.countMin', { m, name, label: ml });
      break;
    }
    case 'session': title = t(locale, 'home.h.session', { name, label: plan.heroSession ? label(plan.heroSession) : ml }); break;
    case 'soon': title = t(locale, 'home.h.next', { name, label: ml }); break;
    case 'tba': title = t(locale, 'home.h.tba', { name }); break;
    default:
      if (plan.kind === 'between' && plan.heroNext) {
        title = t(locale, 'home.h.next', { name, label: label(plan.heroNext) });
      } else if (near) {
        const n = plan.weekRaces.length;
        title = n > 1 ? t(locale, 'home.h.weekendN', { n }) : t(locale, 'home.h.next', { name, label: ml });
      } else {
        const firsts = (r.sessions || []).map((x) => msOf(x.startUtc)).filter((x) => x != null);
        const when = st0 ?? (firsts.length ? Math.min(...firsts) : msOf(r.primaryStartUtc));
        title = t(locale, 'home.h.later', { name, rel: formatRelDay(when, at, opts) });
      }
  }
  return { title };
}
