// satori로 요소 트리 → SVG → resvg로 PNG. 앱 번들과는 무관한 빌드 도구다(devDependencies).
import fs from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import {
  ROOT, SERIES_COLOR, raceName, placeOf, cardSessions, sessionWhen,
  broadcastLine, highlightLine, rangeLabel, zoneLabel,
} from './data.mjs';

const W = 1080;
const H = 1350;
const PAD_X = 72;
const PAD_Y = 32;
const INNER = W - PAD_X * 2;   // satori는 content-box라 안쪽 폭을 직접 준다
const HEAD_H = 200;
const FOOT_H = 66;
const BODY_H = H - PAD_Y * 2 - HEAD_H - FOOT_H;
const MAX_RACES = 4;

// Gantry Standard v2
const NIGHT = '#07080B';
const LAYER1 = '#0E1015';
const TEXT = '#F2F4F7';
const TEXT2 = '#A5A9B4';
const TEXT3 = '#7C818E';

// 1080 카드는 휴대폰 타임라인에서 3분의 1 크기로 보인다. 그래서 28px 아래로 내려가는 글자를 두지 않고,
// 경기 수에 따라 세 가지 크기로만 짠다. 자리가 모자라면 글자가 아니라 여백을 줄인다.
const TIERS = {
  one:   { name: 96, time: 72, label: 40, small: 34, code: 34, round: 30, padX: 34, place: true,  note: true,  raceOnly: false },
  few:   { name: 56, time: 44, label: 34, small: 30, code: 30, round: 28, padX: 28, place: true,  note: true,  raceOnly: false },
  dense: { name: 48, time: 40, label: 32, small: 28, code: 28, round: 28, padX: 24, place: false, note: false, raceOnly: true },
};
const tierFor = (n) => (n <= 1 ? TIERS.one : n <= 3 ? TIERS.few : TIERS.dense);

// 위아래 여백의 기준값. 자리에 맞춰 이 값들에 같은 비율(s)을 곱한다 — 모자라면 줄이고,
// 경기가 적어 자리가 남으면 늘린다. 좌우 여백(tier.padX)은 비율을 따르지 않는다.
const SPACE = {
  padY: 18, afterCode: 6, afterName: 6, beforeSessions: 12,
  betweenRows: 4, beforeWatch: 10, beforeNote: 4, blockGap: 14, beforeMore: 12,
};
const SPACE_FLOOR = 0.5;
const SPACE_CEIL = 8;

const FONT_DIR = path.join(ROOT, 'node_modules/pretendard/dist/public/static');
// satori는 woff2를 못 읽는다. 정적 OTF를 쓴다.
const FONTS = [
  ['Pretendard-Medium.otf', 500],
  ['Pretendard-SemiBold.otf', 600],
  ['Pretendard-Bold.otf', 700],
  ['Pretendard-ExtraBold.otf', 800],
].map(([file, weight]) => ({ name: 'Pretendard', data: fs.readFileSync(path.join(FONT_DIR, file)), weight, style: 'normal' }));

const dataUri = (file) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(ROOT, file)).toString('base64')}`;
const LOCKUP = dataUri('public/gantry/gantry-lockup-chalk.svg');

const row = (style, children) => h('div', { style: { display: 'flex', ...style } }, children);
const txt = (style, value) => h('div', { style: { display: 'flex', ...style } }, value);

const LH = 1.2;        // satori 기본 줄높이
const NAME_LH = 1.08;
const ROW_LH = 1.15;
const line = (size, lh = LH) => Math.ceil(size * lh);

// 글자 폭 어림. 한글·한자는 한 칸, 나머지는 반 칸 남짓으로 친다. 줄 수와 말줄임 위치만 알면 되므로 이 정도면 된다.
const spanOf = (value, size, bold) =>
  size * (bold ? 1.04 : 1) * [...String(value)].reduce((w, c) => w + (c.codePointAt(0) > 0x2e80 ? 1 : 0.55), 0);

// satori가 줄을 어떻게 끊을지 미리 세어 본다. 블록 높이를 먼저 정해야 해서 필요하다.
function wrap(value, size, width, bold) {
  const lines = [];
  let cur = '';
  const fits = (s) => spanOf(s, size, bold) <= width;
  const push = () => { if (cur) { lines.push(cur); cur = ''; } };
  for (const token of String(value).split(/(\s+)/)) {
    if (!token) continue;
    if (/^\s+$/.test(token)) { if (cur) cur += ' '; continue; }
    if (fits(cur + token)) { cur += token; continue; }
    push();
    if (fits(token)) { cur = token; continue; }
    for (const ch of token) { if (cur && !fits(cur + ch)) push(); cur += ch; }
  }
  push();
  return lines.length ? lines : [''];
}

// 정해진 줄 수를 넘으면 말줄임으로 자른다. 경기 이름은 2줄, 장소는 1줄.
function clamp(value, size, width, maxLines, bold) {
  const v = String(value);
  const lines = wrap(v, size, width, bold).length;
  if (lines <= maxLines) return { text: v, lines };
  let lo = 0; let hi = v.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (wrap(`${v.slice(0, mid).trimEnd()}…`, size, width, bold).length <= maxLines) lo = mid; else hi = mid - 1;
  }
  return { text: `${v.slice(0, lo).trimEnd()}…`, lines: maxLines };
}

// 블록 하나가 무엇을 담고 얼마나 높은지. 여백 비율 s를 받아 높이까지 계산한다.
function blockPlan(race, locale, tier, s) {
  const sp = (v) => Math.round(v * s);
  const width = INNER - tier.padX * 2;
  const items = cardSessions(race, locale, { raceOnly: tier.raceOnly });
  const name = clamp(raceName(race, locale) || race.id, tier.name, width, 2, true);
  const placeText = tier.place ? (placeOf(race, locale) || '') : '';
  const place = placeText ? clamp(placeText, tier.small, width, 1, false) : null;
  const watch = broadcastLine(race, locale);
  const note = tier.note ? highlightLine(race, locale) : null;

  let height = sp(SPACE.padY) * 2;
  height += line(Math.max(tier.code, tier.round)) + sp(SPACE.afterCode);
  height += name.lines * line(tier.name, NAME_LH);
  if (place) height += sp(SPACE.afterName) + line(tier.small);
  if (items.length) {
    height += sp(SPACE.beforeSessions)
      + items.length * line(tier.time, ROW_LH)
      + (items.length - 1) * sp(SPACE.betweenRows);
  }
  if (watch) height += sp(SPACE.beforeWatch) + line(tier.small);
  if (note) height += sp(SPACE.beforeNote) + line(tier.small);

  return { race, items, name, place, watch, note, height };
}

// 카드 하나가 쓸 자리를 다 합쳐 본다.
function needHeight(plans, tier, s, more) {
  return plans.reduce((a, p) => a + p.height, 0)
    + Math.round(SPACE.blockGap * s) * (plans.length - 1)
    + (more ? Math.round(SPACE.beforeMore * s) + line(tier.small) : 0);
}

// 글자 크기는 줄이지 않는다 — 여백을 먼저 줄이고, 그래도 모자라면 카드에 넣는 경기 수를 줄여 "+N"으로 넘긴다.
function layoutFor(races, locales, count, more) {
  const tier = tierFor(count);
  const list = races.slice(0, count);
  for (let s = SPACE_CEIL; s >= SPACE_FLOOR - 0.001; s -= 0.05) {
    const fits = locales.every((locale) =>
      needHeight(list.map((r) => blockPlan(r, locale, tier, s)), tier, s, more) <= BODY_H);
    if (fits) return { tier, space: s };
  }
  return null;
}

// 두 언어 카드가 같은 경기를 보여야 하므로 KO·EN을 함께 보고 정한다.
export function planCard(races, locales = ['ko', 'en']) {
  for (let count = Math.min(MAX_RACES, races.length); count > 1; count -= 1) {
    const fit = layoutFor(races, locales, count, races.length > count);
    if (fit) return { count, ...fit };
  }
  return { count: 1, ...(layoutFor(races, locales, 1, races.length > 1) || { tier: TIERS.one, space: SPACE_FLOOR }) };
}

function raceBlock(plan, locale, tz, tier, s, height) {
  const sp = (v) => Math.round(v * s);
  const color = SERIES_COLOR[plan.race.series] || TEXT2;

  // 머리(시리즈·이름·장소) / 세션 / 꼬리(중계·하이라이트) 세 묶음으로 나눠 위아래로 펼친다.
  // 경기가 적어 블록이 커질 때 가운데만 글이 몰리고 위아래가 비는 것을 막는다.
  const head = [
    row({ alignItems: 'center', gap: Math.round(tier.code * 0.3) }, [
      h('div', { style: { display: 'flex', width: 10, height: 10, borderRadius: 5, background: color } }),
      txt({ fontSize: tier.code, fontWeight: 700, color: TEXT2, letterSpacing: 1 }, plan.race.series),
      plan.race.round ? txt({ fontSize: tier.round, fontWeight: 600, color: TEXT3, letterSpacing: 1 }, `ROUND ${plan.race.round}`) : null,
    ].filter(Boolean)),

    txt({
      fontSize: tier.name, fontWeight: 800, color: TEXT, letterSpacing: -0.8, lineHeight: NAME_LH,
      marginTop: sp(SPACE.afterCode), height: plan.name.lines * line(tier.name, NAME_LH), overflow: 'hidden',
    }, plan.name.text),

    plan.place
      ? txt({ fontSize: tier.small, fontWeight: 500, color: TEXT2, marginTop: sp(SPACE.afterName) }, plan.place.text)
      : null,
  ].filter(Boolean);

  const mid = plan.items.map((item, i) => row({
    alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: i === 0 ? 0 : sp(SPACE.betweenRows),
    height: line(tier.time, ROW_LH),
  }, [
    txt({ fontSize: tier.label, fontWeight: 600, color: TEXT2 }, item.label || ''),
    txt({ fontSize: tier.time, fontWeight: 700, color: TEXT, fontVariantNumeric: 'tabular-nums' },
      sessionWhen(item.session, locale, tz) || ''),
  ]));

  const tail = [
    plan.watch ? txt({ fontSize: tier.small, fontWeight: 500, color: TEXT3 }, plan.watch) : null,
    plan.note ? txt({ fontSize: tier.small, fontWeight: 500, color: TEXT3, marginTop: sp(SPACE.beforeNote) }, plan.note) : null,
  ].filter(Boolean);

  const groups = [
    [head, 0],
    [mid, sp(SPACE.beforeSessions)],
    [tail, sp(SPACE.beforeWatch)],
  ].filter(([items]) => items.length);

  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: INNER, height, boxSizing: 'border-box',
      background: LAYER1, borderRadius: 16,
      justifyContent: groups.length > 1 ? 'space-between' : 'center',
      padding: `${sp(SPACE.padY)}px ${tier.padX}px`,
    },
  }, groups.map(([items, marginTop]) =>
    h('div', { style: { display: 'flex', flexDirection: 'column', marginTop } }, items)));
}

function card({ races, locale, from, to, tz, more, tier, space }) {
  const ko = locale === 'ko';
  const sp = (v) => Math.round(v * space);
  const plans = races.map((r) => blockPlan(r, locale, tier, space));

  // 남는 자리는 블록들이 고르게 나눠 갖는다. 한 경기짜리 카드가 위쪽에만 몰리지 않게 하려는 것이다.
  const gap = sp(SPACE.blockGap);
  const spare = BODY_H - needHeight(plans, tier, space, more);
  const extra = spare > 0 ? Math.floor(spare / plans.length) : 0;

  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: W, height: H, boxSizing: 'border-box',
      padding: `${PAD_Y}px ${PAD_X}px`, fontFamily: 'Pretendard', color: TEXT,
    },
  }, [
    // 머리: 로고 · 시간대 안내 / 키커 / 기간.
    // 기간은 64라 한 줄을 다 쓴다 — 옆에 무엇을 두면 줄이 넘어간다.
    h('div', { style: { display: 'flex', flexDirection: 'column', width: INNER, height: HEAD_H } }, [
      row({ width: INNER, alignItems: 'center', justifyContent: 'space-between' }, [
        h('img', { src: LOCKUP, width: 240, height: 27 }),
        txt({ fontSize: 32, fontWeight: 500, color: TEXT3 },
          ko ? '모든 시각 한국 시간' : `All times ${zoneLabel(tz)}`),
      ]),
      txt({ fontSize: 32, fontWeight: 700, color: TEXT2, letterSpacing: ko ? 0 : 2, marginTop: 18 },
        ko ? '이번 주말 모터스포츠' : 'THIS RACE WEEKEND'),
      txt({ fontSize: 64, fontWeight: 800, color: TEXT, letterSpacing: -1, marginTop: 4, fontVariantNumeric: 'tabular-nums' },
        rangeLabel(from, to, locale)),
    ]),

    // 경기
    h('div', { style: { display: 'flex', flexDirection: 'column', width: INNER, flexGrow: 1, gap } },
      [...plans.map((p) => raceBlock(p, locale, tz, tier, space, p.height + extra)),
       more ? txt({
         width: INNER, fontSize: tier.small, fontWeight: 600, color: TEXT3,
         justifyContent: 'center', marginTop: sp(SPACE.beforeMore),
       }, ko ? `+${more}경기 더 · gantryracing.com` : `+${more} more · gantryracing.com`) : null,
      ].filter(Boolean)),

    // 꼬리
    row({ width: INNER, height: FOOT_H, alignItems: 'flex-end', justifyContent: 'space-between' }, [
      txt({ fontSize: 40, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }, 'gantryracing.com'),
      txt({ fontSize: 32, fontWeight: 500, color: TEXT3 },
        ko ? '내 시간대와 관심 시리즈로 정리해 드려요' : 'Your time zone. Your series.'),
    ]),
  ]);
}

// 점 격자는 공유 카드(gantry-share-card.svg)와 같은 패턴을 satori SVG에 직접 넣는다.
// satori는 반복 배경을 지원하지 않고, 1만 개 넘는 점을 요소로 그리면 느리다.
function withBackdrop(svg) {
  const defs = `<defs><pattern id="gt-dots" width="12" height="12" patternUnits="userSpaceOnUse">`
    + `<circle cx="6" cy="6" r="2.1" fill="#F2F4F7" fill-opacity="0.06"/></pattern></defs>`
    + `<rect width="${W}" height="${H}" fill="${NIGHT}"/>`
    + `<rect width="${W}" height="${H}" fill="url(#gt-dots)"/>`;
  return svg.replace(/(<svg[^>]*>)/, `$1${defs}`);
}

export async function renderCard(options, outFile) {
  const svg = await satori(card(options), { width: W, height: H, fonts: FONTS });
  const png = new Resvg(withBackdrop(svg), { fitTo: { mode: 'width', value: W } }).render().asPng();
  fs.writeFileSync(outFile, png);
  return png.length;
}

export { MAX_RACES };
