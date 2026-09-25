// 알림 = 그 경기 하나짜리 .ics를 내려받아 OS 캘린더에 담는 것(각 세션에 30분 전 VALARM).
// localStorage는 "이미 담았다"는 표시용으로만 쓴다 — 캘린더에 들어간 뒤에 우리가 지울 수는 없다.
//
// 히어로와 상세가 이 함수 하나, storage.alerts 하나를 같이 쓴다. 한쪽에서 담으면 다른 쪽도
// 바로 '담음'이 되어야 해서, 같은 탭 구독자에게는 직접 알리고(listeners) 다른 탭은 storage 이벤트로 받는다.
import { useEffect, useState } from 'react';
import { storage } from './storage/index.js';
import { track } from './analytics.js';

const listeners = new Set();

export function readAlarms() {
  return storage.alerts.read();
}

function publish(next) {
  storage.alerts.write(next);
  for (const notify of listeners) notify(next);
}

// 담긴 세션 범위는 그 시리즈의 관심 수준을 따른다. 'all'이면 연습·예선까지, 그 외에는 결승(과 체커기)만.
// 이걸 빼먹으면 API 기본값이 'race'라 '전체 세션'으로 둔 사용자에게도 결승만 담긴다.
export function alarmLevelFor(preferences, series) {
  return preferences?.series?.[series] === 'all' ? 'all' : 'race';
}

export function calendarUrlFor(race, { locale = 'ko', level = 'race' } = {}) {
  // OpenF1 경로의 F1은 id가 meeting_key 기반이라 정적 데이터에 없다 — 매칭된 정적 id를 쓴다.
  const calendarId = race?.staticId || race?.id;
  if (!calendarId) return null;
  return `/api/calendar.ics?race=${encodeURIComponent(calendarId)}&level=${level}&lang=${locale}`;
}

// ev: 홈이 쓰는 adapt된 형태({ id, series, startUtc, race }) 또는 정규화된 race 그대로.
// 이미 담긴 경기를 다시 누르면 표시만 지운다(캘린더는 건드리지 않는다).
export function toggleAlarm(ev, { source, preferences, locale = 'ko', now = new Date() } = {}) {
  const id = ev?.id;
  if (!id) return null;
  const current = readAlarms();
  const already = current.has(id);
  const next = new Set(current);

  if (already) {
    next.delete(id);
  } else {
    const startUtc = ev.startUtc || ev.primaryStartUtc || null;
    const start = startUtc ? new Date(startUtc) : null;
    const daysUntil = start ? Math.round((start.getTime() - now.getTime()) / 86400000) : null;
    track('race_alarm_added', { series: ev.series, race_id: id, source, ...(daysUntil === null ? {} : { days_until: daysUntil }) });
    const url = calendarUrlFor(ev.race || ev, { locale, level: alarmLevelFor(preferences, ev.series) });
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    next.add(id);
  }

  publish(next);
  return next;
}

// 현재 담긴 경기 id 집합. 같은 탭의 다른 화면이 담으면 즉시 다시 그려진다.
export function useAlarms() {
  const [alarms, setAlarms] = useState(readAlarms);
  useEffect(() => {
    const notify = (next) => setAlarms(next);
    listeners.add(notify);
    const onStorage = () => setAlarms(readAlarms());   // 다른 탭에서 바뀐 경우
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(notify); window.removeEventListener('storage', onStorage); };
  }, []);
  return alarms;
}
