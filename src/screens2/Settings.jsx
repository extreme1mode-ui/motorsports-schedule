// 설정(UX v2 SPEC 6장): 챙겨 보는 시리즈(타일 + 보는 범위 › 시트) · 지역과 언어(나라 › · 시간대 정보 줄 · 언어 ›) · 화면(화면 모드 ›)
// · 캘린더(구독 › 시트) · 처음 설정 다시 하기. 값은 줄에 보이고 고르는 건 셸 시트(ShellSheets).
// 시간대(결정 19)는 누르지 않는 정보 줄 — 기기 설정을 따라간다(Root의 L14 감지). '안 보기'인 시리즈 줄은 꺼진 것처럼 흐리게(회색 타일 · 글자 text3).
import './screens2.css';
import './settings2.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { useShell } from '../shell/context.js';
import { SUPPORTED_SERIES, SERIES } from '../schedule/index.js';
import { COUNTRY_OPTIONS, countryIdFromValue } from '../preferences-options.js';
import { GantrySymbol } from '../Brand.jsx';
import { Icon } from '../ui2/Icon.jsx';
import { Band, ListHeader, SeriesTile } from '../ui2/parts.jsx';
import { useScrolledTitle } from '../ui2/hooks.js';
import { IS_TOSS } from '../platform.js';

const cx = (...list) => list.filter(Boolean).join(' ');
// 언어 이름은 번역하지 않는다(각 언어의 자기 표기)
const LOCALE_NAME = { ko: '한국어', en: 'English' };

// 'UTC+9' — 지금 시각 기준 오프셋
function utcOffset(timeZone) {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
    const m = name.match(/GMT([+-]\d{1,2}(?::\d{2})?)?/);
    return m ? (m[1] || '+0') : '';
  } catch { return ''; }
}

function Row({ label, sub, value, onClick, off = false, lead }) {
  return (
    <button type="button" className={cx('gx-row gx-set-row', off && 'is-off')} onClick={onClick}>
      {lead}
      <span className="gx-row-c"><span className="gx-t17">{label}</span>{sub && <span className="gx-row-s gx-t13">{sub}</span>}</span>
      <span className="gx-row-r gx-row-r-mid">{value != null && value !== '' && <span className={cx('gx-t15', off ? 'gx-ter' : 'gx-sub')}>{value}</span>}<Icon n="chev" s={20} className="gx-ter" /></span>
    </button>
  );
}

export function SettingsScreen({ preferences, themePref, onRedo }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const desktop = !!shell.desktop;
  const [ref, titled] = useScrolledTitle('.gx-set-top h1');
  const modeOf = (s) => preferences?.series?.[s] || 'off';
  const modeText = (s, m) => tr(m === 'race' && s === 'WRC' ? 'mode.race.WRC' : `mode.${m}`);
  const country = tr(COUNTRY_OPTIONS.find((c) => c.id === countryIdFromValue(preferences?.country))?.label || 'country.OTHER');
  const tz = preferences?.timezone || fmt.timeZone;
  const city = String(tz || '').split('/').pop().replace(/_/g, ' ');
  const tzText = tr('tz.full', { zone: fmt.zoneLabel, city, offset: utcOffset(tz) });
  return (
    <div className={cx('gx-settings', desktop ? 'is-desk' : 'is-mob', IS_TOSS && 'is-toss')} ref={desktop ? undefined : ref}>
      {/* 토스: 위 막대 없음(네이티브 내비 바가 뒤로를 맡는다) */}
      {!desktop && !IS_TOSS && (
        <div className={cx('gx-set-bar', titled && 'is-on')}>
          <button type="button" className="gx-iconbtn" aria-label={tr('aria.back')} onClick={() => shell.back()}><Icon n="back" /></button>
          <span className="gx-set-bar-t gx-t17 gx-w600" aria-hidden="true">{tr('settings.title')}</span>
          <span className="gx-iconbtn" aria-hidden="true" />
        </div>
      )}
      <div className="gx-set-top"><h1 className="gx-t26" data-view-title tabIndex={-1}>{tr('settings.title')}</h1></div>

      <section aria-labelledby="gx-set-series">
        <ListHeader id="gx-set-series" title={tr('settings.series.title')} sub={tr('settings.series.sub')} />
        {SUPPORTED_SERIES.map((s) => {
          const m = modeOf(s); const off = m === 'off';
          const name = SERIES[s]?.name || s;
          const ko = tr(`series.${s}.name`);
          return <Row key={s} off={off} lead={<SeriesTile id={s} size={40} off={off} />} label={name} sub={ko !== name ? ko : null} value={modeText(s, m)} onClick={() => shell.openSheet('mode', s)} />;
        })}
      </section>

      {/* 토스: 보는 범위와 처음 설정 다시 하기만(나라·시간대·언어·화면·캘린더 없음) */}
      {!IS_TOSS && <>
      <Band />
      <section aria-labelledby="gx-set-region">
        <ListHeader id="gx-set-region" title={tr('settings.region')} />
        <Row label={tr('settings.country.title')} sub={tr('settings.country.sub')} value={country} onClick={() => shell.openSheet('country')} />
        {/* 결정 19: 고르는 줄이 아니라 보여 주기만 하는 줄(화살표·시트 없음) */}
        <div className="gx-row gx-set-row is-static">
          <span className="gx-row-c"><span className="gx-t17">{tr('settings.timezone.title')}</span><span className="gx-row-s gx-t13">{tr('settings.timezone.sub')}</span></span>
          <span className="gx-row-r gx-row-r-mid"><span className="gx-t15 gx-sub">{tzText}</span></span>
        </div>
        <Row label={tr('settings.language.title')} sub={tr('settings.language.sub')} value={LOCALE_NAME[preferences?.locale || 'ko']} onClick={() => shell.openSheet('lang')} />
      </section>

      <Band />
      <section aria-labelledby="gx-set-display">
        <ListHeader id="gx-set-display" title={tr('settings.display')} />
        <Row label={tr('settings.theme.title')} value={tr(`theme.${themePref || 'system'}`)} onClick={() => shell.openSheet('theme')} />
      </section>

      <Band />
      <section aria-labelledby="gx-set-cal">
        <ListHeader id="gx-set-cal" title={tr('settings.calendar.section')} />
        <Row label={tr('settings.calendar.title')} sub={tr('settings.calendar.sub')} onClick={() => shell.openSheet('cal')} />
      </section>
      </>}

      <Band />
      <Row label={tr('settings.onboarding.title')} sub={tr('settings.onboarding.sub')} onClick={onRedo} />

      {/* 브랜드 서명: 심볼 + 'Gantry 2026' */}
      <footer className="gx-set-foot"><span className="gx-sub"><GantrySymbol size={14} title="Gantry" /></span><span className="gx-t13 gx-ter">Gantry 2026</span></footer>
    </div>
  );
}
