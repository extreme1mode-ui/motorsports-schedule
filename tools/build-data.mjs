// 일정·결과 JSON을 dist/data/v1/로 내보낸다 (vite build 뒤에 돈다).
//
// 토스판은 번들을 다시 올리지 않고 이 주소에서 최신 데이터를 받아 간다.
// 원본 파일을 바이트 그대로 복사한다 — 값을 고치거나 다시 직렬화하지 않는다.
// 새 시즌 파일이 생기면 FILES에 한 줄만 더한다.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist/data/v1');

// [원본(저장소 루트 기준), 내보낼 이름]
const FILES = [
  ['src/schedule/season-2026.json', 'season-2026.json'],
  ['src/schedule/season-2027.json', 'season-2027.json'],
  ['src/results/f1-2026.json', 'f1-2026.json'],
];

fs.mkdirSync(out, { recursive: true });

const files = {};
for (const [src, name] of FILES) {
  const buf = fs.readFileSync(path.join(root, src));
  fs.writeFileSync(path.join(out, name), buf);
  files[name] = { bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

const manifest = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  files,
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`[data] 파일 ${FILES.length}개와 manifest.json → dist/data/v1/`);
