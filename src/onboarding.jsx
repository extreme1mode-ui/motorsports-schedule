// 온보딩 3단계(시리즈 → 관심 수준 → 국가). 단계·커밋 순서·건너뛰기 규칙은 기존과 같다.
// v1.1: 데스크톱은 왼쪽 브랜드 면(단계마다 심볼의 열이 하나씩 더 켜짐) + 오른쪽 폼. 모바일은 폼만.
import { useEffect, useRef, useState } from 'react';
import './onboarding.css';
import { SERIES, SUPPORTED_SERIES } from './schedule/index.js';
import { MODE_OPTIONS, COUNTRY_OPTIONS, SERIES_DESCRIPTION_KEYS, guessCountryFromTimezone, countryValueFromId } from './preferences-options.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { GantryLockup, GantrySymbol } from './Brand.jsx';

const TOTAL = 3;
const LIT = [0, 2, 3, 5];

function Tag({ id }) {
  return <span className="ob-tag"><i style={{ background: `var(--${id.toLowerCase()})` }} />{id}</span>;
}

export function Onboarding({ preferences, setSeriesMode, setCountry, setOnboarded }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [modes, setModes] = useState({});
  const [countryId, setCountryId] = useState(() => guessCountryFromTimezone(preferences.timezone));
  const stepRef = useRef(null);
  useEffect(() => { stepRef.current?.focus({ preventScroll: true }); }, [step]);
  const startedRef = useRef(false);
  useEffect(() => { if (!startedRef.current) { startedRef.current = true; track('onboarding_started'); } }, []);

  const selectedList = SUPPORTED_SERIES.filter((id) => selected.has(id));
  const canNext = step !== 1 || selected.size > 0;
  const toggle = (id) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const finish = () => {
    const chosen = SUPPORTED_SERIES.filter((id) => selected.has(id)).map((id) => modes[id] || 'all');
    track('onboarding_completed', { series_on: chosen.length, series_all: chosen.filter((m) => m === 'all').length, series_race: chosen.filter((m) => m === 'race').length });
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, selected.has(id) ? (modes[id] || 'all') : 'off'));
    setCountry(countryValueFromId(countryId));
    window.__gantrySplash?.play({ caption: t('brand.ready') });
    setOnboarded(true);
  };
  const skip = () => {
    track('onboarding_skipped', { step });
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, 'all'));
    setCountry(countryValueFromId(countryId));
    window.__gantrySplash?.play({ caption: t('brand.ready') });
    setOnboarded(true);
  };
  const next = () => { if (!canNext) return; track('onboarding_step_completed', { step }); if (step < TOTAL) setStep(step + 1); else finish(); };
  const onKeyDown = (e) => { if (e.key === 'Enter' && e.target === stepRef.current) { e.preventDefault(); next(); } };
  const countryLabel = t(COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label ?? 'country.OTHER');

  return (
    <div className="ob">
      <aside className="ob-side" aria-hidden="true">
        <div className="ob-grid" />
        <div className="ob-side-top"><GantryLockup height={16} /></div>
        <div className="ob-side-mid">
          <div className="ob-sym"><GantrySymbol size={112} lit={LIT[step]} /></div>
          <h2 dangerouslySetInnerHTML={{ __html: t('ob.side.title') }} />
          <p>{t('ob.side.sub')}</p>
        </div>
        <div className="ob-side-foot">
          <span>Know when it’s lights out.</span>
          <span className="ob-lamps">{[1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : undefined} />)}</span>
        </div>
      </aside>

      <main className="ob-form">
        <div className="ob-mlock"><GantryLockup height={14} /></div>
        <div className="ob-prog">
          <div className="ob-steps" aria-hidden="true">{Array.from({ length: TOTAL }, (_, i) => <i key={i} className={i < step ? 'on' : undefined} />)}<span>{step}/{TOTAL}</span></div>
          <button type="button" className="ob-skip" onClick={skip}>{t('ob.skip')}</button>
        </div>

        <div ref={stepRef} tabIndex={-1} onKeyDown={onKeyDown} className="ob-step" key={step} aria-label={t('ob.stepAria', { step })}>
          {step === 1 && (
            <>
              <h1 data-view-title tabIndex={-1}>{t('ob.s1.title')}</h1>
              <p className="ob-lead">{t('ob.s1.sub')}</p>
              <div className="ob-list" role="group" aria-label={t('ob.s1.aria')}>
                {SUPPORTED_SERIES.map((id) => (
                  <button key={id} type="button" role="checkbox" aria-checked={selected.has(id)} className="ob-opt check" onClick={() => toggle(id)}>
                    <span className="ob-dot" />
                    <span className="ob-opt-body">
                      <span className="ob-opt-head"><Tag id={id} /><span className="ob-sub">{SERIES[id].name}</span></span>
                      <span className="ob-desc">{t(SERIES_DESCRIPTION_KEYS[id])}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h1 data-view-title tabIndex={-1}>{t('ob.s2.title')}</h1>
              <p className="ob-lead">{t('ob.s2.sub')}</p>
              <div className="ob-list">
                {selectedList.map((id) => (
                  <div key={id} className="ob-card">
                    <div className="ob-opt-head"><Tag id={id} /><span className="ob-sub">{SERIES[id].name}</span></div>
                    <div className="ob-radios" role="radiogroup" aria-label={t('ob.levelAria', { series: SERIES[id].name })}>
                      {MODE_OPTIONS.map((o) => (
                        <button key={o.id} type="button" role="radio" aria-checked={(modes[id] || 'all') === o.id} onClick={() => setModes((p) => ({ ...p, [id]: o.id }))}>
                          {t(o.label)}<small>{t(o.sub)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h1 data-view-title tabIndex={-1}>{t('ob.s3.title', { country: countryLabel })}</h1>
              <p className="ob-lead">{t('ob.s3.subBefore')}<b>{preferences.timezone}</b>{t('ob.s3.subAfter')}</p>
              <div className="ob-list" role="radiogroup" aria-label={t('aria.country')}>
                {COUNTRY_OPTIONS.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={countryId === c.id} className="ob-opt center" onClick={() => setCountryId(c.id)}>
                    <span className="ob-dot" /><span className="ob-name">{t(c.label)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ob-actions">
          {step > 1 && <button type="button" className="ob-btn line" onClick={() => setStep((s) => Math.max(1, s - 1))}>{t('ob.back')}</button>}
          <button type="button" className="ob-btn primary" disabled={!canNext} onClick={next}>{step < TOTAL ? t('ob.next') : t('ob.start')}</button>
        </div>
      </main>
    </div>
  );
}
