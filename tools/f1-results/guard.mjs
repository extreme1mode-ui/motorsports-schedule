#!/usr/bin/env node
// 자동 갱신(.github/workflows/f1-results.yml)의 안전 검사. update.mjs가 고친 파일을 올리기 전에 이전 파일과 비교한다.
//
//   node tools/f1-results/guard.mjs --season 2026                 이전: git show HEAD:<파일>, 새: 작업 트리의 파일
//   node tools/f1-results/guard.mjs --prev a.json --next b.json   두 파일을 직접 비교 (시험용)
//
// 걸리면 1로 끝난다. 파일은 고치지 않는다(되돌리기는 워크플로가 한다).
// - 경기 수가 줄었다
// - standings.round가 줄었다
// - standings.rows가 비었다
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const season = arg('--season') || String(new Date().getUTCFullYear());
const rel = `src/results/f1-${season}.json`;

function readPrev() {
  if (arg('--prev')) return fs.readFileSync(arg('--prev'), 'utf8');
  try {
    return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;   // 새 시즌: 이전 파일이 없다
  }
}

const fails = [];
let prev = null;
let next = null;
try {
  const raw = readPrev();
  prev = raw === null ? null : JSON.parse(raw);
} catch (e) {
  fails.push(`이전 파일을 읽지 못했다: ${e.message}`);
}
try {
  next = JSON.parse(fs.readFileSync(arg('--next') || path.join(ROOT, rel), 'utf8'));
} catch (e) {
  fails.push(`새 파일을 읽지 못했다: ${e.message}`);
}

const raceCount = (d) => Object.keys((d && d.races) || {}).length;
const round = (d) => Number(d && d.standings && d.standings.round);

if (next) {
  if (!Array.isArray(next.standings && next.standings.rows) || !next.standings.rows.length) fails.push('standings.rows가 비었다');
  if (prev) {
    if (raceCount(next) < raceCount(prev)) fails.push(`경기 수가 줄었다 (${raceCount(prev)} → ${raceCount(next)})`);
    if (!(round(next) >= round(prev))) fails.push(`standings.round가 줄었다 (${prev.standings?.round} → ${next.standings?.round})`);
  }
}

if (fails.length) {
  fails.forEach((f) => console.log('FAIL ' + f));
  process.exit(1);
}
console.log(`OK 경기 ${raceCount(prev)} → ${raceCount(next)} · 순위 기준 ${prev ? prev.standings.round : '-'}R → ${next.standings.round}R`);
