// 주간 카드가 쓰는 데이터. 시즌 JSON의 정적 값만 본다 — 앱의 OpenF1 실시간 값은 쓰지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatSessionLabel, getVisibleBroadcast } from '../../src/schedule/utils.js';
import { getHighlights, getHighlightNote } from '../../src/schedule/highlights.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const SERIES_COLOR = {
  F1: '#E10600', WEC: '#2E7DFF', IMSA: '#14D19B', WRC: '#FF8A00', GTWC: '#A77BFF',
};

const read = (file) => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/schedule', file), 'utf8'));
  return Array.isArray(raw) ? raw : (raw.races || Object.values(raw).find(Array.isArray) || []);
};
export const ALL_RACES = [...read('season-2026.json'), ...read('season-2027.json')];

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
export const raceName = (race, locale) => (locale === 'ko' ? (text(race.nameKo) || text(race.name)) : (text(race.name) || text(race.nameKo)));

// 서킷과 도시가 같은 값이면 한 번만 쓴다 (WRC는 '도요타, 도요타'처럼 같은 값이 들어온다).
export function placeOf(race, locale) {
  const circuit = locale === 'ko' ? (text(race.circuitKo) || text(race.circuit)) : (text(race.circuit) || text(race.circuitKo));
  const city = locale === 'ko' ? (text(race.cityKo) || text(race.city)) : (text(race.city) || text(race.cityKo));
  if (circuit && city && circuit === city) return circuit;
  return [circuit, city].filter(Boolean).join(' · ');
}

const sessionsOf = (race) => (Array.isArray(race.sessions) ? race.sessions : []);
export const raceSessions = (race) => sessionsOf(race).filter((s) => s && s.kind === 'race' && s.startUtc);
export const firstRaceSession = (race) => raceSessions(race)[0] || null;

// 'YYYY-MM-DD HH:mm'(kst) → { date, time }. 시간대 변환을 하지 않는다.
export function parseKst(kst) {
  const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/.exec(kst || '');
  return m ? { y: +m[1], mo: +m[2], d: +m[3], time: m[4] } : null;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// KO: kst 문자열 그대로. EN: startUtc를 주어진 시간대로.
export function sessionWhen(session, locale, tz) {
  if (locale === 'ko') {
    const k = parseKst(session.kst);
    if (!k) return null;
    const wd = WEEKDAY_KO[new Date(Date.UTC(k.y, k.mo - 1, k.d)).getUTCDay()];
    return `${pad(k.mo)}.${pad(k.d)} (${wd}) ${k.time}`;
  }
  const p = zonedParts(session.startUtc, tz);
  if (!p) return null;
  return `${p.month}.${p.day} (${p.weekday}) ${p.hour}:${p.minute}`;
}

export function zonedParts(iso, timeZone) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour === '24' ? '00' : parts.hour, minute: parts.minute, weekday: parts.weekday };
}

// 시간대 약칭(EN 카드의 'All times …'). 못 구하면 IANA 이름을 그대로 쓴다.
export function zoneLabel(timeZone) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
    return part?.value || timeZone;
  } catch { return timeZone; }
}

// 카드에 넣을 세션: race 전부(최대 2) + 첫 qualifying 1개, 시각순.
export function cardSessions(race) {
  const list = [...raceSessions(race)].slice(0, 2);
  const qual = sessionsOf(race).find((s) => s && s.kind === 'qualifying' && s.startUtc);
  if (qual) list.push(qual);
  return list.sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));
}

export const sessionLabel = (session, locale) => formatSessionLabel(session.t, session.kind, locale);

// 중계 한 줄. KO는 한국 기준, EN은 글로벌 기준.
export function broadcastLine(race, locale) {
  const list = getVisibleBroadcast(race.broadcast || [], locale === 'ko' ? 'KR' : null);
  const first = list.find((b) => b && b.name);
  if (!first) return null;
  const free = first.access === 'free';
  const tag = locale === 'ko' ? (free ? '무료' : '유료') : (free ? 'Free' : 'Paid');
  return `${first.name} · ${tag}`;
}

export function highlightLine(race, locale) {
  const h = getHighlights(race)[0];
  if (!h) return null;
  return getHighlightNote(h, locale) || null;
}

// 기간 안의 경기. race 세션의 kst 날짜가 기간 안이면 포함, race 세션이 없으면 주말 구간이 겹치면 포함.
export function racesInRange(from, to) {
  const picked = [];
  for (const race of ALL_RACES) {
    const first = firstRaceSession(race);
    if (first) {
      const k = parseKst(first.kst);
      const key = k ? `${k.y}-${pad(k.mo)}-${pad(k.d)}` : null;
      if (key && key >= from && key <= to) picked.push(race);
      continue;
    }
    const ws = race.weekendStart; const we = race.weekendEnd || race.weekendStart;
    if (ws && we && ws <= to && we >= from) picked.push(race);
  }
  const at = (r) => { const s = firstRaceSession(r); return s ? new Date(s.startUtc).getTime() : new Date(`${r.weekendStart}T00:00:00Z`).getTime(); };
  return picked.sort((a, b) => at(a) - at(b));
}

// 한국 날짜 기준 기본 기간: 다가오는 목요일 ~ 그다음 월요일. 오늘이 목~일이면 이번 주 목~월.
export function defaultRange(now = new Date()) {
  const p = zonedParts(now.toISOString(), 'Asia/Seoul');
  const base = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  const dow = new Date(base).getUTCDay();              // 0=일 … 4=목
  const back = dow >= 4 ? dow - 4 : (dow === 0 ? 3 : dow + 3);   // 일요일은 지난 목요일(3일 전)
  const thu = base - back * 86400000;
  const key = (ms) => new Date(ms).toISOString().slice(0, 10);
  return { from: key(thu), to: key(thu + 4 * 86400000) };        // 목 → 월
}

export function rangeLabel(from, to, locale) {
  const fmt = (key) => {
    const [y, mo, d] = key.split('-').map(Number);
    const wd = (locale === 'ko' ? WEEKDAY_KO : WEEKDAY_EN)[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
    return `${pad(mo)}.${pad(d)} (${wd})`;
  };
  return `${fmt(from)} – ${fmt(to)}`;
}
