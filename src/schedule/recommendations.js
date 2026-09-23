// 관심 시리즈 밖에서 "한번 볼 만한" 경기를 고른다. 절대 임계값은 두지 않는다 — 남은 경기를 점수로 정렬해 상위 limit개.
import { getRaceWeight, getHighlights, getHighlightNote } from './highlights.js';
import { getPrimarySession } from './utils.js';
import { t } from '../i18n/t.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// 하이라이트가 붙은 평범한 경기(35+5=40)가 하이라이트 없는 3등급(25)을 이긴다. 이 순서를 깨지 말 것.
const SCORE = {
  highlight: 35,
  weight: { 3: 25, 2: 15, 1: 5 },
  withinTwoWeeks: 15,
  withinFourWeeks: 8,
  offSeries: 20,
};

// reasons 문구는 i18n 키 (rec.*). locale은 getRecommendations의 5번째 인자.
const REASON = {
  weight3: 'rec.weight3',
  weight2: 'rec.weight2',
  withinTwoWeeks: 'rec.withinTwoWeeks',
  offSeries: 'rec.offSeries',
};

// 경기 시각. 대표 세션 시작 → raceKstIso → 주말 끝(KST) 순.
function raceTime(race) {
  const iso = getPrimarySession(race)?.startUtc || race.raceKstIso || (race.weekendEnd ? `${race.weekendEnd}T23:59:59+09:00` : null);
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
}

export function scoreRace(race, preferences, now = new Date(), locale = 'ko') {
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const time = raceTime(race);
  const days = time === null ? null : (time - at) / DAY_MS;
  const mode = preferences?.series?.[race.series];

  let score = 0;
  const reasons = [];
  const kinds = [];   // 계측용 이유 종류(열거형). reasons(표시 문구)와 같은 순서.

  const highlights = getHighlights(race);
  if (highlights.length) { score += SCORE.highlight; reasons.push(getHighlightNote(highlights[0], locale)); kinds.push('highlight'); }   // 가장 구체적인 이유를 항상 앞에

  const weight = getRaceWeight(race);
  score += SCORE.weight[weight] ?? SCORE.weight[1];
  if (weight === 3) { reasons.push(t(locale, REASON.weight3)); kinds.push('weight3'); }
  else if (weight === 2) { reasons.push(t(locale, REASON.weight2)); kinds.push('weight2'); }

  if (days !== null && days <= 14) { score += SCORE.withinTwoWeeks; reasons.push(t(locale, REASON.withinTwoWeeks)); kinds.push('withinTwoWeeks'); }
  else if (days !== null && days <= 28) { score += SCORE.withinFourWeeks; }

  if (mode === 'off') { score += SCORE.offSeries; reasons.push(t(locale, REASON.offSeries)); kinds.push('offSeries'); }

  return { score, reasons: reasons.slice(0, 2), kinds, time };
}

export function getRecommendations(races = [], preferences = null, now = new Date(), limit = 3, locale = 'ko') {
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const candidates = [];
  for (const race of races) {
    if (!race || race.status === 'cancelled') continue;
    const { score, reasons, kinds, time } = scoreRace(race, preferences, at, locale);
    if (time === null || time < at) continue;                   // 이미 끝난 경기 제외
    candidates.push({ race, score, reasons, kinds, time });
  }
  candidates.sort((a, b) => (b.score - a.score) || (a.time - b.time));  // 동점이면 빠른 날짜 먼저
  return candidates.slice(0, Math.max(0, limit)).map(({ race, score, reasons, kinds }) => ({ race, score, reasons, kinds }));
}
