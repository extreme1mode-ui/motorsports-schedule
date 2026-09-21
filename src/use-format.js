// useFormat(): 사용자 시간대·언어·국가 기준 포매터 묶음 (FormatProvider 값에서 파생).
import { useContext, useMemo } from 'react';
import { FormatContext } from './format-context.jsx';
import { getRaceLabels, formatSessionLabel, getVisibleBroadcast } from './schedule/utils.js';
import {
  getParts, formatDateKey, formatDateTimeKey, formatTime, formatShortDate, formatShortDateTime,
  formatMonthDay, formatDateFull, getDayDifference, getMonthNames, getWeekdayNames, getTimeZoneLabel,
  formatPlainDateFull, formatPlainShortDate, formatPlainMonthDayNumeric, getPlainDateParts,
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
      shortDate: (v) => formatShortDate(v, o),             // '09.26 (토)'
      shortDateTime: (v) => formatShortDateTime(v, o),     // '09.26 (토) 20:00'
      monthDay: (v) => formatMonthDay(v, o),               // '9월 26일'
      dateFull: (v) => formatDateFull(v, o),               // '2026.09.26 (토)'
      dayDiff: (v, now) => getDayDifference(v, now, o),    // 정수 (미래 양수)
      isNight: (v) => { const p = getParts(v, o); return !!p && Number(p.hour) < 6; },   // 00:00~05:59
      plainParts: (key) => getPlainDateParts(key, o),
      plainDateFull: (key) => formatPlainDateFull(key, o),       // 서킷 현지 날짜키 그대로
      plainShortDate: (key) => formatPlainShortDate(key, o),
      plainMonthDay: (key) => formatPlainMonthDayNumeric(key, o),
    };
  }, [locale, timeZone, country]);
}
