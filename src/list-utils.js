// 목록·상세 공용 계산(컴포넌트 아님). 화면 부품은 list-parts.jsx / detail-parts.jsx.
import { SERIES, getRaceStartUtc } from './schedule/index.js';

// 라운드 코드: 'R1', 'R19', 데이터에 묶음 라벨이 있으면 그대로('R9-10'). 0을 채우지 않는다.
export function getRoundDisplay(race, fallbackIndex) {
  if (race?.roundLabel) return race.roundLabel;
  const roundNumber = race?.round ?? race?.plannedRound ?? fallbackIndex;
  if (!Number.isFinite(roundNumber)) return '';
  return `R${roundNumber}`;
}

// 문장 속 라운드: '19라운드' / 'Round 19'. 라운드가 없으면 빈 문자열(예전 'EVENT' 대신 비운다).
export function getRoundDescriptor(race, tr, fallbackIndex) {
  if (race?.roundLabel) return race.roundLabel;
  const roundNumber = race?.round ?? race?.plannedRound ?? fallbackIndex;
  if (!Number.isFinite(roundNumber)) return '';
  return tr ? tr('round.n', { n: roundNumber }) : `R${roundNumber}`;
}

// 정렬·그룹핑은 시작 시각(UTC)으로. 시간대와 무관하게 항상 옳다.
export const startMs = (r) => { const iso = getRaceStartUtc(r) || r.primaryStartUtc; return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER; };
export const byStart = (a, b) => startMs(a) - startMs(b);
// 시청자 달력 기준 파트 (시작 시각 → 사용자 시간대). 시작 미정이면 primaryStartUtc(주말 시작)로.
export const viewerParts = (fmt, r) => fmt.parts(getRaceStartUtc(r) || r.primaryStartUtc);

// 필터 칩 이름: '전체'·'내구'만 번역, F1·WRC·GTWC는 고유명이라 그대로.
export const catLabel = (tr, item) => (item.id === 'ALL' || item.id === 'ENDURANCE' ? tr(`category.${item.id}`) : item.short);

// 줄에 붙는 상태 글자 하나. 예정은 null(시각만 보인다).
export function raceStatus(race) {
  if (race.status === 'live') return 'live';
  if (race.status === 'cancelled') return 'cancelled';
  if (race.status === 'completed') return 'completed';
  return race.isNextRace ? 'next' : null;
}

// 'F1 R19' / 'GTWC R9-10' — 시리즈 코드와 라운드 코드 한 덩어리.
export const seriesRound = (race) => [SERIES[race.series]?.short || race.series, getRoundDisplay(race)].filter(Boolean).join(' ');

// 시청자 날짜별 묶음: [{ key:'2026-10-03', label:'10월 3일 (토)', races:[…] }]
export function groupByViewerDay(fmt, tr, list) {
  const out = [];
  for (const r of list) {
    const v = getRaceStartUtc(r) || r.primaryStartUtc;
    const key = fmt.dateKey(v) || 'tba';
    let g = out[out.length - 1];
    if (!g || g.key !== key) {
      const p = fmt.parts(v);
      g = { key, label: p ? tr('schedule.dayHead', { date: fmt.monthDay(v), dow: p.weekdayName }) : tr('time.tba'), races: [] };
      out.push(g);
    }
    g.races.push(r);
  }
  return out;
}

