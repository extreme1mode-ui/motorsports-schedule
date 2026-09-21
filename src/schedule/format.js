// 날짜·시간 포매팅 단일 지점. 전부 Intl.DateTimeFormat 기반이고 locale / timeZone을 인자로 받는다.
// 지금은 호출부가 'ko' / 'Asia/Seoul'(기본값)을 쓴다. 언어·시간대는 다음 단계에서 인자로 흘려보낸다.
// 숫자(연·월·일·시·분)는 locale과 무관하게 ASCII 숫자로 뽑고, 요일·월 이름만 locale을 따른다.

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
// '09.26 (토)'
export function formatShortDate(value, opts) { const p = getParts(value, opts); return p ? `${p.month}.${p.day} (${p.weekdayName})` : ''; }
// '09.26 (토) 20:00'
export function formatShortDateTime(value, opts) { const p = getParts(value, opts); return p ? `${p.month}.${p.day} (${p.weekdayName}) ${p.hour}:${p.minute}` : ''; }

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
