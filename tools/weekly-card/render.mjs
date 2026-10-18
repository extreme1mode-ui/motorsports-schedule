// satori로 요소 트리 → SVG → resvg로 PNG. 앱 번들과는 무관한 빌드 도구다(devDependencies).
import fs from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import {
  ROOT, SERIES_COLOR, raceName, placeOf, cardSessions, sessionLabel, sessionWhen,
  broadcastLine, highlightLine, rangeLabel, zoneLabel,
} from './data.mjs';

const W = 1080;
const H = 1350;
const PAD = 72;
const INNER = W - PAD * 2;   // satori는 content-box라 안쪽 폭을 직접 준다
const HEAD_H = 150;
const FOOT_H = 92;
const MAX_RACES = 5;

// Gantry Standard v2
const NIGHT = '#07080B';
const LAYER1 = '#0E1015';
const TEXT = '#F2F4F7';
const TEXT2 = '#A5A9B4';
const TEXT3 = '#7C818E';

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

const LH = 1.2;          // satori 기본 줄높이
const NAME_LH = 1.12;

// 글자 폭 어림. 한글·한자는 한 칸, 나머지는 반 칸으로 친다. 줄바꿈 수만 알면 되므로 이 정도면 된다.
const textWidth = (value, size) =>
  size * [...String(value)].reduce((w, c) => w + (c.codePointAt(0) > 0x2e80 ? 1 : 0.55), 0);

// 블록을 그리기 전에 필요한 높이를 k=1 기준으로 어림한다. 넉넉하게 잡아 글자가 블록 밖으로 나가지 않게 한다.
function blockHeightOf(race, locale) {
  const sessions = cardSessions(race);
  const nameLines = Math.max(1, Math.ceil(textWidth(raceName(race, locale) || race.id, 38) / (INNER - 48)));
  let height = 20 * 2;                                    // 안쪽 위아래 여백
  height += 21 + 8;                                       // 시리즈 · 라운드
  height += Math.ceil(38 * NAME_LH) * nameLines;          // 경기 이름
  height += Math.ceil(19 * LH) + 6;                       // 장소
  if (sessions.length) height += 14 + sessions.length * Math.ceil(21 * LH) + (sessions.length - 1) * 4;
  if (broadcastLine(race, locale)) height += Math.ceil(17 * LH) + 10;
  if (highlightLine(race, locale)) height += Math.ceil(17 * LH) + 4;
  return height;
}

function raceBlock(race, locale, tz, blockHeight, k) {
  const z = (v) => Math.round(v * k);
  const color = SERIES_COLOR[race.series] || TEXT2;
  const sessions = cardSessions(race);
  const watch = broadcastLine(race, locale);
  const note = highlightLine(race, locale);

  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: INNER, height: blockHeight, boxSizing: 'border-box',
      background: LAYER1, borderRadius: 16, padding: `${z(20)}px ${z(24)}px`, justifyContent: 'center',
    },
  }, [
    // 시리즈 · 라운드
    row({ alignItems: 'center', gap: 8, marginBottom: z(8) }, [
      h('div', { style: { display: 'flex', width: 6, height: 6, borderRadius: 3, background: color } }),
      txt({ fontSize: z(17), fontWeight: 700, color: TEXT2, letterSpacing: 1 }, race.series),
      race.round ? txt({ fontSize: z(15), fontWeight: 600, color: TEXT3, letterSpacing: 1 }, `ROUND ${race.round}`) : null,
    ].filter(Boolean)),

    txt({ fontSize: z(38), fontWeight: 800, color: TEXT, letterSpacing: -0.8, lineHeight: 1.12 }, raceName(race, locale) || race.id),
    txt({ fontSize: z(19), fontWeight: 500, color: TEXT2, marginTop: z(6) }, placeOf(race, locale)),

    ...sessions.map((s, i) => row({ alignItems: 'baseline', justifyContent: 'space-between', marginTop: i === 0 ? z(14) : z(4) }, [
      txt({ fontSize: z(20), fontWeight: 600, color: TEXT2 }, sessionLabel(s, locale) || ''),
      txt({ fontSize: z(21), fontWeight: 700, color: TEXT, fontVariantNumeric: 'tabular-nums' }, sessionWhen(s, locale, tz) || ''),
    ])),

    watch ? txt({ fontSize: z(17), fontWeight: 500, color: TEXT3, marginTop: z(10) }, watch) : null,
    note ? txt({ fontSize: z(17), fontWeight: 500, color: TEXT3, marginTop: z(4) }, note) : null,
  ].filter(Boolean));
}

function card({ races, locale, from, to, tz, more }) {
  const ko = locale === 'ko';
  const gap = races.length >= 4 ? 12 : 16;
  // 블록은 내용만큼만 차지한다. 다 합쳐 자리가 모자라면 그 비율만큼 글자와 여백을 함께 줄인다.
  const bodyHeight = H - PAD * 2 - HEAD_H - FOOT_H;
  const room = bodyHeight - gap * (races.length - 1) - (more ? 44 : 0);
  const wanted = races.map((r) => blockHeightOf(r, locale));
  const k = Math.min(1, room / wanted.reduce((a, b) => a + b, 0));
  const heights = wanted.map((v) => Math.floor(v * k));

  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: W, height: H,
      padding: PAD, fontFamily: 'Pretendard', color: TEXT, boxSizing: 'border-box',
    },
  }, [
    // 머리
    h('div', { style: { display: 'flex', flexDirection: 'column', width: INNER, height: HEAD_H } }, [
      h('img', { src: LOCKUP, width: 196, height: 22 }),
      row({ width: INNER, alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26 }, [
        txt({ fontSize: 22, fontWeight: 700, color: TEXT2, letterSpacing: ko ? 0 : 2 },
          ko ? '이번 주말 모터스포츠' : 'THIS RACE WEEKEND'),
        txt({ fontSize: 16, fontWeight: 500, color: TEXT3 },
          ko ? '모든 시각 한국 시간' : `All times ${zoneLabel(tz)}`),
      ]),
      txt({ fontSize: 30, fontWeight: 800, color: TEXT, letterSpacing: -0.5, marginTop: 8, fontVariantNumeric: 'tabular-nums' },
        rangeLabel(from, to, locale)),
    ]),

    // 경기
    h('div', { style: { display: 'flex', flexDirection: 'column', width: INNER, flexGrow: 1, gap } },
      [...races.map((r, i) => raceBlock(r, locale, tz, heights[i], k)),
       more ? txt({ width: INNER, fontSize: 19, fontWeight: 600, color: TEXT3, justifyContent: 'center', marginTop: 4 },
         ko ? `+${more}경기 더 · gantryracing.com` : `+${more} more · gantryracing.com`) : null,
      ].filter(Boolean)),

    // 꼬리
    row({ width: INNER, height: FOOT_H, alignItems: 'flex-end', justifyContent: 'space-between' }, [
      txt({ fontSize: 24, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }, 'gantryracing.com'),
      txt({ fontSize: 17, fontWeight: 500, color: TEXT3 },
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
