import { useRef, useState } from 'react';
import { SUPPORTED_SERIES, detectTimezone } from './schedule/index.js';
import { MODE_OPTIONS_WITH_OFF, countryIdFromValue, countryValueFromId } from './preferences-options.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { GantrySymbol } from './Brand.jsx';
import { useCalendarToken } from './account/calendar-token.js';

// 언어 이름은 번역하지 않는다(각 언어의 자기 표기). raw: true → ChoiceGroup이 t()를 거치지 않음
const LOCALE_OPTIONS = [
  { id: 'ko', label: '한국어', raw: true },
  { id: 'en', label: 'English', raw: true },
];
import { PageTitle, SectionTitle, SeriesRow, ChoiceGroup, CountryChoices, TimezoneLabel } from './preferences-ui.jsx';
import { Group } from './ui.jsx';

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

// 테마 선택지: 기기 설정(처음 값) | 다크 | 라이트 (K5)
const THEME_OPTIONS = [
  { id: 'system', label: 'theme.system' },
  { id: 'dark', label: 'theme.dark' },
  { id: 'light', label: 'theme.light' },
];

// 온보딩에서 정한 값을 다시 바꾸는 화면. 변경은 즉시 저장된다(별도 저장 버튼 없음).
// AI 티 정리(2026-10-29): 선택 카드 → 그릇 + 세그먼트/체크(C5), 시간대는 사람 말(D1), 영어 태그라인 → 'Gantry 2026'(B4),
// 테마는 사이드바·홈 머리에서 이리로(K5·N1).
export function Settings({ themePref, setTheme, preferences, setSeriesMode, setCountry, setTimezone, setLocale, setOnboarded, onGo }) {
  const tr = useT();
  const [copied, setCopied] = useState(false);
  const urlRef = useRef(null);

  const { series: calSeries, level: calLevel, search } = calendarQuery(preferences);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  // 개인 주소가 있으면 그걸 쓴다. 설정을 바꿔도 주소는 그대로고 캘린더 내용이 따라 바뀐다.
  // 없으면(원격 계층이 꺼졌거나 아직 토큰이 안 왔으면) 지금까지 쓰던 쿼리 주소로 떨어진다.
  const calendarToken = useCalendarToken();
  const calendarPath = calendarToken ? `/api/calendar.ics?u=${calendarToken}` : `/api/calendar.ics?${search}`;
  const calendarUrl = `${origin}${calendarPath}`;
  const webcalUrl = `webcal://${host}${calendarPath}`;
  const onSubscribe = (method) => track('calendar_subscribe_clicked', { method, series_count: calSeries.length, level: calLevel, personal: Boolean(calendarToken) });
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

  // 보조 버튼: 면만(테두리 없음)
  const fillButton = {
    minHeight: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer', border: 0,
    background: 'var(--fill)', color: 'var(--text)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
  };
  const section = { marginBottom: 32 };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100%' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '8px 20px 32px' }}>
        <button type="button" onClick={() => onGo('home')} aria-label={tr('aria.home')} className="press-icon" style={{
          width: 44, height: 44, marginLeft: -12, borderRadius: 10, border: 0, background: 'none',
          color: 'var(--text2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <PageTitle title={tr('settings.title')} />

        <section style={section}>
          <SectionTitle title={tr('settings.series.title')} sub={tr('settings.series.sub')} />
          <Group>
            {SUPPORTED_SERIES.map((id) => {
              const mode = preferences.series[id] || 'all';
              return (
                <SeriesRow key={id} seriesId={id} selected={mode !== 'off'}>
                  <ChoiceGroup options={MODE_OPTIONS_WITH_OFF} value={mode} showSub={false}
                    onChange={(next) => { if (next !== mode) track('series_mode_changed', { series: id, from: mode, to: next }); setSeriesMode(id, next); }} label={tr('ob.levelAria', { series: id })} />
                </SeriesRow>
              );
            })}
          </Group>
        </section>

        <section style={section}>
          <SectionTitle title={tr('settings.country.title')} sub={tr('settings.country.sub')} />
          <CountryChoices value={countryIdFromValue(preferences.country)}
            onChange={(id) => setCountry(countryValueFromId(id))} />
        </section>

        <section style={section}>
          <SectionTitle title={tr('settings.language.title')} sub={tr('settings.language.sub')} />
          <ChoiceGroup options={LOCALE_OPTIONS} value={preferences.locale || 'ko'} showSub={false}
            onChange={(id) => { if (id !== preferences.locale) track('locale_changed', { to: id }); setLocale(id); }} label={tr('settings.language.title')} />
        </section>

        {setTheme && (
          <section style={section}>
            <SectionTitle title={tr('settings.theme.title')} sub={tr('settings.theme.sub')} />
            <ChoiceGroup options={THEME_OPTIONS} value={themePref || 'system'} showSub={false}
              onChange={(id) => setTheme(id)} label={tr('settings.theme.title')} />
          </section>
        )}

        <section style={section}>
          <SectionTitle title={tr('settings.timezone.title')} sub={tr('settings.timezone.sub')} />
          <Group>
            <div className="g-row" style={{ minHeight: 60 }}>
              <span style={{ flex: 1, minWidth: 0 }}><TimezoneLabel timezone={preferences.timezone} /></span>
              <button type="button" onClick={() => { const tz = detectTimezone(); if (tz !== preferences.timezone) track('timezone_changed', { detected: true }); setTimezone(tz); }}
                style={{ flex: 'none', minHeight: 44, padding: '0 4px', margin: '0 -4px', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, color: 'var(--text2)' }}>
                {tr('settings.timezone.redetect')}
              </button>
            </div>
          </Group>
        </section>

        <section style={section}>
          <SectionTitle title={tr('settings.calendar.title')} sub={tr('settings.calendar.sub')} />
          <Group style={{ padding: '14px 16px 16px' }}>
            <div ref={urlRef} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, wordBreak: 'break-all', userSelect: 'all' }}>{calendarUrl}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <a href={webcalUrl} onClick={() => onSubscribe('open')} style={{ ...fillButton, flex: '1 1 auto', minWidth: 140 }}>{tr('settings.calendar.open')}</a>
              <button type="button" onClick={copyUrl} style={{ ...fillButton, flex: '1 1 auto', minWidth: 120 }}>
                {copied ? tr('settings.calendar.copied') : tr('settings.calendar.copy')}
              </button>
            </div>
          </Group>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5, marginTop: 8 }}>{tr(calendarToken ? 'settings.calendar.notePersonal' : 'settings.calendar.note')}</div>
        </section>

        <section>
          <SectionTitle title={tr('settings.onboarding.title')} sub={tr('settings.onboarding.sub')} />
          <button type="button" onClick={() => setOnboarded(false)} style={{ ...fillButton, width: '100%', minHeight: 52 }}>
            {tr('settings.onboarding.cta')}
          </button>
        </section>

        {/* 브랜드 서명: 심볼 + 'Gantry 2026' (영어 태그라인·대문자 없음, B4) */}
        <footer className="gt-sign" style={{ marginTop: 40, paddingBottom: 8, display: 'grid', justifyItems: 'center', gap: 8, color: 'var(--text3)', textAlign: 'center' }}>
          <span style={{ color: 'var(--text2)' }}><GantrySymbol size={14} title="Gantry" /></span>
          <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>Gantry 2026</span>
        </footer>
      </div>
    </div>
  );
}
