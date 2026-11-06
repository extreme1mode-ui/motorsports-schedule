// 한국어 조사 고르기 (공용). 문구 안의 {josa:A/B}를 바로 앞 글자로 고른다 — A는 받침 있을 때, B는 없을 때.
// 쓰는 꼴: 이/가 · 은/는 · 을/를 · 이에요/예요.
//   한글      받침 유무 ('몬차 6시간이에요', '상파울루 GP가'의 GP처럼 라틴 글자는 아래 규칙)
//   숫자      0·1·3·6·7·8로 끝나면 받침 있음(영·일·삼·육·칠·팔), 그 밖은 없음 ('연습 3이에요', '결승 2가')
//   그 밖     라틴 글자 등은 받침 없음 ('WEC는'). 'F1은'은 숫자 규칙으로 맞는다.
// 괄호·따옴표처럼 소리가 없는 끝 글자는 건너뛰고 그 앞 글자를 본다.
const SILENT = /[\s)\]}"'’”»›.,·…]/;

// true = 받침 있음, false = 없음, null = 볼 글자가 없음
export function hasBatchim(word) {
  const s = String(word ?? '');
  let i = s.length - 1;
  while (i >= 0 && SILENT.test(s[i])) i--;
  if (i < 0) return null;
  const c = s.charCodeAt(i);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  if (c >= 0x30 && c <= 0x39) return '013678'.includes(s[i]);
  return false;
}

// josa('연습 3', '이에요/예요') → '이에요'
export function josa(word, pair) {
  const [withB, withoutB = withB] = String(pair).split('/');
  return hasBatchim(word) ? withB : withoutB;
}

// 문장 안의 {josa:A/B}를 앞 글자로 고른다. 변수 치환이 끝난 문장에 쓴다.
const JOSA_RE = /\{josa:([^/}]*)\/([^}]*)\}/g;
export function applyJosa(text) {
  const s = String(text ?? '');
  if (!s.includes('{josa:')) return s;
  return s.replace(JOSA_RE, (m, withB, withoutB, offset, whole) => (hasBatchim(whole.slice(0, offset)) ? withB : withoutB));
}
