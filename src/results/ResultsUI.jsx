// F1 결과 화면 부품: 드라이버 원형 사진(홈 지난 주말 결과·상세 결과·시리즈 순위가 같이 쓴다).
// 결과 섹션·순위 목록·포디움 줄은 UX v2 화면(screens2/Detail.jsx·Series.jsx, home/Home.jsx)으로 옮겼다.
import { photoFocusX } from './results.js';

// 원형 사진. 머리~가슴 컷아웃을 1.5배로 키워 얼굴이 원 가운데 오게 한다. 사진이 없으면 드라이버 코드.
export function Avatar({ src, code, size = 36 }) {
  return (
    <span aria-hidden style={{
      position: 'relative', flex: 'none', width: size, height: size, borderRadius: 999, overflow: 'hidden',
      background: 'var(--surface3)', display: 'grid', placeItems: 'center',
    }}>
      {src
        ? <img src={src} alt="" decoding="async" loading="lazy" style={{ position: 'absolute', width: '150%', height: '150%', maxWidth: 'none', left: `${(0.5 - photoFocusX(code) * 1.5) * 100}%`, top: '2%' }} />
        : <span style={{ fontSize: Math.max(12, Math.round(size * 0.3)), fontWeight: 700, color: 'var(--text2)' }}>{code}</span>}
    </span>
  );
}
