// 스크린리더 전용 텍스트(시각적으로 숨김). 컴포넌트 파일에 상수를 두면 react-refresh 규칙에 걸려 따로 둔다.
export const SR_ONLY = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
