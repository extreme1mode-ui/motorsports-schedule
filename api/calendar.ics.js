// 캘린더 구독(.ics) — Vercel Function.
//   구독:    GET /api/calendar.ics?series=F1,WEC&level=race&lang=ko&year=2026
//   한 경기: GET /api/calendar.ics?race=<경기 id>&lang=ko  → 30분 전 VALARM이 붙은 파일 하나
//
// 시각은 데이터의 startUtc를 UTC 그대로 쓴다. 시간대 변환도, VTIMEZONE 블록도 만들지 않는다.
// (구독자의 캘린더 앱이 자기 시간대로 보여준다.)
import season2026 from '../src/schedule/season-2026.json' with { type: 'json' };
import season2027 from '../src/schedule/season-2027.json' with { type: 'json' };
import { formatSessionLabel, getRaceLabels } from '../src/schedule/utils.js';

// 연도별 시즌 데이터. 없는 연도는 400으로 돌려준다 — 다른 연도를 조용히 내보내면 섞인 일정이 된다.
const SEASONS = { 2026: season2026, 2027: season2027 };
const SUPPORTED_SEASONS = Object.keys(SEASONS).map(Number).sort((a, b) => a - b);

const SERIES = ['F1', 'WEC', 'IMSA', 'WRC', 'GTWC'];
const LEVELS = ['all', 'race'];
const LANGS = ['ko', 'en'];
const UID_DOMAIN = 'paddock.app';          // 호스트가 바뀌어도 UID가 흔들리지 않게 고정값
const PRODID = '-//Paddock//Motorsport Schedule//KO';   // 연도를 넣지 않는다 — 한 코드가 여러 시즌을 낸다

const CALNAME = {
  ko: (year) => `Paddock · ${year} 모터스포츠`,
  en: (year) => `Paddock · ${year} Motorsport`,
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

function buildEvent(race, session, { finishAt, lang, labels, uid, dtstamp, alarm = false }) {
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
  const summary = sessionLabel ? `${title} — ${sessionLabel}` : title;
  lines.push(`SUMMARY:${escapeText(summary)}`);

  const location = [labels.circuit, labels.city].filter(Boolean).join(', ');
  if (location) lines.push(`LOCATION:${escapeText(location)}`);

  const channels = Array.isArray(race.broadcast) ? race.broadcast.filter((b) => b && b.name) : [];
  if (channels.length) {
    const head = lang === 'en' ? 'Where to watch' : '중계';
    const body = channels.map((b) => (b.url ? `${b.name} ${b.url}` : b.name)).join('\n');
    lines.push(`DESCRIPTION:${escapeText(`${head}\n${body}`)}`);
  }

  if (race.status === 'cancelled') lines.push('STATUS:CANCELLED');

  // 30분 전 알람. 단일 경기(내려받는 파일)에만 넣는다 — 구독 캘린더는 클라이언트마다 알람 처리가 달라
  // 기존 구독자의 동작을 바꾸면 안 된다.
  if (alarm) {
    lines.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(summary)}`, 'END:VALARM');
  }

  lines.push('END:VEVENT');
  return lines;
}

// 경기 id로 찾는다. 연도를 몰라도 되게 지원 시즌 전체를 본다.
export function findRace(raceId) {
  const id = String(raceId || '');
  if (!id) return null;
  for (const year of SUPPORTED_SEASONS) {
    const race = SEASONS[year].find((r) => r.id === id);
    if (race) return { race, year };
  }
  return null;
}

// 내려받는 파일 이름. 영문 이름 기준이라 locale과 무관하게 안전한 ASCII가 나온다.
function fileNameFor(race) {
  return `${slug(race.name) || slug(race.id) || 'race'}.ics`;
}

// ---------- 캘린더 본문 ----------

export function buildCalendar({ series = null, level = 'race', lang = 'ko', year = SUPPORTED_SEASONS[0], race: raceId = null } = {}) {
  // race가 오면 그 경기 하나만. 알람은 이 모드에서만 붙는다.
  const single = raceId ? findRace(raceId) : null;
  const season = single ? [single.race] : (SEASONS[Number(year)] || []);
  const wanted = single ? null : (series && series.length ? new Set(series) : null);
  const lines = [
    'BEGIN:VCALENDAR',
    `PRODID:${PRODID}`,
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(single ? (getRaceLabels(single.race, lang).shortName || single.race.name) : (CALNAME[lang] || CALNAME.ko)(year))}`,
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

      const event = buildEvent(race, session, { finishAt, lang, labels, uid, dtstamp, alarm: Boolean(single) });
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
  // year가 없으면 현재 연도. 잘못된 값이나 지원하지 않는 연도는 그대로 돌려 호출부가 400으로 처리한다.
  const rawYear = params.get('year');
  const year = Number(rawYear ?? new Date().getFullYear());
  // race=<id>면 단일 경기 모드. 없는 id는 호출부가 404로 처리한다 (조용히 전체 일정을 주면 안 된다).
  const race = params.get('race') || null;
  const found = race ? findRace(race) : null;
  return {
    series: series.length ? series : null, level, lang, race,
    raceFound: Boolean(found), raceName: found ? found.race.name : null,
    year, yearSupported: Number.isInteger(year) && Boolean(SEASONS[year]),
  };
}

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { series, level, lang, race, raceFound, year, yearSupported } = parseQuery(req.url || '/api/calendar.ics');

  if (race && !raceFound) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).send(`Race not found: ${race}`);
    return;
  }
  if (!race && !yearSupported) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(400).send(`Unsupported year: ${year}. Supported: ${SUPPORTED_SEASONS.join(', ')}`);
    return;
  }

  const body = buildCalendar({ series, level, lang, year, race });

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  // 단일 경기는 내려받아 캘린더 앱에서 여는 파일, 구독은 그대로 inline.
  res.setHeader('Content-Disposition', race
    ? `attachment; filename="${fileNameFor(findRace(race).race)}"`
    : 'inline; filename="paddock.ics"');
  res.status(200).send(req.method === 'HEAD' ? '' : body);
}
