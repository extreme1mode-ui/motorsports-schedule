// 관심 시리즈 밖에서 "한번 볼 만한" 경기를 고른다. 절대 임계값은 두지 않는다 — 남은 경기를 점수로 정렬해 상위 limit개.
import { getPrestige, getHighlights } from './highlights.js';
import { getPrimarySession } from './utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const SCORE = {
  prestige: { 3: 30, 2: 20, 1: 10 },
  highlight: 25,
  withinTwoWeeks: 15,
  withinFourWeeks: 8,
  offSeries: 20,
};

const REASON = {
  prestige3: '모터스포츠 최고 권위 대회',
  prestige2: '시즌 주요 대회',
  withinTwoWeeks: '2주 안에 열려요',
  offSeries: '아직 보지 않는 시리즈예요',
};

// 경기 시각. 대표 세션 시작 → raceKstIso → 주말 끝(KST) 순.
function raceTime(race) {
  const iso = getPrimarySession(race)?.startUtc || race.raceKstIso || (race.weekendEnd ? `${race.weekendEnd}T23:59:59+09:00` : null);
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
}

export function scoreRace(race, preferences, now = new Date()) {
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const time = raceTime(race);
  const days = time === null ? null : (time - at) / DAY_MS;
  const mode = preferences?.series?.[race.series];

  let score = 0;
  const reasons = [];

  const highlights = getHighlights(race);
  if (highlights.length) { score += SCORE.highlight; reasons.push(highlights[0].note); }   // 가장 구체적인 이유를 항상 앞에

  const prestige = getPrestige(race);
  score += SCORE.prestige[prestige] ?? SCORE.prestige[1];
  if (prestige === 3) reasons.push(REASON.prestige3);
  else if (prestige === 2) reasons.push(REASON.prestige2);

  if (days !== null && days <= 14) { score += SCORE.withinTwoWeeks; reasons.push(REASON.withinTwoWeeks); }
  else if (days !== null && days <= 28) { score += SCORE.withinFourWeeks; }

  if (mode === 'off') { score += SCORE.offSeries; reasons.push(REASON.offSeries); }

  return { score, reasons: reasons.slice(0, 2), time };
}

export function getRecommendations(races = [], preferences = null, now = new Date(), limit = 3) {
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const candidates = [];
  for (const race of races) {
    if (!race || race.status === 'cancelled') continue;
    const { score, reasons, time } = scoreRace(race, preferences, at);
    if (time === null || time < at) continue;                   // 이미 끝난 경기 제외
    candidates.push({ race, score, reasons, time });
  }
  candidates.sort((a, b) => (b.score - a.score) || (a.time - b.time));  // 동점이면 빠른 날짜 먼저
  return candidates.slice(0, Math.max(0, limit)).map(({ race, score, reasons }) => ({ race, score, reasons }));
}
