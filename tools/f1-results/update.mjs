#!/usr/bin/env node
// F1 경기 결과·드라이버 순위 스냅샷 갱신.
//   Jolpica F1 API(결과·스프린트·드라이버 순위) + OpenF1(라운드별 팀 색) → src/results/f1-<season>.json
//
//   node tools/f1-results/update.mjs                 올해 시즌을 받아 파일을 고친다
//   node tools/f1-results/update.mjs --dry           파일은 그대로 두고 무엇이 바뀌는지만 보여 준다
//   node tools/f1-results/update.mjs --season 2026
//
// 규칙
// - 값은 원문 그대로 옮긴다(순위 글자 R·W, 기록 문자열, 점수는 문자열 그대로). 없는 필드는 null.
// - 라운드 번호로 앱 일정(src/schedule/season-<season>.json)의 F1 경기와 잇는다. 날짜가 하루 넘게 어긋나면 멈춘다
//   (라스베이거스처럼 현지 토요일 밤 경기는 UTC 날짜가 하루 뒤라 하루 차이는 허용한다).
// - 검사에 하나라도 걸리면 파일을 쓰지 않고 1로 끝난다.
// - 사진 목록(photos.codes)은 public/drivers/f1-<season>/<CODE>.webp 파일이 있는 코드다. 사진은 이 스크립트가 받지 않는다(README 참고).
//
// 요청 수: Jolpica 4~6번(초당 4회 제한 → 0.35초 간격), OpenF1 1 + 라운드 수(분당 30회 제한 → 2.1초 간격). 한 시즌 끝까지 1분 안팎.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const OPENF1 = 'https://api.openf1.org/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 받기 ----------

// 요청 하나: 429·5xx는 기다렸다 다시(최대 4번). get을 바꿔 끼우면 네트워크 없이 시험할 수 있다.
export function makeGet({ log = () => {} } = {}) {
  const last = {};
  return async function get(url, { gap = 0 } = {}) {
    const host = new URL(url).host;
    const wait = (last[host] || 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
    for (let attempt = 1; ; attempt++) {
      last[host] = Date.now();
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        const ms = res.status === 429 ? 30000 : 3000 * attempt;
        log(`  ${res.status} ${url} → ${ms / 1000}초 뒤 다시`);
        await sleep(ms);
        continue;
      }
      throw new Error(`${res.status} ${url}`);
    }
  };
}

// Jolpica 목록은 결과 줄 단위로 100개씩 나뉘어 오고, 한 경기가 두 쪽에 걸칠 수 있다. 라운드로 합친다.
async function jolpicaRaces(get, season, kind, listKey) {
  const byRound = new Map();
  for (let offset = 0, total = Infinity; offset < total; offset += 100) {
    const j = await get(`${JOLPICA}/${season}/${kind}/?limit=100&offset=${offset}`, { gap: 350 });
    total = Number(j.MRData.total);
    for (const race of j.MRData.RaceTable.Races) {
      const have = byRound.get(race.round);
      if (have) have[listKey].push(...race[listKey]);
      else byRound.set(race.round, { ...race, [listKey]: [...race[listKey]] });
    }
    if (!j.MRData.RaceTable.Races.length) break;
  }
  return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

export async function fetchJolpica(get, season) {
  const results = await jolpicaRaces(get, season, 'results', 'Results');
  const sprint = await jolpicaRaces(get, season, 'sprint', 'SprintResults');
  const st = await get(`${JOLPICA}/${season}/driverstandings/`, { gap: 350 });
  return { results, sprint, standings: st.MRData.StandingsTable };
}

// OpenF1: 시즌 결승 세션 목록 → Jolpica 라운드와 시각(같은 시각, 없으면 같은 UTC 날짜)으로 맞춘 세션의 드라이버(팀 색).
export async function fetchOpenF1(get, season, jolpicaResults, log = () => {}) {
  const sessions = (await get(`${OPENF1}/sessions?year=${season}&session_name=Race`, { gap: 2100 })).filter((s) => s.is_cancelled !== true);
  const out = {};
  for (const jr of jolpicaResults) {
    const when = jr.time ? Date.parse(`${jr.date}T${jr.time}`) : NaN;
    let s = sessions.find((x) => Date.parse(x.date_start) === when);
    if (!s) {
      const same = sessions.filter((x) => x.date_start.slice(0, 10) === jr.date);
      if (same.length === 1) [s] = same;
    }
    if (!s) { log(`  OpenF1 세션 없음: ${jr.round}R ${jr.raceName} ${jr.date} — 이 라운드 팀 색은 null`); continue; }
    const drivers = await get(`${OPENF1}/drivers?session_key=${s.session_key}`, { gap: 2100 });
    out[jr.round] = Object.fromEntries(drivers.map((d) => [String(d.driver_number), d.team_colour ?? null]));
  }
  return out;
}

// ---------- 만들기 (네트워크 없음) ----------

const v = (x) => (x === undefined ? null : x);

export function build({ season, J, colour, app, photoCodes, fetchedAt }) {
  const errors = [];
  const byRound = new Map(app.filter((x) => x.series === 'F1' && x.round != null).map((x) => [String(x.round), x]));
  const appRace = (round, date, name) => {
    const a = byRound.get(String(round));
    if (!a) { errors.push(`${round}R ${name}: 앱 일정에 같은 라운드가 없다`); return null; }
    const days = Math.abs(Date.parse(a.raceDateLocal) - Date.parse(date)) / 86400000;
    if (!(days <= 1)) { errors.push(`${round}R ${name}: 날짜가 맞지 않다 (Jolpica ${date} / 앱 ${a.raceDateLocal} ${a.id})`); return null; }
    return a;
  };
  const row = (x, round) => {
    const t = x.Time || {};
    return {
      p: v(x.position), pt: v(x.positionText), n: v(x.number),
      code: v(x.Driver.code), given: v(x.Driver.givenName), family: v(x.Driver.familyName),
      team: v(x.Constructor && x.Constructor.name), grid: v(x.grid), laps: v(x.laps), status: v(x.status),
      time: v(t.time), pts: v(x.points), c: v((colour[round] || {})[x.number]),
    };
  };

  const races = {};
  for (const jr of J.results) {
    const a = appRace(jr.round, jr.date, jr.raceName);
    if (!a) continue;
    races[a.id] = { round: jr.round, name: jr.raceName, date: jr.date, gp: jr.Results.map((x) => row(x, jr.round)), sprint: null };
  }
  for (const sr of J.sprint) {
    const a = appRace(sr.round, sr.date, sr.raceName);
    if (!a) continue;
    if (!races[a.id]) { errors.push(`${sr.round}R ${sr.raceName}: 스프린트 결과는 있는데 결승 결과가 없다`); continue; }
    races[a.id].sprint = sr.SprintResults.map((x) => row(x, sr.round));
  }

  const L = (J.standings.StandingsLists || [])[0];
  if (!L) errors.push('드라이버 순위가 비어 있다');
  const rounds = Object.keys(colour).sort((a, b) => Number(b) - Number(a));
  const lastColour = (num) => { for (const r of rounds) if (num in colour[r]) return colour[r][num]; return null; };
  const standingsRows = L ? L.DriverStandings.map((d) => ({
    p: v(d.position), pt: v(d.positionText), pts: v(d.points), wins: v(d.wins),
    n: v(d.Driver.permanentNumber), code: v(d.Driver.code),
    given: v(d.Driver.givenName), family: v(d.Driver.familyName),
    teams: (d.Constructors || []).map((c) => c.name), c: v(lastColour(d.Driver.permanentNumber)),
  })) : [];
  const stRace = L ? byRound.get(String(L.round)) : null;
  if (L && !stRace) errors.push(`순위 기준 ${L.round}R가 앱 일정에 없다`);

  // 검사: 순위 기준 라운드 = 마지막 결과 라운드, 결과 줄 순위가 1부터 차례대로
  const lastRound = J.results.length ? J.results[J.results.length - 1].round : null;
  if (L && lastRound && String(L.round) !== String(lastRound)) errors.push(`순위 기준 ${L.round}R와 마지막 결과 ${lastRound}R가 다르다 — Jolpica가 갱신 중일 수 있다. 조금 뒤 다시 실행`);
  for (const [id, r] of Object.entries(races)) {
    for (const [k, list] of [['gp', r.gp], ['sprint', r.sprint]]) {
      if (!list) continue;
      list.forEach((x, i) => { if (x.p !== String(i + 1)) errors.push(`${id} ${k}: ${i + 1}번째 줄의 position이 ${x.p}`); });
    }
  }

  const out = {
    season: String(season),
    source: { results: 'Jolpica F1 API (api.jolpi.ca, Ergast compatible)', colors: 'OpenF1 (api.openf1.org) drivers.team_colour', fetchedAt },
    standings: { round: L ? L.round : null, raceId: stRace ? stRace.id : null, rows: standingsRows },
    races,
    photos: { base: `/drivers/f1-${season}/`, ext: '.webp', credit: 'Formula 1 (media.formula1.com)', codes: photoCodes },
  };
  return { out, errors };
}

export function summarize(prev, out) {
  const lines = [];
  const rounds = Object.values(out.races).map((r) => r.round);
  const prevIds = new Set(Object.keys((prev && prev.races) || {}));
  const added = Object.entries(out.races).filter(([id]) => !prevIds.has(id)).map(([, r]) => `${r.round}R ${r.name}${r.sprint ? ' (+스프린트)' : ''}`);
  const changed = Object.entries(out.races).filter(([id, r]) => prevIds.has(id) && JSON.stringify(prev.races[id]) !== JSON.stringify(r)).map(([, r]) => `${r.round}R ${r.name}`);
  lines.push(`경기 ${rounds.length}개 (스프린트 ${Object.values(out.races).filter((r) => r.sprint).length}개) · 순위 기준 ${out.standings.round}R`);
  lines.push(`새 경기: ${added.length ? added.join(', ') : '없음'}`);
  if (changed.length) lines.push(`값이 바뀐 기존 경기: ${changed.join(', ')} — 정정(페널티 등)일 수 있다. 확인 후 커밋`);
  const top = out.standings.rows.slice(0, 3).map((r) => `${r.pt} ${r.code} ${r.pts}`).join(' · ');
  lines.push(`순위 1~3: ${top}`);
  const codes = new Set(out.photos.codes);
  const seen = new Map();
  out.standings.rows.forEach((r) => seen.set(r.code, `${r.given} ${r.family}`));
  const noPhoto = [...seen].filter(([c]) => !codes.has(c)).map(([c, n]) => `${c}(${n})`);
  lines.push(`사진 없는 드라이버(코드 원으로 표시): ${noPhoto.length ? noPhoto.join(', ') : '없음'}`);
  const noColour = new Set();
  Object.values(out.races).forEach((r) => [...r.gp, ...(r.sprint || [])].forEach((x) => { if (!x.c) noColour.add(`${r.round}R #${x.n}`); }));
  if (noColour.size) lines.push(`팀 색 없는 줄 ${noColour.size}개: ${[...noColour].slice(0, 8).join(', ')}${noColour.size > 8 ? ' …' : ''}`);
  return lines;
}

export function photoCodesIn(dir) {
  try { return fs.readdirSync(dir).filter((f) => /^[A-Z]{3}\.webp$/.test(f)).map((f) => f.slice(0, 3)).sort(); } catch { return []; }
}

// ---------- 실행 ----------

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const si = args.indexOf('--season');
  const season = si >= 0 ? args[si + 1] : String(new Date().getUTCFullYear());
  const file = path.join(ROOT, `src/results/f1-${season}.json`);
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, `src/schedule/season-${season}.json`), 'utf8'));
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const log = (s) => console.log(s);
  const get = makeGet({ log });

  console.log(`F1 ${season} 결과 받는 중 (Jolpica → OpenF1)…`);
  const J = await fetchJolpica(get, season);
  const colour = await fetchOpenF1(get, season, J.results, log);
  const { out, errors } = build({ season, J, colour, app, photoCodes: photoCodesIn(path.join(ROOT, `public/drivers/f1-${season}`)), fetchedAt: new Date().toISOString() });

  summarize(prev, out).forEach((l) => console.log('· ' + l));
  if (errors.length) {
    errors.forEach((e) => console.log('FAIL ' + e));
    console.log(`FAIL ${errors.length}건 — 파일을 쓰지 않았다`);
    process.exit(1);
  }
  const same = prev && JSON.stringify({ ...prev, source: null }) === JSON.stringify({ ...out, source: null });
  if (same) { console.log('OK 바뀐 값 없음 — 파일을 그대로 둔다'); return; }
  if (dry) { console.log('OK (--dry) 파일은 쓰지 않았다'); return; }
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`OK ${path.relative(ROOT, file)} 저장 (${fs.statSync(file).size} bytes)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('FAIL ' + (e && e.message ? e.message : e)); process.exit(1); });
}
