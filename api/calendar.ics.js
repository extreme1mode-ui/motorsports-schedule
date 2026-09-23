// 캘린더 구독(.ics) — Vercel Function. GET /api/calendar.ics?series=F1,WEC&level=race&lang=ko
//
// 시각은 데이터의 startUtc를 UTC 그대로 쓴다. 시간대 변환도, VTIMEZONE 블록도 만들지 않는다.
// (구독자의 캘린더 앱이 자기 시간대로 보여준다.)
import season from '../src/schedule/season-2026.json' with { type: 'json' };
import { formatSessionLabel, getRaceLabels } from '../src/schedule/utils.js';

const SERIES = ['F1', 'WEC', 'IMSA', 'WRC', 'GTWC'];
const LEVELS = ['all', 'race'];
const LANGS = ['ko', 'en'];
const UID_DOMAIN = 'paddock.app';          // 호스트가 바뀌어도 UID가 흔들리지 않게 고정값
const PRODID = '-//Paddock//2026 Motorsport Schedule//KO';

const CALNAME = {
  ko: 'Paddock · 2026 모터스포츠',
  en: 'Paddock · 2026 Motorsport',
};

// 세션 기본 길이. 종료 시각이 데이터에 없을 때만 쓴다.
const DURATION_BY_KIND = {
  practice: 'PT1H',
  qualifying: 'PT1H',
  sprint: 'PT1H',
  finish: 'PT1H',
  other: 'PT1H',
};
const DEFAULT_RACE_DURATION = 'PT2H';

// ---------- iCalendar 원시 포맷 ----------

// TEXT 값 이스케이프 (RFC 5545 3.3.11). 순서 중요: 백슬래시를 먼저.
function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

const encoder = new TextEncoder();

// 75옥텟(UTF-8 바이트) 폴딩. 이어지는 줄은 공백 한 칸으로 시작한다. 멀티바이트 문자를 쪼개지 않는다.
function fold(line) {
  const bytesOf = (s) => encoder.encode(s).length;
  if (bytesOf(line) <= 75) return line;
  const out = [];
  let current = '';
  let limit = 75;                 // 이어지는 줄은 선행 공백 1바이트를 쓰므로 74바이트만 담는다
  for (const char of line) {      // 코드포인트 단위 (서로게이트 쌍 보존)
    if (bytesOf(current) + bytesOf(char) > limit) {
      out.push(current);
      current = char;
      limit = 74;
    } else {
      current += char;
    }
  }
  if (current) out.push(current);
  return out[0] + out.slice(1).map((part) => `\r\n ${part}`).join('');
}

// '2026-03-08T04:00:00.000Z' → '20260308T040000Z'
function toIcsUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// UID에 쓰는 안정적인 슬러그. 데이터의 세션 라벨에서 만든다(시각이 바뀌어도 UID가 유지되도록).
function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'session';
}

// ---------- 본경기 길이 ----------

// 내구 경기는 이름에 적힌 시간을 쓴다 ('24 Hours of Le Mans', '후지 6시간', '스파 24시').
function raceDurationFromName(race) {
  const en = typeof race?.name === 'string' ? race.name : '';
  const ko = typeof race?.nameKo === 'string' ? race.nameKo : '';
  const hours = en.match(/(\d{1,2})\s*Hours?\b/i) || ko.match(/(\d{1,2})\s*시간?\b/);
  const n = hours ? Number(hours[1]) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 24 ? `PT${n}H` : null;
}

// ---------- VEVENT ----------

function buildEvent(race, session, { finishAt, lang, labels, uid, dtstamp }) {
  const start = toIcsUtc(session.startUtc);
  if (!start) return null;

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
  ];

  // 종료 시각이 데이터에 있으면 DTEND, 없으면 DURATION. 둘 다 쓰지 않는다.
  const startMs = new Date(session.startUtc).getTime();
  const useEnd = session.kind === 'race' && finishAt && new Date(finishAt).getTime() > startMs;
  if (useEnd) {
    lines.push(`DTEND:${toIcsUtc(finishAt)}`);
  } else if (session.kind === 'race') {
    lines.push(`DURATION:${raceDurationFromName(race) || DEFAULT_RACE_DURATION}`);
  } else {
    lines.push(`DURATION:${DURATION_BY_KIND[session.kind] || 'PT1H'}`);
  }

  const sessionLabel = formatSessionLabel(session.t, session.kind, lang);
  const title = [race.series, labels.shortName].filter(Boolean).join(' ');
  lines.push(`SUMMARY:${escapeText(sessionLabel ? `${title} — ${sessionLabel}` : title)}`);

  const location = [labels.circuit, labels.city].filter(Boolean).join(', ');
  if (location) lines.push(`LOCATION:${escapeText(location)}`);

  const channels = Array.isArray(race.broadcast) ? race.broadcast.filter((b) => b && b.name) : [];
  if (channels.length) {
    const head = lang === 'en' ? 'Where to watch' : '중계';
    const body = channels.map((b) => (b.url ? `${b.name} ${b.url}` : b.name)).join('\n');
    lines.push(`DESCRIPTION:${escapeText(`${head}\n${body}`)}`);
  }

  if (race.status === 'cancelled') lines.push('STATUS:CANCELLED');
  lines.push('END:VEVENT');
  return lines;
}

// ---------- 캘린더 본문 ----------

export function buildCalendar({ series = null, level = 'race', lang = 'ko' } = {}) {
  const wanted = series && series.length ? new Set(series) : null;
  const lines = [
    'BEGIN:VCALENDAR',
    `PRODID:${PRODID}`,
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(CALNAME[lang] || CALNAME.ko)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];

  for (const race of season) {
    if (wanted && !wanted.has(race.series)) continue;
    const sessions = Array.isArray(race.sessions) ? race.sessions : [];
    if (!sessions.length) continue;

    const labels = getRaceLabels(race, lang);
    // 내구 경기의 종료 시각. 데이터가 'finish' 세션으로 들고 있다.
    const finishAt = sessions.find((s) => s.kind === 'finish' && s.startUtc)?.startUtc || null;
    // 데이터 갱신일을 DTSTAMP로 쓴다 — 매 요청마다 바뀌지 않아야 응답이 결정적이고 캐시가 산다.
    const dtstamp = toIcsUtc(race.verifiedAt) || toIcsUtc(race.weekendStart) || '20260101T000000Z';

    const used = new Map();   // 같은 라벨이 반복되는 세션(Pit Walk 등)을 UID에서 구분
    for (const session of sessions) {
      if (!session || !session.startUtc) continue;
      if (level === 'race' && session.kind !== 'race' && session.kind !== 'finish') continue;

      const base = `${race.id}-${slug(session.t)}`;
      const seen = used.get(base) || 0;
      used.set(base, seen + 1);
      const uid = `${seen ? `${base}-${seen + 1}` : base}@${UID_DOMAIN}`;

      const event = buildEvent(race, session, { finishAt, lang, labels, uid, dtstamp });
      if (event) lines.push(...event);
    }
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// 쿼리 파싱. 잘못된 값은 기본값으로 떨어뜨린다 (구독 URL이 조용히 깨지지 않게).
export function parseQuery(url) {
  const params = new URL(url, 'http://localhost').searchParams;
  const rawSeries = (params.get('series') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const series = rawSeries.filter((s) => SERIES.includes(s));
  const level = LEVELS.includes(params.get('level')) ? params.get('level') : 'race';
  const lang = LANGS.includes(params.get('lang')) ? params.get('lang') : 'ko';
  return { series: series.length ? series : null, level, lang };
}

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { series, level, lang } = parseQuery(req.url || '/api/calendar.ics');
  const body = buildCalendar({ series, level, lang });

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.setHeader('Content-Disposition', 'inline; filename="paddock.ics"');
  res.status(200).send(req.method === 'HEAD' ? '' : body);
}
