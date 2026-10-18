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

// 본문용 제목: '호주 그랑프리 · F1 2026'. <title>과 같은 조각에서 ' | Gantry'만 뺀다.
function headingFor(race) {
  return [nameOf(race), [race.series, seasonYearOf(race)].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}

// 서킷·도시·국가에서 같은 값은 한 번만 쓴다 (placeOf와 같은 규칙에 국가를 더한 것).
function fullPlaceOf(race) {
  const parts = [circuitOf(race), cityOf(race), text(race.countryKo) || text(race.country)].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

const ACCESS_KO = { paid: '유료', free: '무료' };
const httpUrl = (v) => (typeof v === 'string' && /^https?:\/\//.test(v.trim()) ? v.trim() : null);
const link = (url, label) => `<a href="${esc(url)}" style="color:inherit">${esc(label)}</a>`;

// 경기 페이지 #root 안에 넣는 정적 본문. 네이버 로봇처럼 JS를 거의 실행하지 않는 크롤러가 읽는다.
// 앱은 createRoot로 마운트하면서 이 내용을 통째로 바꾼다. 숨김 처리는 하지 않는다 —
// 첫 방문에는 스플래시가 덮고, 다시 올 때는 앱 배경·글자색 위에 잠깐 보였다 바뀐다.
function bodyFor(race) {
  const out = [];
  if (race.status === 'cancelled') out.push('<p><strong>취소된 경기</strong></p>');
  out.push(`<h1>${esc(headingFor(race))}</h1>`);
  const where = fullPlaceOf(race);
  if (where) out.push(`<p>장소: ${esc(where)}</p>`);

  const sessions = (Array.isArray(race.sessions) ? race.sessions : []).map((s) => {
    if (!s) return null;
    const label = formatSessionLabel(s.t, s.kind, 'ko');
    const kst = text(s.kst);
    const start = text(s.startUtc);
    const when = kst ? (start ? `<time datetime="${esc(start)}">${esc(kst)}</time>` : esc(kst)) + ' 한국 시간' : null;
    const line = [label ? esc(label) : null, when].filter(Boolean).join(' ');
    return line ? `<li>${line}</li>` : null;
  }).filter(Boolean);
  if (sessions.length) {
    out.push('<h2>일정</h2>', `<ul>${sessions.join('')}</ul>`);
  } else {
    const days = [race.weekendStart, race.weekendEnd].map(text).filter(Boolean)
      .map((d) => `<time datetime="${esc(d)}">${esc(d)}</time>`);
    if (days.length) out.push('<h2>일정</h2>', `<p>${[...new Set(days)].join('~')}(현지 날짜)</p>`);
  }

  const broadcasts = (Array.isArray(race.broadcast) ? race.broadcast : [])
    .filter((b) => b && (b.region === 'KR' || b.region === 'global') && text(b.name))
    .map((b) => {
      const url = httpUrl(b.url);
      const access = ACCESS_KO[b.access];
      return `<li>${url ? link(url, b.name.trim()) : esc(b.name.trim())}${access ? ` · ${access}` : ''}</li>`;
    });
  if (broadcasts.length) out.push('<h2>중계</h2>', `<ul>${broadcasts.join('')}</ul>`);

  const official = httpUrl(race.officialUrl);
  if (official) out.push(`<p>${link(official, '공식 사이트')}</p>`);
  out.push(`<p>${link('/', '전체 일정 보기')}</p>`);

  return `<main style="max-width:640px;margin:0 auto;padding:32px 16px;color:var(--text);line-height:1.6">${out.join('')}</main>`;
}

// schema.org SportsEvent. 값이 없는 키는 넣지 않는다. '<'는 \u003c로 바꿔 </script>로 끊기지 않게 한다.
function jsonLdFor(race, url) {
  const final = (Array.isArray(race.sessions) ? race.sessions : []).find((s) => s && s.kind === 'race');
  const address = Object.fromEntries(Object.entries({
    addressLocality: text(race.city),
    addressCountry: text(race.country),
  }).filter(([, v]) => v));
  const placeName = text(race.circuit);
  const location = placeName || Object.keys(address).length
    ? { '@type': 'Place', ...(placeName && { name: placeName }), ...(Object.keys(address).length && { address: { '@type': 'PostalAddress', ...address } }) }
    : null;
  const data = Object.fromEntries(Object.entries({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: headingFor(race),
    url,
    startDate: text(final?.startUtc) || text(race.weekendStart),
    endDate: text(race.weekendEnd),
    eventStatus: race.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    location,
  }).filter(([, v]) => v));
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
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
// canonical·JSON-LD를 넣을 자리와 본문을 넣을 빈 #root도 있어야 한다.
if (!/<\/head>/.test(template)) {
  console.error('[race-pages] index.html에서 </head>를 찾지 못했다.');
  process.exit(1);
}
const ROOT = '<div id="root"></div>';
if (!template.includes(ROOT)) {
  console.error(`[race-pages] index.html에서 ${ROOT}를 찾지 못했다.`);
  process.exit(1);
}

let count = 0;
const pageIds = new Set();
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
    // 함수로 넘겨 본문·JSON에 든 '$'가 치환 패턴으로 읽히지 않게 한다.
    const head = `  <link rel="canonical" href="${values.url}" />\n    ${jsonLdFor(race, `${ORIGIN}/race/${id}`)}\n  </head>`;
    html = html.replace('</head>', () => head);
    html = html.replace(ROOT, () => `<div id="root">${bodyFor(race)}</div>`);

    const dir = path.join(dist, 'race', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    pageIds.add(id);
    count += 1;
  }
}

console.log(`[race-pages] 경기 페이지 ${count}개 생성 → dist/race/<id>/index.html`);

// sitemap은 위에서 실제로 만든 페이지의 id만 쓴다 — 목록을 따로 두면 페이지와 어긋난다.
// 같은 id가 두 번 나오면 페이지는 하나만 남으므로 sitemap에도 한 번만 넣는다.
const sitemapUrls = [`${ORIGIN}/`, ...[...pageIds].map((id) => `${ORIGIN}/race/${id}`)];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapUrls.map((url) => `  <url><loc>${esc(url)}</loc></url>`),
  '</urlset>',
  '',
].join('\n');
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
console.log(`[race-pages] sitemap 주소 ${sitemapUrls.length}개 생성 (홈 1 + 경기 ${pageIds.size}) → dist/sitemap.xml`);
