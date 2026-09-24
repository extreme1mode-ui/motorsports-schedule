import { useEffect, useRef, useState } from 'react';
import { TOKENS, Mono, SeriesTag } from './primitives.jsx';
import { SERIES, SUPPORTED_SERIES } from './schedule/index.js';
import { MODE_OPTIONS, COUNTRY_OPTIONS, guessCountryFromTimezone, countryValueFromId, readTheme } from './preferences-options.js';
import { PageTitle, SeriesRow, ChoiceGroup, CountryChoices, TimezoneLabel } from './preferences-ui.jsx';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { GantryLockup } from './Brand.jsx';

const TOTAL_STEPS = 3;

export function Onboarding({ preferences, setSeriesMode, setCountry, setOnboarded }) {
  const [theme] = useState(readTheme);
  const t = TOKENS[theme];
  const tr = useT();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [modes, setModes] = useState({});
  const [countryId, setCountryId] = useState(() => guessCountryFromTimezone(preferences.timezone));
  const stepRef = useRef(null);

  // 스텝이 바뀌면 포커스를 스텝 컨테이너로 옮겨 탭 순서를 처음부터 시작한다.
  useEffect(() => { stepRef.current?.focus(); }, [step]);

  // 계측: 온보딩 진입 1회 (StrictMode 이중 effect 방지).
  const startedRef = useRef(false);
  useEffect(() => { if (!startedRef.current) { startedRef.current = true; track('onboarding_started'); } }, []);

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
    track('onboarding_step_completed', { step });
    if (step < TOTAL_STEPS) setStep(step + 1);
    else finish();
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // 커밋 순서 고정: 시리즈 → 국가 → onboarded(마지막).
  const finish = () => {
    const chosen = SUPPORTED_SERIES.filter((id) => selected.has(id)).map((id) => modes[id] || 'all');
    track('onboarding_completed', { series_on: chosen.length, series_all: chosen.filter((m) => m === 'all').length, series_race: chosen.filter((m) => m === 'race').length });
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, selected.has(id) ? (modes[id] || 'all') : 'off'));
    setCountry(countryValueFromId(countryId));
    window.__gantrySplash?.play({ caption: tr('brand.ready') });   // 라이츠아웃 전환으로 앱에 들어간다
    setOnboarded(true);
  };

  // 건너뛰기도 국가는 채운다 — null이면 중계처 필터가 global만 통과시켜 국내 중계처(쿠팡플레이 등)가 사라진다.
  // 3단계에서 쓰는 시간대 기반 추정값을 그대로 쓰고, 설정에서 언제든 바꿀 수 있다. 커밋 순서는 finish와 같다.
  const skip = () => {
    track('onboarding_skipped', { step });
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, 'all'));
    setCountry(countryValueFromId(countryId));
    window.__gantrySplash?.play({ caption: tr('brand.ready') });
    setOnboarded(true);
  };

  const onKeyDown = (e) => {
    // 선택 항목(button)에 포커스가 있을 때의 Enter는 그 항목의 토글로 두고,
    // 컨테이너 자체에 포커스가 있을 때만 Enter로 다음 스텝으로 넘어간다.
    if (e.key === 'Enter' && e.target === stepRef.current) { e.preventDefault(); goNext(); }
  };

  const countryLabel = tr(COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label ?? 'country.OTHER');

  return (
    <div style={{
      minHeight: '100dvh', background: t.bg, color: t.text,
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        maxWidth: 560, margin: '0 auto', padding: '20px 20px 32px',
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ marginBottom: 28, color: t.text }}><GantryLockup height={14} /></div>

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
            background: 'none', border: 0, minHeight: 44, minWidth: 44, padding: '8px 0 8px 12px', margin: '-6px 0', color: t.text3,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{tr('ob.skip')}</button>
        </div>

        {/* 스텝 본문 */}
        <div ref={stepRef} tabIndex={-1} onKeyDown={onKeyDown} style={{ outline: 'none', flex: 1 }}
          aria-label={tr('ob.stepAria', { step })}>
          {step === 1 && (
            <>
              <PageTitle theme={theme} title={tr('ob.s1.title')} sub={tr('ob.s1.sub')} />
              <div style={{ display: 'grid', gap: 8 }} role="group" aria-label={tr('ob.s1.aria')}>
                {SUPPORTED_SERIES.map((id) => (
                  <SeriesRow key={id} seriesId={id} theme={theme} selected={selected.has(id)} onToggle={() => toggleSeries(id)} />
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <PageTitle theme={theme} title={tr('ob.s2.title')} sub={tr('ob.s2.sub')} />
              <div style={{ display: 'grid', gap: 20 }}>
                {selectedList.map((id) => (
                  <div key={id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <SeriesTag series={id} theme={theme} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>{SERIES[id].name}</span>
                    </div>
                    <ChoiceGroup theme={theme} options={MODE_OPTIONS} value={modes[id] || 'all'}
                      onChange={(mode) => setModes((prev) => ({ ...prev, [id]: mode }))}
                      label={tr('ob.levelAria', { series: SERIES[id].name })} />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <PageTitle theme={theme}
                title={tr('ob.s3.title', { country: countryLabel })}
                sub={<>{tr('ob.s3.subBefore')}<TimezoneLabel theme={theme} timezone={preferences.timezone} />{tr('ob.s3.subAfter')}</>} />
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
            }}>{tr('ob.back')}</button>
          )}
          <button type="button" onClick={goNext} disabled={!canNext} style={{
            flex: 1, height: 52, borderRadius: 14, border: 0, cursor: canNext ? 'pointer' : 'default',
            background: t.text, color: t.bg, opacity: canNext ? 1 : 0.35,
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          }}>{step < TOTAL_STEPS ? tr('ob.next') : tr('ob.start')}</button>
        </div>
      </div>
    </div>
  );
}
