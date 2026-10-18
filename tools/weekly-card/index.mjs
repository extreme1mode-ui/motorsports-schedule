// 주간 카드 생성 — npm run card [-- --from YYYY-MM-DD --to YYYY-MM-DD --channels threads,x --en-tz UTC]
//
// 시즌 JSON의 정적 값만 쓴다. 게시 전에 데이터가 오래됐는지 보라고 경기별 verifiedAt을 표로 찍는다.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, racesInRange, defaultRange, raceName, cardSessions,
  sessionWhen, broadcastLine, zoneLabel,
} from './data.mjs';
import { renderCard, planCard } from './render.mjs';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const fallbackRange = defaultRange();
const from = opt('from', fallbackRange.from);
const to = opt('to', fallbackRange.to);
const channels = opt('channels', 'threads,x').split(',').map((c) => c.trim()).filter(Boolean);
const enTz = opt('en-tz', 'UTC');

if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
  console.error(`기간이 잘못됐다: --from ${from} --to ${to} (YYYY-MM-DD, from <= to)`);
  process.exit(1);
}
try { new Intl.DateTimeFormat('en-US', { timeZone: enTz }); }
catch { console.error(`--en-tz 를 모르겠다: ${enTz} (IANA 이름이어야 한다)`); process.exit(1); }

const all = racesInRange(from, to);
const cancelled = all.filter((r) => r.status === 'cancelled');
const races = all.filter((r) => r.status !== 'cancelled');

console.log(`기간 ${from} ~ ${to} (한국 날짜) · 영어 카드 시간대 ${enTz} (${zoneLabel(enTz)})`);
for (const r of cancelled) console.log(`취소: ${raceName(r, 'ko') || r.id} (${r.id})`);

if (!races.length) {
  console.log('이 기간에 넣을 경기가 없다. 이미지를 만들지 않았다.');
  process.exit(0);
}

// 데이터 신선도 표
const idW = Math.max(2, ...races.map((r) => r.id.length));
console.log('');
console.log(`  ${'id'.padEnd(idW)}  verifiedAt`);
for (const r of races) console.log(`  ${r.id.padEnd(idW)}  ${r.verifiedAt || '(없음)'}`);
console.log('');

// 카드에 몇 경기를 넣을지는 렌더러가 정한다 — 글자 크기를 지키면서 들어갈 만큼만 넣는다.
const plan = planCard(races);
const shown = races.slice(0, plan.count);
const more = races.length - shown.length;

const outDir = path.join(ROOT, 'out/weekly-card', from);
fs.mkdirSync(outDir, { recursive: true });

const LINK = 'https://www.gantryracing.com';
const utm = (channel) => `utm_source=${encodeURIComponent(channel)}&utm_medium=social&utm_campaign=weekly-${from}`;

function caption(locale, channel) {
  const ko = locale === 'ko';
  const tz = ko ? '한국 시간' : zoneLabel(enTz);
  const lines = [ko ? `이번 주말 모터스포츠 (${tz})` : `This race weekend (${tz})`, ''];
  for (const race of races) {
    lines.push(`${race.series} · ${raceName(race, locale) || race.id}`);
    for (const item of cardSessions(race, locale)) {
      const when = sessionWhen(item.session, locale, enTz);
      if (when) lines.push(`${item.label} ${when}`);
    }
    const watch = broadcastLine(race, locale);
    if (watch) lines.push(watch);
    lines.push(`${LINK}/race/${race.id}?${utm(channel)}`);
    lines.push('');
  }
  lines.push(ko ? '내 시간대와 관심 시리즈로 보기:' : 'Your time zone, your series:');
  lines.push(`${LINK}/?${utm(channel)}`);
  return lines.join('\n');
}

const made = [];
for (const locale of ['ko', 'en']) {
  const file = path.join(outDir, `gantry-weekly-${locale}.png`);
  const bytes = await renderCard({ races: shown, locale, from, to, tz: enTz, more, tier: plan.tier, space: plan.space }, file);
  made.push(`${file} (${Math.round(bytes / 1024)}KB)`);
  for (const channel of channels) {
    const body = caption(locale, channel);
    const capFile = path.join(outDir, `caption-${locale}-${channel}.txt`);
    fs.writeFileSync(capFile, body + '\n');
    made.push(`${capFile} (${body.length}자)`);
    if (channel === 'x' && body.length > 280) {
      console.warn(`경고: caption-${locale}-x.txt 가 ${body.length}자다 (X 한도 280자). 자르지는 않았다.`);
    }
  }
}

console.log(`경기 ${races.length}개 중 ${shown.length}개를 카드에${more ? ` (+${more} 더)` : ''} 넣었다.`);
for (const f of made) console.log(`  ${path.relative(ROOT, f.split(' (')[0])}  ${f.slice(f.indexOf('('))}`);
