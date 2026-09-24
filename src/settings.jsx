import { useRef, useState } from 'react';
import { TOKENS, FONT_DATA } from './primitives.jsx';
import { SUPPORTED_SERIES, detectTimezone } from './schedule/index.js';
import { MODE_OPTIONS_WITH_OFF, countryIdFromValue, countryValueFromId } from './preferences-options.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { GantrySymbol } from './Brand.jsx';

// 언어 이름은 번역하지 않는다(각 언어의 자기 표기). raw: true → ChoiceGroup이 t()를 거치지 않음
const LOCALE_OPTIONS = [
  { id: 'ko', label: '한국어', raw: true },
  { id: 'en', label: 'English', raw: true },
];
import { PageTitle, SectionTitle, SeriesRow, ChoiceGroup, CountryChoices, TimezoneLabel } from './preferences-ui.jsx';

// 현재 개인화 설정 → 구독 쿼리. 시리즈는 'off'가 아닌 것, level은 하나라도 'all'이면 all.
function calendarQuery(preferences) {
  const series = SUPPORTED_SERIES.filter((id) => (preferences?.series?.[id] || 'off') !== 'off');
  const level = series.some((id) => preferences.series[id] === 'all') ? 'all' : 'race';
  const params = new URLSearchParams();
  if (series.length) params.set('series', series.join(','));
  params.set('level', level);
  params.set('lang', preferences?.locale || 'ko');
  return { series, level, search: params.toString() };
}

// 온보딩에서 정한 값을 다시 바꾸는 화면. 변경은 즉시 저장된다(별도 저장 버튼 없음).
export function Settings({ theme, preferences, setSeriesMode, setCountry, setTimezone, setLocale, setOnboarded, onGo }) {
  const t = TOKENS[theme];
  const tr = useT();
  const [copied, setCopied] = useState(false);
  const urlRef = useRef(null);

  const { series: calSeries, level: calLevel, search } = calendarQuery(preferences);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const calendarUrl = `${origin}/api/calendar.ics?${search}`;
  const webcalUrl = `webcal://${host}/api/calendar.ics?${search}`;
  const onSubscribe = (method) => track('calendar_subscribe_clicked', { method, series_count: calSeries.length, level: calLevel });
  const copyUrl = async () => {
    onSubscribe('copy');
    // 클립보드가 막힌 환경(권한 거부·비보안 컨텍스트)에서는 '복사됨'이라고 하지 않고, 위에 보이는 주소를 선택해 준다.
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const node = urlRef.current;
      if (node && typeof window.getSelection === 'function') {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const secondaryButton = {
    height: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer',
    background: 'transparent', border: `1px solid ${t.line2}`, color: t.text,
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  };

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100%' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <button type="button" onClick={() => onGo('home')} aria-label={tr('aria.home')} className="press-icon" style={{
            width: 44, height: 44, marginLeft: -12, borderRadius: 10, border: 0, background: 'none',
            color: t.text2, cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <PageTitle theme={theme} title={tr('settings.title')} />
        </div>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title={tr('settings.series.title')} sub={tr('settings.series.sub')} />
          <div style={{ display: 'grid', gap: 8 }}>
            {SUPPORTED_SERIES.map((id) => {
              const mode = preferences.series[id] || 'all';
              return (
                <SeriesRow key={id} seriesId={id} theme={theme} selected={mode !== 'off'}>
                  <ChoiceGroup theme={theme} options={MODE_OPTIONS_WITH_OFF} value={mode} showSub={false}
                    onChange={(next) => { if (next !== mode) track('series_mode_changed', { series: id, from: mode, to: next }); setSeriesMode(id, next); }} label={tr('ob.levelAria', { series: id })} />
                </SeriesRow>
              );
            })}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title={tr('settings.country.title')} sub={tr('settings.country.sub')} />
          <CountryChoices theme={theme} value={countryIdFromValue(preferences.country)}
            onChange={(id) => setCountry(countryValueFromId(id))} />
        </section>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title={tr('settings.language.title')} sub={tr('settings.language.sub')} />
          <ChoiceGroup theme={theme} options={LOCALE_OPTIONS} value={preferences.locale || 'ko'} showSub={false}
            onChange={(id) => { if (id !== preferences.locale) track('locale_changed', { to: id }); setLocale(id); }} label={tr('settings.language.title')} />
        </section>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title={tr('settings.timezone.title')} sub={tr('settings.timezone.sub')} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56,
            padding: '12px 16px', borderRadius: 14, background: t.surface, border: `1px solid ${t.line}`,
          }}>
            <TimezoneLabel theme={theme} timezone={preferences.timezone} />
            <button type="button" onClick={() => { const tz = detectTimezone(); if (tz !== preferences.timezone) track('timezone_changed', { detected: true }); setTimezone(tz); }} style={secondaryButton}>{tr('settings.timezone.redetect')}</button>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title={tr('settings.calendar.title')} sub={tr('settings.calendar.sub')} />
          <div style={{ padding: '12px 16px', borderRadius: 14, background: t.surface, border: `1px solid ${t.line}` }}>
            <div ref={urlRef} style={{
              ...FONT_DATA, fontSize: 11, color: t.text2,
              lineHeight: 1.5, wordBreak: 'break-all', userSelect: 'all',
            }}>{calendarUrl}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <a href={webcalUrl} onClick={() => onSubscribe('open')} style={{
                ...secondaryButton, flex: '1 1 auto', minWidth: 140, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
              }}>{tr('settings.calendar.open')}</a>
              <button type="button" onClick={copyUrl} style={{ ...secondaryButton, flex: '1 1 auto', minWidth: 120 }}>
                {copied ? tr('settings.calendar.copied') : tr('settings.calendar.copy')}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5, marginTop: 8 }}>{tr('settings.calendar.note')}</div>
        </section>

        <section>
          <SectionTitle theme={theme} title={tr('settings.onboarding.title')} sub={tr('settings.onboarding.sub')} />
          <button type="button" onClick={() => setOnboarded(false)} style={{ ...secondaryButton, width: '100%', height: 52, borderRadius: 14 }}>
            {tr('settings.onboarding.cta')}
          </button>
        </section>

        {/* 브랜드 서명 */}
        <footer className="gt-sign" style={{
          marginTop: 48, paddingTop: 28, borderTop: `1px solid ${t.line}`,
          display: 'grid', justifyItems: 'center', gap: 12, color: t.text3, textAlign: 'center',
        }}>
          <span style={{ color: t.text }}><GantrySymbol size={20} title="Gantry" /></span>
          {/* 대문자 전용 자형(case)으로 무게중심을 맞춘다. */}
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFeatureSettings: '"case"' }}>
            Know when it’s lights out.
          </span>
          <span style={{ fontSize: 12, color: t.text3, fontFeatureSettings: '"tnum"' }}>Gantry · 2026 Season</span>
        </footer>
      </div>
    </div>
  );
}
