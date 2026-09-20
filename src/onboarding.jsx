import { useEffect, useRef, useState } from 'react';
import { TOKENS, Mono, SeriesTag } from './primitives.jsx';
import { SERIES, SUPPORTED_SERIES } from './schedule/index.js';
import { MODE_OPTIONS, COUNTRY_OPTIONS, guessCountryFromTimezone, countryValueFromId, readTheme } from './preferences-options.js';
import { PageTitle, SeriesRow, ChoiceGroup, CountryChoices, TimezoneLabel } from './preferences-ui.jsx';

const TOTAL_STEPS = 3;

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
    setCountry(countryValueFromId(countryId));
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

  const countryLabel = COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label ?? '그 외';

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
              <PageTitle theme={theme} title="어떤 시리즈에 관심이 있나요?" sub="여러 개 고를 수 있어요. 나중에 바꿀 수 있습니다." />
              <div style={{ display: 'grid', gap: 8 }} role="group" aria-label="관심 시리즈">
                {SUPPORTED_SERIES.map((id) => (
                  <SeriesRow key={id} seriesId={id} theme={theme} selected={selected.has(id)} onToggle={() => toggleSeries(id)} />
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <PageTitle theme={theme} title="어디까지 챙겨 볼까요?" sub="시리즈별로 알림과 일정에 표시할 세션 범위예요." />
              <div style={{ display: 'grid', gap: 20 }}>
                {selectedList.map((id) => (
                  <div key={id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <SeriesTag series={id} theme={theme} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>{SERIES[id].name}</span>
                    </div>
                    <ChoiceGroup theme={theme} options={MODE_OPTIONS} value={modes[id] || 'all'}
                      onChange={(mode) => setModes((prev) => ({ ...prev, [id]: mode }))}
                      label={`${SERIES[id].name} 관심 수준`} />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <PageTitle theme={theme}
                title={`중계 정보를 ${countryLabel} 기준으로 보여드릴게요`}
                sub={<>감지된 시간대 <TimezoneLabel theme={theme} timezone={preferences.timezone} /> 를 바탕으로 골랐어요. 다르면 바꿔주세요.</>} />
              <CountryChoices theme={theme} value={countryId} onChange={setCountryId} />
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
