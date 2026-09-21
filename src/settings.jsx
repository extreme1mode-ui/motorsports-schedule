import { TOKENS } from './primitives.jsx';
import { SUPPORTED_SERIES, detectTimezone } from './schedule/index.js';
import { MODE_OPTIONS_WITH_OFF, countryIdFromValue, countryValueFromId } from './preferences-options.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';

// 언어 이름은 번역하지 않는다(각 언어의 자기 표기). raw: true → ChoiceGroup이 t()를 거치지 않음
const LOCALE_OPTIONS = [
  { id: 'ko', label: '한국어', raw: true },
  { id: 'en', label: 'English', raw: true },
];
import { PageTitle, SectionTitle, SeriesRow, ChoiceGroup, CountryChoices, TimezoneLabel } from './preferences-ui.jsx';

// 온보딩에서 정한 값을 다시 바꾸는 화면. 변경은 즉시 저장된다(별도 저장 버튼 없음).
export function Settings({ theme, preferences, setSeriesMode, setCountry, setTimezone, setLocale, setOnboarded, onGo }) {
  const t = TOKENS[theme];
  const tr = useT();

  const secondaryButton = {
    height: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer',
    background: 'transparent', border: `1px solid ${t.line2}`, color: t.text,
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  };

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100%' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <button type="button" onClick={() => onGo('home')} aria-label={tr('aria.home')} style={{
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

        <section>
          <SectionTitle theme={theme} title={tr('settings.onboarding.title')} sub={tr('settings.onboarding.sub')} />
          <button type="button" onClick={() => setOnboarded(false)} style={{ ...secondaryButton, width: '100%', height: 52, borderRadius: 14 }}>
            {tr('settings.onboarding.cta')}
          </button>
        </section>
      </div>
    </div>
  );
}
