// 날짜·시간 포매팅 단일 지점. 전부 Intl.DateTimeFormat 기반이고 locale / timeZone을 인자로 받는다.
// 지금은 호출부가 'ko' / 'Asia/Seoul'(기본값)을 쓴다. 언어·시간대는 다음 단계에서 인자로 흘려보낸다.
// 숫자(연·월·일·시·분)는 locale과 무관하게 ASCII 숫자로 뽑고, 요일·월 이름만 locale을 따른다.
import { t } from '../i18n/t.js';

export const DEFAULT_LOCALE = 'ko';
export const DEFAULT_TIME_ZONE = 'Asia/Seoul';
const DAY_MS = 24 * 60 * 60 * 1000;

const cache = new Map();
function dtf(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) { f = new Intl.DateTimeFormat(locale, options); cache.set(key, f); }
  return f;
}

// 숫자 파트는 en-CA(ISO 순서·ASCII 숫자) + h23으로 고정. 자정은 항상 00.
function numericParts(date, timeZone) {
  const parts = dtf('en-CA', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}

// Date | ISO 문자열 | ms → Date. 못 읽으면 null.
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 'YYYY-MM-DD' + 'HH:MM'을 timeZone의 벽시계 시각으로 해석해 Date로.
export function zonedDateFromKey(dateKey, time = '00:00', timeZone = DEFAULT_TIME_ZONE) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = (/^\d{2}:\d{2}$/.test(time || '') ? time : '00:00').split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const p = numericParts(new Date(guess), timeZone);
  const zoned = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(guess - (zoned - guess));
}

// ISO 문자열이 날짜키(길이 10)면 timeZone 자정으로, 아니면 그대로 Date로.
export function parseDateOrKey(value, timeZone = DEFAULT_TIME_ZONE) {
  if (typeof value === 'string' && value.length === 10) return zonedDateFromKey(value, '00:00', timeZone);
  return toDate(value);
}

// 이름 목록 — 하드코딩 대신 Intl에서.
export function getMonthNames(locale = DEFAULT_LOCALE, style = 'long') {
  return Array.from({ length: 12 }, (_, i) => dtf(locale, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i, 15))));
}
export function getWeekdayNames(locale = DEFAULT_LOCALE, style = 'short') {
  // 2026-03-01은 일요일 → 인덱스 0 = 일
  return Array.from({ length: 7 }, (_, i) => dtf(locale, { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 2, 1 + i))));
}

// 파트 분해: { year, month, day, hour, minute, second, weekday(0=일), weekdayName, monthName }
export function getParts(value, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const d = toDate(value);
  if (!d) return null;
  const p = numericParts(d, timeZone);
  const weekday = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return {
    year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second, weekday,
    weekdayName: dtf(locale, { weekday: 'short', timeZone }).format(d),
    monthName: dtf(locale, { month: 'long', timeZone }).format(d),
    monthShort: dtf(locale, { month: 'short', timeZone }).format(d),
  };
}

// ---------- 문자열 포매터 ----------
// 'YYYY-MM-DD'
export function formatDateKey(value, opts) { const p = getParts(value, opts); return p ? `${p.year}-${p.month}-${p.day}` : ''; }
// 'HH:MM'
export function formatTime(value, opts) { const p = getParts(value, opts); return p ? `${p.hour}:${p.minute}` : ''; }
// 'YYYY-MM-DD HH:MM'
export function formatDateTimeKey(value, opts) { const p = getParts(value, opts); return p ? `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` : ''; }
// '9월 26일' (ko) / 'September 26' (en) — 월·일 이름은 locale 관용 순서를 따른다
export function formatMonthDay(value, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const d = toDate(value); return d ? dtf(locale, { month: 'long', day: 'numeric', timeZone }).format(d) : '';
}
// '2026.09.26 (토)'
export function formatDateFull(value, opts) { const p = getParts(value, opts); return p ? `${p.year}.${p.month}.${p.day} (${p.weekdayName})` : ''; }
// 짧은 월·일: ko '09.26' / 그 외 'Sep 26'. 숫자 월.일 표기는 한국식이라 영어에서는 월 이름을 쓴다.
function monthDayOf(p, locale) { return locale === 'ko' ? `${p.month}.${p.day}` : `${p.monthShort} ${Number(p.day)}`; }
function shortDateOf(p, locale) { return `${monthDayOf(p, locale)} (${p.weekdayName})`; }
export function formatMonthDayShort(value, opts = {}) { const p = getParts(value, opts); return p ? monthDayOf(p, opts.locale ?? DEFAULT_LOCALE) : ''; }
export function formatShortDate(value, opts = {}) { const p = getParts(value, opts); return p ? shortDateOf(p, opts.locale ?? DEFAULT_LOCALE) : ''; }
// '09.26 (토) 20:00' / 'Sep 26 (Sat) 20:00'
export function formatShortDateTime(value, opts = {}) { const p = getParts(value, opts); return p ? `${shortDateOf(p, opts.locale ?? DEFAULT_LOCALE)} ${p.hour}:${p.minute}` : ''; }

// ---------- 숫자만 돌려주는 계산 (단위 표기는 호출부) ----------
// 카운트다운: { hours, minutes, seconds }. 음수는 0.
export function getCountdownParts(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}
// timeZone 기준 날짜 차이(일). now → date가 미래면 양수. 못 읽으면 null.
export function getDayDifference(value, now = new Date(), { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const a = getParts(value, { timeZone }); const b = getParts(now, { timeZone });
  if (!a || !b) return null;
  const key = (p) => Date.UTC(+p.year, +p.month - 1, +p.day);
  return Math.round((key(a) - key(b)) / DAY_MS);
}

// ---------- 이벤트 고유 날짜(서킷 현지 날짜키) — 시간대 변환 없이 표시 ----------
// weekendStart/weekendEnd 같은 'YYYY-MM-DD'는 "그 날짜"라는 사실이므로 보는 사람의 시간대와 무관하게 그대로 보여준다.
export function getPlainDateParts(dateKey, { locale = DEFAULT_LOCALE } = {}) {
  const d = zonedDateFromKey(dateKey, '12:00', 'UTC');
  return d ? getParts(d, { locale, timeZone: 'UTC' }) : null;
}
// '2026.06.13 (토)'
export function formatPlainDateFull(dateKey, opts) { const p = getPlainDateParts(dateKey, opts); return p ? `${p.year}.${p.month}.${p.day} (${p.weekdayName})` : ''; }
// '06.13 (토)' / 'Jun 13 (Sat)'
export function formatPlainShortDate(dateKey, opts = {}) { const p = getPlainDateParts(dateKey, opts); return p ? shortDateOf(p, opts.locale ?? DEFAULT_LOCALE) : ''; }
// '06.13' / 'Jun 13'
export function formatPlainMonthDayNumeric(dateKey, opts = {}) { const p = getPlainDateParts(dateKey, opts); return p ? monthDayOf(p, opts.locale ?? DEFAULT_LOCALE) : ''; }

// ---------- 시간대 이름 ----------
// Intl의 shortGeneric('대한민국 시간', 'PT' …)을 쓰고, 'GMT+9' 같은 오프셋 표기로 떨어지면 IANA 마지막 구간('Asia/Seoul' → 'Seoul')으로.
export function getTimeZoneLabel(timeZone = DEFAULT_TIME_ZONE, locale = DEFAULT_LOCALE) {
  let name;
  try {
    name = dtf(locale, { timeZone, timeZoneName: 'shortGeneric' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
  } catch { name = ''; }
  if (!name || /GMT|UTC/i.test(name)) name = String(timeZone).split('/').pop().replace(/_/g, ' ');
  return name;
}

// ---------- UX v2 표기 (문구는 i18n 'format.*'·'time.*'·'day.head.*') ----------
// 시각은 위 formatTime 그대로 24시간제 '02:00'(ko·en 같음). 새벽·오전·오후 같은 때 이름은 쓰지 않는다.
// 날짜 ko '11월 9일 (월)' / en 'Mon, Nov 9'. 상대 표기는 보는 사람 시간대의 날짜 차이로 센다.
// 범위·라운드의 대시 뒤에는 단어 결합자(U+2060)를 넣어 대시 뒤에서 줄이 갈리지 않게 한다(문구 값은 그대로 두고 변수 앞에 붙인다).
const WJ = '⁠';
const MIN_MS = 60 * 1000;
const HOUR_MS = 60 * MIN_MS;

function dayVars(p, locale) {
  return {
    m: Number(p.month), d: Number(p.day), y: p.year,
    dow: p.weekdayName,
    mon: locale === 'ko' ? String(Number(p.month)) : p.monthShort,
  };
}
// '11월 9일 (월)' / 'Mon, Nov 9'. dow: false면 '11월 9일' / 'Nov 9'
export function formatDayDate(value, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, dow = true } = {}) {
  const p = getParts(value, { locale, timeZone });
  return p ? t(locale, dow ? 'format.date' : 'format.dateNoDow', dayVars(p, locale)) : '';
}
// '11월 9일 (월) 02:00' / 'Mon, Nov 9, 02:00'
export function formatDayDateTime(value, opts = {}) {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const date = formatDayDate(value, opts);
  return date ? t(locale, 'format.dateTime', { date, time: formatTime(value, opts) }) : '';
}
function rangeOf(pa, pb, locale) {
  const a = dayVars(pa, locale); const b = dayVars(pb, locale);
  if (pa.year === pb.year && pa.month === pb.month) {
    if (pa.day === pb.day) return t(locale, 'format.dateNoDow', a);
    return t(locale, 'format.range', { m: a.m, mon: a.mon, a: a.d, b: `${WJ}${b.d}` });
  }
  return t(locale, 'format.rangeCross', { m: a.m, mon: a.mon, a: a.d, m2: `${WJ}${b.m}`, mon2: `${WJ}${b.mon}`, b: b.d });
}
// 날짜 범위 '11월 7일–9일' / 'Nov 7–9' (보는 사람 시간대)
export function formatDayRange(from, to, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const pa = getParts(from, { locale, timeZone }); const pb = getParts(to ?? from, { locale, timeZone });
  return pa && pb ? rangeOf(pa, pb, locale) : '';
}
// 서킷 현지 날짜키 범위('2026-11-06'~'2026-11-08') — 시간대 변환 없이 그 날짜 그대로
export function formatPlainDayRange(fromKey, toKey, { locale = DEFAULT_LOCALE } = {}) {
  const pa = getPlainDateParts(fromKey, { locale }); const pb = getPlainDateParts(toKey ?? fromKey, { locale });
  return pa && pb ? rangeOf(pa, pb, locale) : '';
}
// 달력 머리 '2026년 11월' / 'November 2026'
export function formatMonthTitle(value, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const p = getParts(value, { locale, timeZone });
  return p ? t(locale, 'format.month', { y: p.year, m: Number(p.month), monthName: p.monthName }) : '';
}

// 상대 날짜: 오늘·내일·모레·어제, 14일 미만 'N일 뒤/전', 이상 'N주 뒤/전'(내림). inline이면 문장 안 꼴(en 소문자).
export function formatRelDay(value, now = new Date(), { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, inline = false } = {}) {
  const n = getDayDifference(value, now, { timeZone });
  if (n === null) return '';
  const word = (key) => t(locale, inline ? `${key}.inline` : key);
  if (n === 0) return word('time.today');
  if (n === 1) return word('time.tomorrow');
  if (n === 2) return word('time.dayAfter');
  if (n === -1) return t(locale, 'time.yesterday');
  if (n > 0) return n < 14 ? t(locale, 'time.inDays', { n }) : t(locale, 'time.inWeeks', { n: Math.floor(n / 7) });
  return -n < 14 ? t(locale, 'time.daysAgo', { n: -n }) : t(locale, 'time.weeksAgo', { n: Math.floor(-n / 7) });
}
// 짧은 상대 시각: 1시간 미만 'N분 뒤'(최소 1분), 12시간 미만 'N시간 뒤'(반올림), 그 밖은 formatRelDay
export function formatRelShort(value, now = new Date(), opts = {}) {
  const d = toDate(value); const at = toDate(now);
  if (!d || !at) return '';
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const diff = d.getTime() - at.getTime();
  if (diff > 0 && diff < HOUR_MS) return t(locale, 'time.inMinutes', { m: Math.max(1, Math.round(diff / MIN_MS)) });
  if (diff > 0 && diff < 12 * HOUR_MS) return t(locale, 'time.inHours', { h: Math.round(diff / HOUR_MS) });
  return formatRelDay(d, at, opts);
}
// 제목 문장의 날 자리: ko 오늘·내일·모레 또는 '토요일' / en Today·Tomorrow 또는 'Saturday'
export function formatDayWord(value, now = new Date(), { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const n = getDayDifference(value, now, { timeZone });
  if (n === 0) return t(locale, 'time.today');
  if (n === 1) return t(locale, 'time.tomorrow');
  if (n === 2 && locale === 'ko') return t(locale, 'time.dayAfter');
  const d = toDate(value);
  return d ? dtf(locale, { weekday: 'long', timeZone }).format(d) : '';
}
// 시간표 날짜 머리: { main: '오늘 · 토요일' | '토요일', sub: '11월 7일' }
export function formatDayHead(value, now = new Date(), { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const d = toDate(value);
  if (!d) return { main: '', sub: '' };
  const weekday = dtf(locale, { weekday: 'long', timeZone }).format(d);
  const n = getDayDifference(d, now, { timeZone });
  const key = n === 0 ? 'day.head.today' : n === 1 ? 'day.head.tomorrow' : n === -1 ? 'day.head.yesterday' : null;
  return { main: key ? t(locale, key, { weekday }) : weekday, sub: formatDayDate(d, { locale, timeZone, dow: false }) };
}
// 길이 '2시간 10분' / '2 h 10 min'. 1분 미만은 1분.
export function formatDurationText(ms, { locale = DEFAULT_LOCALE } = {}) {
  const total = Math.max(1, Math.round((ms || 0) / MIN_MS));
  const h = Math.floor(total / 60); const m = total % 60;
  if (!h) return t(locale, 'time.dur.m', { m });
  return m ? t(locale, 'time.dur.hm', { h, m }) : t(locale, 'time.dur.h', { h });
}
// 경과 '2시간 10분 지났어요' / '2 h 10 min in'
export function formatElapsed(start, now = new Date(), { locale = DEFAULT_LOCALE } = {}) {
  const a = toDate(start); const b = toDate(now);
  if (!a || !b) return '';
  return t(locale, 'time.elapsed', { d: formatDurationText(b.getTime() - a.getTime(), { locale }) });
}
