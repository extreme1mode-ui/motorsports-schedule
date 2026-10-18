// 경기 사진 출처 줄 — 상세 헤더(모바일 시트·데스크톱 드로어) 사진 위 오른쪽 아래 구석.
// Commons CC BY · BY-SA 사진은 작가와 라이선스를 밝히는 것이 사용 조건이다. 누르면 Commons 파일 페이지(원본·라이선스 전문).
// 홈 히어로는 같은 내용을 home.css .hero2-credit 칩으로 그린다.
import { photoCredit } from './home/photos.js';
import { useT } from './i18n/index.js';
import { FONT_DATA } from './primitives.jsx';

export function PhotoCredit({ race, inset = 10 }) {
  const tr = useT();
  const credit = photoCredit(race);
  if (!credit) return null;
  const full = tr('photo.credit', credit);
  return (
    <a href={credit.url} target="_blank" rel="noopener noreferrer" title={full} aria-label={full} style={{
      position: 'absolute', right: inset, bottom: 6, maxWidth: `calc(100% - ${inset * 2}px)`,
      display: 'flex', whiteSpace: 'nowrap', fontSize: 9, lineHeight: '12px', letterSpacing: '0.02em',
      color: 'rgba(255,255,255,0.55)', textDecoration: 'none', ...FONT_DATA,
    }}>
      {/* 작가 이름이 길면 이름만 줄임표, 라이선스는 항상 보인다. */}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{tr('photo.by', credit)}</span>
      <span style={{ flex: 'none' }}>&nbsp;· {credit.license}</span>
    </a>
  );
}
