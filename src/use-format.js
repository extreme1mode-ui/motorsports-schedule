// useFormat(): 사용자 시간대·언어·국가 기준 포매터 묶음 (FormatProvider 값에서 파생).
import { useContext, useMemo } from 'react';
import { FormatContext } from './format-context.jsx';
import { getRaceLabels, formatSessionLabel, getVisibleBroadcast } from './schedule/utils.js';
import {
  getParts, formatDateKey, formatDateTimeKey, formatTime, formatShortDate, formatShortDateTime, formatMonthDayShort,
  formatMonthDay, formatDateFull, getDayDifference, getMonthNames, getWeekdayNames, getTimeZoneLabel,
  formatPlainDateFull, formatPlainShortDate, formatPlainMonthDayNumeric, getPlainDateParts,
  formatDayDate, formatDayDateTime, formatDayRange, formatPlainDayRange, formatMonthTitle,
  formatRelDay, formatRelShort, formatDayWord, formatDayHead, formatDurationText, formatElapsed,
} from './schedule/format.js';

// 시청자 기준(사용자 시간대) 포매터 묶음. 이벤트 고유 날짜(plain*)는 시간대 변환 없이 그대로.
export function useFormat() {
  const { locale, timeZone, country } = useContext(FormatContext);
  return useMemo(() => {
    const o = { locale, timeZone };
    return {
      locale, timeZone, country,
      // 언어별 표시명 / 세션 라벨 / 국가별 중계처 — 전부 렌더 시점에
      race: (r) => getRaceLabels(r, locale),                              // { name, fullName, shortName, circuit, city, country }
      sessionLabel: (s) => formatSessionLabel(s?.tEn ?? s?.t, s?.kind, locale),
      broadcast: (list) => getVisibleBroadcast(list, country),         // [{ name, region }]
      zoneLabel: getTimeZoneLabel(timeZone, locale),
      monthNames: getMonthNames(locale),
      weekdayNames: getWeekdayNames(locale),
      parts: (v) => getParts(v, o),                        // { year, month, day, hour, minute, weekday, weekdayName, monthName }
      dateKey: (v) => formatDateKey(v, o),                 // 'YYYY-MM-DD' (사용자 시간대의 날짜)
      time: (v) => formatTime(v, o),                       // '20:00'
      dateTimeKey: (v) => formatDateTimeKey(v, o),         // '2026-09-26 20:00'
      monthDayShort: (v) => formatMonthDayShort(v, o),     // '09.26' / en 'Sep 26'
      shortDate: (v) => formatShortDate(v, o),             // '09.26 (토)' / en 'Sep 26 (Sat)'
      shortDateTime: (v) => formatShortDateTime(v, o),     // '09.26 (토) 20:00' / en 'Sep 26 (Sat) 20:00'
      monthDay: (v) => formatMonthDay(v, o),               // '9월 26일'
      dateFull: (v) => formatDateFull(v, o),               // '2026.09.26 (토)'
      dayDiff: (v, now) => getDayDifference(v, now, o),    // 정수 (미래 양수)
      isNight: (v) => { const p = getParts(v, o); return !!p && Number(p.hour) < 6; },   // 00:00~05:59
      plainParts: (key) => getPlainDateParts(key, o),
      plainDateFull: (key) => formatPlainDateFull(key, o),       // 서킷 현지 날짜키 그대로
      plainShortDate: (key) => formatPlainShortDate(key, o),
      plainMonthDay: (key) => formatPlainMonthDayNumeric(key, o),   // '06.13' / en 'Jun 13'
      // UX v2 표기 (format.js 'format.*'·'time.*' 문구)
      dayDate: (v) => formatDayDate(v, o),                 // '11월 9일 (월)' / en 'Mon, Nov 9'
      dayDateNoDow: (v) => formatDayDate(v, { ...o, dow: false }),   // '11월 9일' / en 'Nov 9'
      dayDateTime: (v) => formatDayDateTime(v, o),         // '11월 9일 (월) 02:00' / en 'Mon, Nov 9, 02:00'
      dayRange: (a, b) => formatDayRange(a, b, o),         // '11월 7일–⁠9일' / en 'Nov 7–⁠9'
      plainDayRange: (a, b) => formatPlainDayRange(a, b, o),   // 서킷 현지 날짜키 범위
      monthTitle: (v) => formatMonthTitle(v, o),           // '2026년 11월' / en 'November 2026'
      relDay: (v, now, inline) => formatRelDay(v, now, { ...o, inline }),   // '내일' · '6일 뒤' · '2주 뒤'
      relShort: (v, now) => formatRelShort(v, now, o),     // '40분 뒤' · '3시간 뒤', 그 밖은 relDay
      dayWord: (v, now) => formatDayWord(v, now, o),       // 제목 문장의 날: '오늘' · '토요일'
      dayHead: (v, now) => formatDayHead(v, now, o),       // { main: '오늘 · 토요일', sub: '11월 7일' }
      duration: (ms) => formatDurationText(ms, o),         // '2시간 10분'
      elapsed: (from, now) => formatElapsed(from, now, o), // '2시간 10분 지났어요'
    };
  }, [locale, timeZone, country]);
}
