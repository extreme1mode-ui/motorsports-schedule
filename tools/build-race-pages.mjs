// 경기별 공유 페이지를 만든다 (vite build 뒤에 돈다).
//
// 링크 미리보기를 만드는 봇은 JS를 실행하지 않는다. 그래서 경기마다 메타 태그가 박힌 HTML이 있어야
// 카카오톡·X·레딧·인스타그램에서 경기 이름과 한국 시간이 보인다. 앱 자체는 dist/index.html과 같다
// (같은 번들을 받아 주소를 보고 상세를 연다).
//
// 값은 시즌 JSON에 있는 것만 쓴다. 없는 필드는 그 조각을 빼고 만든다 — 추측해서 채우지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatSessionLabel } from '../src/schedule/utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ORIGIN = 'https://www.gantryracing.com';

const SEASONS = ['season-2026.json', 'season-2027.json'].map((file) => {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'src/schedule', file), 'utf8'));
  return Array.isArray(raw) ? raw : (raw.races || Object.values(raw).find(Array.isArray) || []);
});

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
// 'YYYY-MM-DD' → 'M월 D일(요일)'. 날짜 문자열 그대로 UTC로 계산한다(시간대 변환 없음).
function monthDayKo(dateKey, withWeekday) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey || '');
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const label = `${mo}월 ${d}일`;
  if (!withWeekday) return label;
  return `${label}(${WEEKDAY_KO[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]})`;
}

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const nameOf = (r) => text(r.nameKo) || text(r.name);
const circuitOf = (r) => text(r.circuitKo) || text(r.circuit);
const cityOf = (r) => text(r.cityKo) || text(r.city);
const seasonYearOf = (r) => (/^\d{4}$/.test(String(r.season)) ? String(r.season)
  : (/(\d{4})/.exec(r.weekendStart || r.raceDateLocal || r.id || '')?.[1] || null));

function titleFor(race) {
  const parts = [nameOf(race), [race.series, seasonYearOf(race)].filter(Boolean).join(' ')].filter(Boolean);
  return `${parts.join(' · ')} | Gantry`;
}

// 서킷과 도시가 같으면 한 번만 쓴다 (WRC는 '도요타, 도요타'처럼 같은 값이 들어온다).
// 미리보기 문구에서만 합친다 — 앱 화면과 시즌 JSON은 그대로다.
function placeOf(race) {
  const circuit = circuitOf(race);
  const city = cityOf(race);
  if (circuit && city && circuit === city) return circuit;
  return [circuit, city].filter(Boolean).join(', ');
}

function descriptionFor(race) {
  const where = placeOf(race);
  const cancelled = race.status === 'cancelled';
  const sessions = Array.isArray(race.sessions) ? race.sessions : [];
  const final = sessions.find((s) => s && s.kind === 'race');

  let body;
  // kst는 "YYYY-MM-DD HH:mm". 그대로 쓴다 — 시간대 변환을 하지 않는다.
  const kst = final ? /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/.exec(final.kst || '') : null;
  if (final && kst) {
    const label = formatSessionLabel(final.t, final.kind, 'ko');
    const when = [label, monthDayKo(kst[1], true), kst[2], '한국 시간'].filter(Boolean).join(' ');
    body = [when, where].filter(Boolean).join(' · ');
    // 취소된 경기에는 "앞으로 반영하겠다"는 말을 붙이지 않는다.
    body += cancelled ? '.' : '. 세션 시간과 중계 정보는 Gantry에서.';
  } else {
    const span = [monthDayKo(race.weekendStart), monthDayKo(race.weekendEnd)].filter(Boolean).join('~');
    const head = span ? `${span}(현지 날짜)` : null;
    body = [head, where].filter(Boolean).join(' · ');
    body += cancelled ? '.' : '. 세션 시간이 발표되면 Gantry에 반영됩니다.';
  }
  return cancelled ? `취소된 경기 · ${body}` : body;
}

// 템플릿에서 바꿔야 할 태그. 하나라도 못 찾으면 빌드를 실패시킨다 —
// index.html이 바뀌었는데 공유 미리보기가 조용히 옛 값으로 나가면 안 된다.
const SLOTS = [
  ['title',            /<title>[\s\S]*?<\/title>/,                                      (v) => `<title>${v}</title>`,                                            'title'],
  ['description',      /<meta name="description" content="[\s\S]*?"\s*\/>/,             (v) => `<meta name="description" content="${v}" />`,                      'desc'],
  ['og:title',         /<meta property="og:title" content="[\s\S]*?"\s*\/>/,            (v) => `<meta property="og:title" content="${v}" />`,                     'title'],
  ['og:description',   /<meta property="og:description" content="[\s\S]*?"\s*\/>/,      (v) => `<meta property="og:description" content="${v}" />`,               'desc'],
  ['og:url',           /<meta property="og:url" content="[\s\S]*?"\s*\/>/,              (v) => `<meta property="og:url" content="${v}" />`,                       'url'],
  ['og:image:alt',     /<meta property="og:image:alt" content="[\s\S]*?"\s*\/>/,        (v) => `<meta property="og:image:alt" content="${v}" />`,                 'title'],
  ['twitter:title',    /<meta name="twitter:title" content="[\s\S]*?"\s*\/>/,           (v) => `<meta name="twitter:title" content="${v}" />`,                    'title'],
  ['twitter:description', /<meta name="twitter:description" content="[\s\S]*?"\s*\/>/,  (v) => `<meta name="twitter:description" content="${v}" />`,              'desc'],
];

const templatePath = path.join(dist, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('[race-pages] dist/index.html이 없다. vite build를 먼저 돌려야 한다.');
  process.exit(1);
}
const template = fs.readFileSync(templatePath, 'utf8');

const missing = SLOTS.filter(([, re]) => !re.test(template)).map(([name]) => name);
if (missing.length) {
  console.error(`[race-pages] index.html에서 다음 태그를 찾지 못했다: ${missing.join(', ')}`);
  console.error('[race-pages] 템플릿이 바뀌었다. tools/build-race-pages.mjs의 SLOTS를 맞춰야 한다.');
  process.exit(1);
}
// canonical을 넣을 자리도 있어야 한다.
if (!/<\/head>/.test(template)) {
  console.error('[race-pages] index.html에서 </head>를 찾지 못했다.');
  process.exit(1);
}

let count = 0;
for (const season of SEASONS) {
  for (const race of season) {
    const id = text(race.id);
    if (!id) continue;
    const values = {
      title: esc(titleFor(race)),
      desc: esc(descriptionFor(race)),
      url: esc(`${ORIGIN}/race/${id}`),
    };
    let html = template;
    for (const [, re, make, key] of SLOTS) html = html.replace(re, make(values[key]));
    html = html.replace('</head>', `  <link rel="canonical" href="${values.url}" />\n  </head>`);

    const dir = path.join(dist, 'race', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count += 1;
  }
}

console.log(`[race-pages] 경기 페이지 ${count}개 생성 → dist/race/<id>/index.html`);
