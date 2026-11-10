// 기록 카드(1080×1350 이미지). 인스타 디자인 v3 규칙을 따른다: 여백 96 · 왼쪽 정렬 · 글자 + 그림 하나 + 가는 선, 흰색은 핵심 하나(기록)에만.
// 그림은 서킷 생김새(트랙 좌표 그대로)와 출발선. 락업은 화면에 그려진 SVG를 그대로 옮긴다(다시 그리지 않는다).
import { formatLap } from './engine.js';

const W = 1080, H = 1350, M = 96;
const BG = '#0E1015', WHITE = '#F4F5F7', STEEL = '#8A8F9B', RULE = 'rgba(244,245,247,.16)';
const FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

function svgToImage(svgEl, color) {
  return new Promise((resolve) => {
    if (!svgEl) { resolve(null); return; }
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const vb = (clone.getAttribute('viewBox') || '').split(/\s+/);
    if (vb.length === 4) { clone.setAttribute('width', vb[2]); clone.setAttribute('height', vb[3]); }
    clone.setAttribute('style', `color:${color}`);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    const img = new Image();
    img.onload = () => resolve(img); img.onerror = () => resolve(null);
    img.src = url;
  });
}

// t: 준비된 트랙(prepareTrack), text: { kicker, circuit, stats, site }, lockupEl: 화면의 락업 svg 요소
export async function drawShareCard({ track, ms, text, lockupEl }) {
  try { await document.fonts?.ready; } catch { /* 글꼴을 못 기다리면 그대로 그린다 */ }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  // 키커
  c.fillStyle = STEEL; c.font = `600 34px ${FONT}`; c.fillText(text.kicker, M, 150);
  // 그림: 서킷(상자 888×560 안에, 왼쪽 정렬)
  const [x0, y0, x1, y1] = track.box; const bw = W - M * 2, bh = 560, top = 210;
  const k = Math.min(bw / (x1 - x0), bh / (y1 - y0));
  const ox = M, oy = top + (bh - (y1 - y0) * k) / 2;
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = WHITE; c.lineWidth = 6;
  c.beginPath();
  for (let i = 0; i < track.n; i += 2) { const X = (track.x[i] - x0) * k + ox, Y = (track.y[i] - y0) * k + oy; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); }
  c.closePath(); c.stroke();
  // 손을 떼는 구간은 흐리게 덧칠하지 않는다 — 그림은 하나만. 출발 위치에 점 하나
  const sx = (track.x[0] - x0) * k + ox, sy = (track.y[0] - y0) * k + oy;
  c.fillStyle = BG; c.beginPath(); c.arc(sx, sy, 15, 0, Math.PI * 2); c.fill();
  c.fillStyle = WHITE; c.beginPath(); c.arc(sx, sy, 9, 0, Math.PI * 2); c.fill();
  // 기록(핵심, 흰색)
  c.fillStyle = WHITE; c.font = `700 190px ${FONT}`;
  let size = 190; const time = formatLap(ms);
  while (c.measureText(time).width > bw && size > 120) { size -= 6; c.font = `700 ${size}px ${FONT}`; }
  c.fillText(time, M - 6, 1010);
  // 서킷 이름 · 한 줄 기록
  c.fillStyle = STEEL; c.font = `600 48px ${FONT}`;
  let name = text.circuit; while (c.measureText(name).width > bw && name.length > 4) name = `${name.slice(0, -2)}…`;
  c.fillText(name, M, 1090);
  c.font = `400 34px ${FONT}`; c.fillText(text.stats, M, 1146);
  // 꼬리: 가는 선 + 락업 · 주소
  c.strokeStyle = RULE; c.lineWidth = 2; c.beginPath(); c.moveTo(M, 1210); c.lineTo(W - M, 1210); c.stroke();
  // 락업: 심볼 + 워드마크(화면의 SVG 두 개를 그대로). 높이 30, 사이 간격은 높이의 0.6배
  const lh = 30; let lx = M;
  for (const el of lockupEl ? lockupEl.querySelectorAll('svg') : []) {
    const vb = (el.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const img = await svgToImage(el, WHITE);
    if (!img || vb.length !== 4 || !vb[3]) continue;
    const lw = lh * (vb[2] / vb[3]);
    c.drawImage(img, lx, 1244, lw, lh); lx += lw + lh * 0.6;
  }
  c.fillStyle = STEEL; c.font = `400 34px ${FONT}`; c.textAlign = 'right'; c.fillText(text.site, W - M, 1272);
  return cv;
}
