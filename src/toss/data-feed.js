// 토스 빌드의 데이터 갱신. 번들을 다시 올리지 않고 웹 배포의 /data/v1/에서 최신 일정·결과를 받아 끼운다.
// (파일은 웹 빌드의 tools/build-data.mjs가 원본 그대로 내보낸다.)
//
// - 시작할 때(렌더 전): 지난번에 받아 둔 데이터(storage.dataFeed)가 검사를 통과하면 끼운다.
// - 렌더 뒤: manifest를 받아 sha256이 저장해 둔 것과 다른 파일만 받는다. 검사를 통과하면 바로 끼우고 저장한다.
// - 번들이 아는 파일만 받는다. schema가 1이 아니거나 검사에 어긋나면 그 데이터는 쓰지 않는다.
// - 실패(오프라인·시간 초과·5xx)는 조용히 넘어간다. 지금 데이터(번들 또는 지난번 받은 것)가 그대로 남는다.
import { storage } from '../storage/index.js';
import { SUPPORTED_SEASONS, setSeasonData } from '../schedule/service.js';
import { setF1Results } from '../results/results.js';

const BASE = 'https://www.gantryracing.com/data/v1/';
const SCHEMA = 1;
const MANIFEST_TIMEOUT_MS = 5000;
const FILE_TIMEOUT_MS = 15000;

const isSeason = (data) => Array.isArray(data) && data.length > 0
  && data.every((race) => race && typeof race.id === 'string' && typeof race.series === 'string' && Array.isArray(race.sessions));

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const isResults = (data) => isObject(data) && isObject(data.races) && isObject(data.standings) && Array.isArray(data.standings.rows);

// 받을 파일 이름 → 검사와 끼우는 자리. 결과 파일 이름은 src/results/results.js가 읽는 번들 파일과 같다.
const TARGETS = {
  ...Object.fromEntries(SUPPORTED_SEASONS.map((year) => [`season-${year}.json`, { check: isSeason, apply: (data) => setSeasonData(year, data) }])),
  'f1-2026.json': { check: isResults, apply: setF1Results },
};

const debug = (...args) => { if (import.meta.env.DEV) console.debug('[data-feed]', ...args); };

function savedFiles() {
  const saved = storage.dataFeed.read();
  return isObject(saved?.files) ? saved.files : {};
}

// 렌더 전에 부른다. 동기.
export function applySavedDataFeed() {
  for (const [name, entry] of Object.entries(savedFiles())) {
    const target = TARGETS[name];
    if (target && target.check(entry?.data)) target.apply(entry.data);
  }
}

async function fetchBytes(name, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + name, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

// crypto.subtle이 없으면 null — 그때는 sha를 저장하지 않아 다음 시작에 다시 받는다.
async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 렌더 뒤에 부른다. 기다리지 않아도 된다. throw하지 않는다.
export async function refreshDataFeed() {
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(await fetchBytes('manifest.json', MANIFEST_TIMEOUT_MS)));
  } catch (error) {
    debug('manifest 실패', String(error?.message || error));
    return;
  }
  if (manifest?.schema !== SCHEMA || !isObject(manifest.files)) {
    debug(`schema ${manifest?.schema} — 받지 않음`);
    return;
  }

  const files = { ...savedFiles() };
  const got = [];
  const dropped = [];
  const same = [];
  for (const [name, target] of Object.entries(TARGETS)) {
    const want = manifest.files[name]?.sha256;
    if (typeof want !== 'string') continue;
    if (files[name]?.sha256 === want) { same.push(name); continue; }
    try {
      const bytes = await fetchBytes(name, FILE_TIMEOUT_MS);
      const sha = await sha256Hex(bytes);
      // manifest와 다른 파일이면(캐시가 어긋난 경우) 쓰지 않는다. 다음 시작에 다시 받는다.
      if (sha !== null && sha !== want) { dropped.push(`${name}(sha 다름)`); continue; }
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!target.check(data)) { dropped.push(`${name}(검사 실패)`); continue; }
      target.apply(data);
      files[name] = { sha256: sha, data };
      storage.dataFeed.write({ files });
      got.push(name);
    } catch (error) {
      dropped.push(`${name}(${String(error?.message || error)})`);
    }
  }
  debug(`받음 [${got.join(', ')}] 버림 [${dropped.join(', ')}] 그대로 [${same.join(', ')}]`);
}
