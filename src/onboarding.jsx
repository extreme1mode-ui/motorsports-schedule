import { useEffect, useRef, useState } from 'react';
import { SeriesTag } from './primitives.jsx';
import { Group, Segmented } from './ui.jsx';
import { SERIES, SUPPORTED_SERIES } from './schedule/index.js';
import { MODE_OPTIONS, COUNTRY_OPTIONS, guessCountryFromTimezone, countryValueFromId } from './preferences-options.js';
import { PageTitle, SeriesRow, ChoiceGroup, CountryChoices } from './preferences-ui.jsx';
import { getTimeZoneLabel } from './schedule/format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { GantryLockup } from './Brand.jsx';
import { IS_TOSS, useSystemBack } from './platform.js';

// 토스 빌드는 국가 단계(3단계)를 빼고 2단계로 끝낸다. 국가는 한국으로 넣는다.
const TOTAL_STEPS = IS_TOSS ? 2 : 3;

// 언어 이름은 번역하지 않는다(각 언어의 자기 표기). 설정의 LOCALE_OPTIONS와 같다.
const LOCALES = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
];

// 언어 전환: 작은 세그먼트(테두리 알약 대신). 누르는 영역은 Segmented가 44px로 잡는다.
function LocaleSwitch({ value, onChange, label }) {
  return <Segmented size="sm" label={label} value={value} onChange={onChange} style={{ width: 150, flex: 'none' }}
    options={LOCALES.map(({ id, label: name }) => ({ id, label: <span lang={id}>{name}</span> }))} />;
}

export function Onboarding({ preferences, setSeriesMode, setCountry, setLocale, setOnboarded }) {
  const tr = useT();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [modes, setModes] = useState({});
  const [countryId, setCountryId] = useState(() => (IS_TOSS ? 'KR' : guessCountryFromTimezone(preferences.timezone)));
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
  // 토스 뒤로가기: 2단계 → 1단계. 1단계에서는 구독하지 않아 토스 기본 동작(미니앱 종료)이 된다.
  useSystemBack(IS_TOSS && step > 1, goBack);

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

  // 자동 감지가 틀렸을 때 고치는 보조 전환. 단계와 고른 값은 이 컴포넌트 상태라 그대로 남는다.
  const changeLocale = (id) => {
    if (id === preferences.locale) return;
    track('locale_changed', { to: id, source: 'onboarding' });
    setLocale(id);
  };

  const countryLabel = tr(COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label ?? 'country.OTHER');

  const bottomBtn = { height: 52, borderRadius: 'var(--r-btn)', border: 0, fontSize: 17, fontWeight: 600, fontFamily: 'inherit' };

  // AI 티 정리(C5·B2·D1, 2026-10-29): 선택 카드 → 그릇 하나 안의 줄 + 오른쪽 체크, 관심 수준은 세그먼트,
  // 시간대는 사람 말, 비활성 '다음'은 면색만 낮춘다(흐림 없음). 단계 수 숫자(1/3)는 막대만으로.
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)',
      paddingTop: IS_TOSS ? 0 : 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        maxWidth: 560, margin: '0 auto', padding: '6px 16px 24px',
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 50, padding: '0 0 0 4px', color: 'var(--text)' }}>
          <GantryLockup height={14} />
          {!IS_TOSS && <LocaleSwitch value={preferences.locale || 'ko'} onChange={changeLocale} label={tr('settings.language.title')} />}
        </div>

        {/* 진행 표시 + 건너뛰기 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
          <div style={{ display: 'flex', gap: 4 }} role="img" aria-label={tr('ob.stepAria', { step })}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i < step ? 'var(--text)' : 'var(--surface3)' }} />
            ))}
          </div>
          <button type="button" onClick={skip} style={{
            background: 'none', border: 0, minHeight: 44, minWidth: 44, padding: '8px 0 8px 12px', margin: '-6px 0', color: 'var(--text2)',
            fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{tr('ob.skip')}</button>
        </div>

        {/* 스텝 본문 */}
        <div ref={stepRef} tabIndex={-1} onKeyDown={onKeyDown} style={{ outline: 'none', flex: 1, paddingTop: 24 }}
          aria-label={tr('ob.stepAria', { step })}>
          {step === 1 && (
            <>
              <div style={{ padding: '0 4px' }}><PageTitle title={tr('ob.s1.title')} sub={tr('ob.s1.sub')} /></div>
              <Group role="group" aria-label={tr('ob.s1.aria')}>
                {SUPPORTED_SERIES.map((id) => (
                  <SeriesRow key={id} seriesId={id} selected={selected.has(id)} onToggle={() => toggleSeries(id)} />
                ))}
              </Group>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ padding: '0 4px' }}><PageTitle title={tr('ob.s2.title')} sub={tr('ob.s2.sub')} /></div>
              <Group>
                {selectedList.map((id) => (
                  <div key={id} className="g-row" style={{ display: 'block', padding: '14px 16px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <SeriesTag series={id} size={15} style={{ color: 'var(--text)', fontWeight: 700 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)' }}>{SERIES[id].name}</span>
                    </div>
                    <ChoiceGroup options={MODE_OPTIONS} value={modes[id] || 'all'}
                      onChange={(mode) => setModes((prev) => ({ ...prev, [id]: mode }))}
                      label={tr('ob.levelAria', { series: SERIES[id].name })} />
                  </div>
                ))}
              </Group>
            </>
          )}

          {step === 3 && !IS_TOSS && (
            <>
              <div style={{ padding: '0 4px' }}>
                <PageTitle title={tr('ob.s3.title', { country: countryLabel })} sub={tr('ob.s3.sub', { zone: getTimeZoneLabel(preferences.timezone, preferences.locale || 'ko') })} />
              </div>
              <CountryChoices value={countryId} onChange={setCountryId} />
            </>
          )}
        </div>

        {/* 하단 액션 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
          {step > 1 && (
            <button type="button" onClick={goBack} style={{ ...bottomBtn, flex: '0 0 96px', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)' }}>{tr('ob.back')}</button>
          )}
          <button type="button" onClick={goNext} disabled={!canNext} style={{
            ...bottomBtn, flex: 1, cursor: canNext ? 'pointer' : 'default',
            background: canNext ? 'var(--text)' : 'var(--surface2)', color: canNext ? 'var(--bg)' : 'var(--text3)',
          }}>{step < TOTAL_STEPS ? tr('ob.next') : tr('ob.start')}</button>
        </div>
      </div>
    </div>
  );
}
