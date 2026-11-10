// '한 바퀴'가 홈에서 놓이는 자리와 '이번 주말' 표시. DOM 없음.
import { isCancelled, getWeekendRange } from '../home/time.js';
import { lapTrackOfRace } from './store.js';
import { lapConfig } from './config.js';

const WEEK = 7 * 24 * 3600 * 1000;
// 이번 주말: 그 경기 주말이 7일 안에 시작하고, 아직 끝나지 않았다
export function isThisWeek(race, now) {
  if (!race || isCancelled(race)) return false;
  const { start, end } = getWeekendRange(race);
  return !!start && !!end && start.getTime() - now <= WEEK && end.getTime() >= now;
}
// 홈에서의 자리(시안). below: 시간표 바로 아래 · bottom: 홈 맨 아래 · week: 달릴 수 있는 서킷의 경기 주간에만 시간표 아래, 그 밖에는 맨 아래
export function lapHomePlace(races, now, place = lapConfig().home) {
  if (place !== 'week') return place;
  return (races || []).some((r) => isThisWeek(r, now) && lapTrackOfRace(r)) ? 'below' : 'bottom';
}
