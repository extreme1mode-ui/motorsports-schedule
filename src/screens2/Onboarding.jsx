// 온보딩(UX v2 SPEC 7장): 가치 화면 → 시리즈 고르기 → 고른 시리즈마다 질문(누르면 260ms 뒤 다음) → 미리보기(홈과 같은 시간표) → 시작하기.
// 국가 단계는 없다: 처음 온보딩이거나 country가 null일 때만 시간대로 추정해 저장한다(설정에서 다시 하기는 country를 건드리지 않는다).
// 진행 막대 하나(시리즈 고르기 25%, 나머지를 질문 수로 나눔), 단계마다 제목으로 포커스.
// 건너뛰기(결정 16·L15): 고른 시리즈는 남은 질문을 '다 볼래요', 안 고른 시리즈는 '안 보기'. 아무것도 안 골랐으면 모두 '전체 세션'.
// 설정에서 다시 열면(rerun) 지금 설정을 미리 고르고 건너뛰기 대신 X(닫기, 설정은 그대로).
// Root가 그린다(지금처럼 셸 바깥). 데스크톱도 사이드바까지 덮는 전체 화면이고 내용은 가운데 560 열.
import { useEffect, useMemo, useRef, useState } from 'react';
import './screens2.css';
import './onb2.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { SUPPORTED_SERIES, SERIES, getCurrentNow, useScheduleData } from '../schedule/index.js';
import { COUNTRY_OPTIONS, guessCountryFromTimezone, countryValueFromId, countryIdFromValue } from '../preferences-options.js';
import { getPrimarySession } from '../schedule/utils.js';
import { getRaceState, isCancelled } from '../home/time.js';
import { groupRaceWeeks, getWeekName } from '../home/weeks.js';
import { buildHomePlan } from '../home/plan.js';
import { PreviewDays } from '../home/Home.jsx';
import { storage } from '../storage/index.js';
import { GantryLockup } from '../Brand.jsx';
import { Icon } from '../ui2/Icon.jsx';
import { SeriesTile } from '../ui2/parts.jsx';
import { IS_TOSS, useSystemBack } from '../platform.js';

const ADVANCE_MS = 260;
const cx = (...list) => list.filter(Boolean).join(' ');
// 언어 이름은 번역하지 않는다(각 언어의 자기 표기)
const LOCALE_NAME = { ko: '한국어', en: 'English' };

export function OnboardingScreen({ preferences, setSeriesMode, setCountry, setLocale, setOnboarded, rerun = false, onClose, onEnd }) {
  const fmt = useFormat(); const tr = useT();
  const [now] = useState(() => getCurrentNow());
  const at = now.getTime();
  const schedule = useScheduleData(now);
  const races = useMemo(() => (Array.isArray(schedule.races) ? schedule.races : []), [schedule.races]);
  const [favorites] = useState(() => storage.favorites.read());

  const current = (s) => preferences?.series?.[s] || 'off';
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(() => (rerun ? SUPPORTED_SERIES.filter((s) => current(s) !== 'off') : []));
  const [modes, setModes] = useState(() => (rerun ? Object.fromEntries(SUPPORTED_SERIES.filter((s) => current(s) !== 'off').map((s) => [s, current(s)])) : {}));
  const [chosen, setChosen] = useState(null);
  const doneStep = 2 + picked.length;   // 0 가치 · 1 시리즈 · 2..k 시리즈별 질문 · 마지막 미리보기
  const finalModes = useMemo(() => Object.fromEntries(SUPPORTED_SERIES.map((s) => [s, picked.includes(s) ? (modes[s] || 'all') : 'off'])), [picked, modes]);

  // 계측: 온보딩 진입 1회(StrictMode 이중 effect 방지)
  const startedRef = useRef(false);
  useEffect(() => { if (!startedRef.current) { startedRef.current = true; track('onboarding_started'); } }, []);

  // 단계가 바뀌면 그 단계 제목으로 포커스(누른 버튼이 사라져도 길을 잃지 않게). 처음 뜰 때는 옮기지 않는다
  const h1 = useRef(null);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } h1.current?.focus({ preventScroll: true }); }, [step]);

  // 질문: 고른 뒤 260ms 동안은 넘어가는 중 — 그 사이 누름(두 번 누르기·뒤로)은 무시한다
  const advancing = useRef(null);
  useEffect(() => () => clearTimeout(advancing.current), []);
  const answer = (s, m) => {
    if (advancing.current) return;
    setChosen(m); setModes((o) => ({ ...o, [s]: m }));
    const last = step === doneStep - 1;
    advancing.current = setTimeout(() => {
      advancing.current = null; setChosen(null);
      if (last) track('onboarding_step_completed', { step: 2 });
      setStep((x) => x + 1);
    }, ADVANCE_MS);
  };
  const back = () => { if (advancing.current) return; if (step > 0) setStep(step - 1); };
  // 토스 시스템 뒤로: 이전 단계, 첫 단계면 다시 하기는 닫기. 처음 온보딩의 첫 단계는 구독하지 않아 토스 기본 동작(미니앱 종료)
  useSystemBack(IS_TOSS && (step > 0 || rerun), () => { if (step > 0) back(); else onClose?.(); });
  // 설정에서 다시 연 경우 Esc = X(닫기, 설정은 그대로)
  useEffect(() => {
    if (!rerun) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rerun, onClose]);

  // 커밋 순서 고정: 시리즈 → 국가(처음이거나 비었을 때만) → onboarded(마지막). 스플래시 재생은 지금 그대로
  const commit = (next) => {
    SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, next[id]));
    // 토스는 나라가 대한민국 고정
    if (!rerun || preferences.country == null) setCountry(countryValueFromId(IS_TOSS ? 'KR' : guessCountryFromTimezone(preferences.timezone)));
    window.__gantrySplash?.play({ caption: tr('brand.ready') });
    setOnboarded(true);
  };
  const finish = () => {
    track('onboarding_step_completed', { step: 3 });
    const chosenModes = SUPPORTED_SERIES.filter((s) => picked.includes(s)).map((s) => modes[s] || 'all');
    track('onboarding_completed', { series_on: chosenModes.length, series_all: chosenModes.filter((m) => m === 'all').length, series_race: chosenModes.filter((m) => m === 'race').length });
    commit(finalModes);
    onEnd?.({ text: tr('ob.toast.done', { n: picked.length }) });
  };
  const skip = () => {
    // step: 가치 화면 0 · 시리즈 1 · 질문(몇 번째든) 2 · 미리보기 3
    track('onboarding_skipped', { step: step === 0 ? 0 : step === 1 ? 1 : step < doneStep ? 2 : 3 });
    if (!picked.length) { commit(Object.fromEntries(SUPPORTED_SERIES.map((s) => [s, 'all']))); onEnd?.({ text: tr('ob.toast.skipAll') }); return; }
    commit(finalModes);
    onEnd?.({ text: tr('ob.toast.done', { n: picked.length }) });
  };
  const changeLocale = () => {
    const to = (preferences.locale || 'ko') === 'ko' ? 'en' : 'ko';
    track('locale_changed', { to, source: 'onboarding' });
    setLocale(to);
  };

  // 가치 화면: 이번(다음) 주말 전체 시리즈 경기
  const value = useMemo(() => {
    const alive = races.filter((r) => !isCancelled(r) && !['done', 'cancelled'].includes(getRaceState(r, at)));
    const wk = groupRaceWeeks(alive, { timeZone: fmt.timeZone })[0] || null;
    if (!wk) return null;
    const name = getWeekName(wk, at, { locale: fmt.locale, timeZone: fmt.timeZone, races: alive }).main;
    return { name, races: wk.races.slice(0, 4), n: new Set(wk.races.map((r) => r.series)).size };
  }, [races, at, fmt.timeZone, fmt.locale]);
  // 미리보기: 홈과 같은 계산(즐겨찾기 포함)
  const plan = useMemo(() => (step === doneStep
    ? buildHomePlan(races, { preferences: { ...preferences, series: finalModes }, favorites, now: at, timeZone: fmt.timeZone })
    : null), [step, doneStep, races, preferences, finalModes, favorites, at, fmt.timeZone]);

  // 진행 막대 하나: 시리즈 고르기 25%, 질문마다 나머지를 나눠 채운다(더 고른다고 뒤로 가지 않게)
  const progress = step <= 1 ? 0.25 : 0.25 + 0.75 * ((step - 1) / (picked.length + 1));
  const countryId = rerun && preferences.country != null ? countryIdFromValue(preferences.country) : IS_TOSS ? 'KR' : guessCountryFromTimezone(preferences.timezone);
  const countryText = (fmt.locale === 'ko' && countryId === 'KR') ? '국내' : tr(COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label || 'country.OTHER');

  let body = null;
  if (step === 0) {
    body = (
      <>
        <div className="gx-onb-head"><h1 className="gx-t26 gx-pre" ref={h1} tabIndex={-1}>{value ? tr('ob.v.title', { week: value.name, n: value.n }) : tr('ob.v.titleNone')}</h1><span className="gx-t15 gx-sub">{tr('ob.v.sub')}</span></div>
        {value && (
          <div className="gx-onb-card">
            {value.races.map((r) => {
              const start = getPrimarySession(r)?.startUtc;
              return (
                <div key={r.id} className="gx-row is-static">
                  <SeriesTile id={r.series} />
                  <span className="gx-row-c"><span className="gx-t17 gx-w600">{fmt.race(r).shortName}</span><span className="gx-row-s gx-t13">{start ? `${fmt.dayDate(start)} ${fmt.time(start)}` : tr('status.tba')}</span></span>
                </div>
              );
            })}
          </div>
        )}
        <ul className="gx-onb-values">
          <li><Icon n="cal" s={22} /><span className="gx-t15">{tr('ob.v.b1', { zone: fmt.zoneLabel })}</span></li>
          <li><Icon n="tv" s={22} /><span className="gx-t15">{tr('ob.v.b2')}</span></li>
          <li><Icon n="heart" s={22} /><span className="gx-t15">{tr('ob.v.b3')}</span></li>
        </ul>
      </>
    );
  } else if (step === 1) {
    body = (
      <>
        <div className="gx-onb-head"><h1 className="gx-t26" ref={h1} tabIndex={-1}>{tr('ob.s1.title')}</h1><span className="gx-t15 gx-sub">{tr('ob.s1.sub')}</span></div>
        <div role="group" aria-label={tr('ob.s1.title')}>
          {SUPPORTED_SERIES.map((s) => {
            const on = picked.includes(s);
            return (
              <button type="button" key={s} className={cx('gx-row gx-onb-pick', on && 'is-on')} aria-pressed={on}
                onClick={() => setPicked(on ? picked.filter((x) => x !== s) : SUPPORTED_SERIES.filter((x) => x === s || picked.includes(x)))}>
                <SeriesTile id={s} size={44} />
                <span className="gx-row-c"><span className="gx-t17 gx-w600">{SERIES[s]?.name || s}</span><span className="gx-row-s gx-t13">{tr(`series.${s}.desc`)}</span></span>
                <span className={cx('gx-check', on && 'is-on')} aria-hidden="true"><Icon n="check" s={18} /></span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else if (step < doneStep) {
    const s = picked[step - 2];
    const sel = chosen || modes[s];
    const opts = [
      ['all', tr('ob.q.all'), tr(s === 'F1' || s === 'WRC' ? `ob.q.allDesc.${s}` : 'ob.q.allDesc')],
      ['race', tr(s === 'WRC' ? 'ob.q.race.WRC' : 'ob.q.race'), tr(s === 'F1' || s === 'WRC' ? `ob.q.raceDesc.${s}` : 'ob.q.raceDesc')],
    ];
    body = (
      <>
        <div className="gx-onb-head"><h1 className="gx-t26 gx-pre" ref={h1} tabIndex={-1}>{tr('ob.q.title', { series: s })}</h1><span className="gx-t15 gx-sub">{tr(`series.${s}.name`)}</span></div>
        <div className="gx-onb-opts" role="group" aria-label={tr('ob.q.title', { series: s }).replace('\n', ' ')}>
          {opts.map(([m, l, d]) => (
            <button type="button" key={m} className={cx('gx-onb-opt', sel === m && 'is-on')} aria-pressed={sel === m} onClick={() => answer(s, m)}>
              <span className="gx-t20 gx-w600">{l}</span><span className="gx-t15 gx-sub">{d}</span>
            </button>
          ))}
        </div>
      </>
    );
  } else if (plan) {
    const n = plan.days.reduce((a, d) => a + d.items.length, 0);
    const has = !!plan.heroWeek && plan.days.length > 0;
    body = (
      <>
        <div className="gx-onb-head">
          <h1 className="gx-t26 gx-pre" ref={h1} tabIndex={-1}>{has ? tr('ob.d.title', { n }) : tr('ob.d.title', { n }).split('\n')[0]}</h1>
          <span className="gx-t15 gx-sub">{has ? tr('ob.d.sub') : plan.hero ? tr('ob.d.nextOnly', { name: fmt.race(plan.hero).shortName }) : tr('ob.d.none')}</span>
        </div>
        {has && <div className="gx-onb-card gx-onb-tl"><PreviewDays plan={plan} now={at} /></div>}
        <p className="gx-onb-note gx-t13 gx-ter">{tr('ob.d.foot', { zone: fmt.zoneLabel, country: countryText })}</p>
      </>
    );
  }

  return (
    <div className="gx-onb">
      <div className="gx-onb-top">
        {/* 토스: 뒤로는 네이티브 내비 바, 로고 자리는 비운다 */}
        {IS_TOSS ? <span className="gx-onb-brand" />
          : step > 0
            ? <button type="button" className="gx-iconbtn" aria-label={tr('ob.back')} onClick={back}><Icon n="back" /></button>
            : <span className="gx-onb-brand"><GantryLockup height={12} /></span>}
        {step > 0 && step < doneStep && (
          <span className="gx-onb-prog" role="progressbar" aria-label={tr('ob.progressAria', { total: doneStep - 1, step })} aria-valuemin={0} aria-valuemax={doneStep - 1} aria-valuenow={step}>
            <i style={{ width: `${progress * 100}%` }} />
          </span>
        )}
        <span className="gx-onb-tr">
          {step === 0 && !IS_TOSS && <button type="button" className="gx-textbtn gx-t15" lang={(preferences.locale || 'ko') === 'ko' ? 'en' : 'ko'} onClick={changeLocale}>{LOCALE_NAME[(preferences.locale || 'ko') === 'ko' ? 'en' : 'ko']}</button>}
          {rerun
            ? <button type="button" className="gx-iconbtn" aria-label={tr('ob.closeAria')} onClick={onClose}><Icon n="close" /></button>
            : step < doneStep && <button type="button" className="gx-textbtn gx-t15" onClick={skip}>{tr('ob.skip')}</button>}
        </span>
      </div>
      <div className="gx-onb-body">{body}</div>
      <div className="gx-onb-cta">
        {step === 0 && <button type="button" className="gx-btn is-primary is-full" onClick={() => setStep(1)}>{tr('ob.v.cta')}</button>}
        {step === 1 && (
          <button type="button" className="gx-btn is-primary is-full" disabled={!picked.length}
            onClick={() => { track('onboarding_step_completed', { step: 1 }); setStep(2); }}>{picked.length ? tr('ob.next') : tr('ob.s1.pickOne')}</button>
        )}
        {step >= 2 && step < doneStep && <span className="gx-t13 gx-ter gx-onb-hint">{tr('ob.q.hint')}</span>}
        {step === doneStep && <button type="button" className="gx-btn is-primary is-full" onClick={finish}>{tr('ob.start')}</button>}
      </div>
    </div>
  );
}
