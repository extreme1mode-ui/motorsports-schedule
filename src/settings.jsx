import { TOKENS } from './primitives.jsx';
import { SUPPORTED_SERIES, detectTimezone } from './schedule/index.js';
import { MODE_OPTIONS_WITH_OFF, countryIdFromValue, countryValueFromId } from './preferences-options.js';
import { PageTitle, SectionTitle, SeriesRow, ChoiceGroup, CountryChoices, TimezoneLabel } from './preferences-ui.jsx';

// 온보딩에서 정한 값을 다시 바꾸는 화면. 변경은 즉시 저장된다(별도 저장 버튼 없음).
export function Settings({ theme, preferences, setSeriesMode, setCountry, setTimezone, setOnboarded, onGo }) {
  const t = TOKENS[theme];

  const secondaryButton = {
    height: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer',
    background: 'transparent', border: `1px solid ${t.line2}`, color: t.text,
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  };

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100%' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <button type="button" onClick={() => onGo('home')} aria-label="홈으로" style={{
            width: 44, height: 44, marginLeft: -12, borderRadius: 10, border: 0, background: 'none',
            color: t.text2, cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <PageTitle theme={theme} title="설정" />
        </div>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title="관심 시리즈" sub="시리즈별로 어디까지 볼지 정해요. 바꾸면 홈에 바로 반영돼요." />
          <div style={{ display: 'grid', gap: 8 }}>
            {SUPPORTED_SERIES.map((id) => {
              const mode = preferences.series[id] || 'all';
              return (
                <SeriesRow key={id} seriesId={id} theme={theme} selected={mode !== 'off'}>
                  <ChoiceGroup theme={theme} options={MODE_OPTIONS_WITH_OFF} value={mode} showSub={false}
                    onChange={(next) => setSeriesMode(id, next)} label={`${id} 관심 수준`} />
                </SeriesRow>
              );
            })}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title="국가" sub="중계 정보를 이 국가 기준으로 보여드려요." />
          <CountryChoices theme={theme} value={countryIdFromValue(preferences.country)}
            onChange={(id) => setCountry(countryValueFromId(id))} />
        </section>

        <section style={{ marginBottom: 32 }}>
          <SectionTitle theme={theme} title="시간대" sub="브라우저에서 자동으로 감지한 값이에요." />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56,
            padding: '12px 16px', borderRadius: 14, background: t.surface, border: `1px solid ${t.line}`,
          }}>
            <TimezoneLabel theme={theme} timezone={preferences.timezone} />
            <button type="button" onClick={() => setTimezone(detectTimezone())} style={secondaryButton}>다시 감지</button>
          </div>
        </section>

        <section>
          <SectionTitle theme={theme} title="온보딩 다시 보기" sub="처음 설정 과정을 다시 진행해요. 완료하면 지금 설정을 덮어써요." />
          <button type="button" onClick={() => setOnboarded(false)} style={{ ...secondaryButton, width: '100%', height: 52, borderRadius: 14 }}>
            온보딩 다시 보기
          </button>
        </section>
      </div>
    </div>
  );
}
