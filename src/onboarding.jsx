import { useEffect, useRef, useState } from 'react';
import { TOKENS, Mono, SeriesTag } from './primitives.jsx';
import { SERIES, SUPPORTED_SERIES } from './schedule/index.js';

const TOTAL_STEPS = 3;

// 처음 접하는 사용자를 위한 한 줄 설명. 문구는 추후 직접 다듬을 것.
const SERIES_DESCRIPTIONS = {
  F1: '세계 최고 수준의 싱글시터 레이싱. 예선·스프린트·결승으로 한 주말이 구성됩니다.',
  WEC: '르망 24시를 포함한 세계 내구 레이스 선수권. 한 경기가 6~24시간 이어집니다.',
  IMSA: '데이토나 24시, 세브링 12시 등 북미에서 열리는 스포츠카 내구 레이스.',
  WRC: '포장도로·자갈·눈길 등 일반 도로를 달리는 세계 랠리 선수권.',
  GTWC: '양산차 기반 GT카로 겨루는 스프린트·내구 레이스 시리즈.',
};

const MODE_OPTIONS = [
  { id: 'all', label: '전체 세션', sub: '예선·스프린트까지 전부' },
  { id: 'race', label: '본경기만', sub: '결승만' },
];

// value가 null이면 "아직 모름"으로 저장된다 (usePreferences.country 규칙).
const COUNTRY_OPTIONS = [
  { id: 'KR', value: 'KR', label: '한국' },
  { id: 'JP', value: 'JP', label: '일본' },
  { id: 'US', value: 'US', label: '미국' },
  { id: 'GB', value: 'GB', label: '영국' },
  { id: 'OTHER', value: null, label: '그 외' },
];

const TIMEZONE_COUNTRY = {
  'Asia/Seoul': 'KR',
  'Asia/Tokyo': 'JP',
  'Europe/London': 'GB',
};

function guessCountryFromTimezone(tz) {
  if (!tz) return 'OTHER';
  if (TIMEZONE_COUNTRY[tz]) return TIMEZONE_COUNTRY[tz];
  if (tz.startsWith('America/') || tz === 'Pacific/Honolulu') return 'US';
  return 'OTHER';
}

function readTheme() {
  try { return localStorage.getItem('paddock.theme') || 'dark'; }
  catch { return 'dark'; }
}

export function Onboarding({ preferences, setSeriesMode, setCountry, setOnboarded }) {
  const [theme] = useState(readTheme);
  const t = TOKENS[theme];
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [modes, setModes] = useState({});
  const [countryId, setCountryId] = useState(() => guessCountryFromTimezone(preferences.timezone));
  const stepRef = useRef(null);

  // 스텝이 바뀌면 포커스를 스텝 컨테이너로 옮겨 탭 순서를 처음부터 시작한다.
  useEffect(() => { stepRef.current?.focus(); }, [step]);

  const selectedList = SUPPORTED_SERIES.filter((id) => selected.has(id));
  const canNext = step !== 1 || selected.size > 0;

  const toggleSeries = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const goNext = () => {
    if (!canNext) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else finish();
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // 커밋 순서 고정: 시리즈 → 국가 → onboarded(마지막).
  const finish = () => {
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, selected.has(id) ? (modes[id] || 'all') : 'off'));
    setCountry(COUNTRY_OPTIONS.find((c) => c.id === countryId)?.value ?? null);
    setOnboarded(true);
  };

  const skip = () => {
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, 'all'));
    setOnboarded(true);
  };

  const onKeyDown = (e) => {
    // 선택 항목(button)에 포커스가 있을 때의 Enter는 그 항목의 토글로 두고,
    // 컨테이너 자체에 포커스가 있을 때만 Enter로 다음 스텝으로 넘어간다.
    if (e.key === 'Enter' && e.target === stepRef.current) { e.preventDefault(); goNext(); }
  };

  const optionBase = {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56,
    padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
    fontFamily: 'inherit', color: t.text, background: t.surface,
    borderWidth: 1, borderStyle: 'solid', borderColor: t.line,
  };
  const optionSelected = { background: t.surface2, borderColor: t.line2 };

  return (
    <div style={{
      minHeight: '100dvh', background: t.bg, color: t.text,
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        maxWidth: 560, margin: '0 auto', padding: '20px 20px 32px',
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      }}>
        {/* 진행 표시 + 건너뛰기 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }} aria-hidden>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < step ? t.text : t.line2 }} />
              ))}
            </div>
            <Mono size={12} color={t.text3}>{step}/{TOTAL_STEPS}</Mono>
          </div>
          <button type="button" onClick={skip} style={{
            background: 'none', border: 0, padding: '8px 0 8px 12px', color: t.text3,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>건너뛰기</button>
        </div>

        {/* 스텝 본문 */}
        <div ref={stepRef} tabIndex={-1} onKeyDown={onKeyDown} style={{ outline: 'none', flex: 1 }}
          aria-label={`온보딩 ${step}단계`}>
          {step === 1 && (
            <>
              <StepTitle t={t} title="어떤 시리즈에 관심이 있나요?" sub="여러 개 고를 수 있어요. 나중에 바꿀 수 있습니다." />
              <div style={{ display: 'grid', gap: 8 }} role="group" aria-label="관심 시리즈">
                {SUPPORTED_SERIES.map((id) => {
                  const s = SERIES[id];
                  const on = selected.has(id);
                  return (
                    <button key={id} type="button" role="checkbox" aria-checked={on} onClick={() => toggleSeries(id)}
                      style={{ ...optionBase, ...(on ? optionSelected : null), alignItems: 'flex-start' }}>
                      <CheckDot on={on} accent={s.accent} t={t} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.005em' }}>{s.short}</span>
                          <span style={{ fontSize: 12, color: t.text3 }}>{s.name}</span>
                        </div>
                        <div style={{ fontSize: 13, color: t.text2, marginTop: 4, lineHeight: 1.45 }}>{SERIES_DESCRIPTIONS[id]}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepTitle t={t} title="어디까지 챙겨 볼까요?" sub="시리즈별로 알림과 일정에 표시할 세션 범위예요." />
              <div style={{ display: 'grid', gap: 20 }}>
                {selectedList.map((id) => {
                  const mode = modes[id] || 'all';
                  return (
                    <div key={id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <SeriesTag series={id} theme={theme} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>{SERIES[id].name}</span>
                      </div>
                      <div role="radiogroup" aria-label={`${SERIES[id].name} 관심 수준`}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {MODE_OPTIONS.map((opt) => {
                          const on = mode === opt.id;
                          return (
                            <button key={opt.id} type="button" role="radio" aria-checked={on}
                              onClick={() => setModes((prev) => ({ ...prev, [id]: opt.id }))}
                              style={{ ...optionBase, ...(on ? optionSelected : null), flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: on ? t.text : t.text2 }}>{opt.label}</span>
                              <span style={{ fontSize: 12, color: t.text3 }}>{opt.sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle t={t}
                title={`중계 정보를 ${COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label ?? '그 외'} 기준으로 보여드릴게요`}
                sub={<>감지된 시간대 <Mono size={12} color={t.text3}>{preferences.timezone}</Mono> 를 바탕으로 골랐어요. 다르면 바꿔주세요.</>} />
              <div style={{ display: 'grid', gap: 8 }} role="radiogroup" aria-label="국가">
                {COUNTRY_OPTIONS.map((c) => {
                  const on = countryId === c.id;
                  return (
                    <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCountryId(c.id)}
                      style={{ ...optionBase, ...(on ? optionSelected : null) }}>
                      <CheckDot on={on} accent={t.text} t={t} />
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 하단 액션 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
          {step > 1 && (
            <button type="button" onClick={goBack} style={{
              flex: '0 0 auto', minWidth: 88, height: 52, borderRadius: 14, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${t.line2}`, color: t.text2,
              fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
            }}>이전</button>
          )}
          <button type="button" onClick={goNext} disabled={!canNext} style={{
            flex: 1, height: 52, borderRadius: 14, border: 0, cursor: canNext ? 'pointer' : 'default',
            background: t.text, color: t.bg, opacity: canNext ? 1 : 0.35,
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          }}>{step < TOTAL_STEPS ? '다음' : '시작하기'}</button>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ t, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, color: t.text }}>{title}</h1>
      {sub && <p style={{ margin: '8px 0 0', fontSize: 14, color: t.text2, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

// 선택 표시. 시리즈 색은 선택된 상태의 이 점에만 쓴다.
function CheckDot({ on, accent, t }) {
  return (
    <span aria-hidden style={{
      flex: '0 0 auto', width: 22, height: 22, borderRadius: '50%', marginTop: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: on ? accent : 'transparent', border: `1.5px solid ${on ? accent : t.line2}`,
      transition: 'background 0.15s, border-color 0.15s',
    }}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.bg} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
    </span>
  );
}
