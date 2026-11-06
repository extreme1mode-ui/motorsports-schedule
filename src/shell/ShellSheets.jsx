// 셸의 고르기 시트(SPEC 6장): 보는 범위 · 화면 모드 · 나라 · 언어 · 캘린더 구독.
// 모바일은 아래 시트, 데스크톱은 가운데 대화상자 + X(dialog). 첫 포커스는 지금 고른 값, ↑/↓로 옮기고, 고르면 닫힌다.
// 보는 범위는 바꾸면 스낵바 + 되돌리기(문구 toast.mode.*). 나머지 셋은 문구표에 스낵바 문구가 없어 닫기만 한다.
import { useState } from 'react';
import { Sheet } from '../ui2/Sheet.jsx';
import { Icon } from '../ui2/Icon.jsx';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { COUNTRY_OPTIONS, countryIdFromValue, countryValueFromId } from '../preferences-options.js';
import { calendarQuery } from '../calendar-query.js';
import { useCalendarToken } from '../account/calendar-token.js';

const MODES = ['all', 'race', 'off'];
// 언어 이름은 번역하지 않는다(각 언어의 자기 표기). 설정의 LOCALE_OPTIONS와 같다.
const LOCALES = [['ko', '한국어'], ['en', 'English']];
const THEMES = ['system', 'light', 'dark'];

// 고르기 묶음: radiogroup, Tab은 고른 줄에만 서고 ↑/↓로 옮긴다. 누르거나 Enter로 고르면 onPick.
function RadioList({ label, options, value, onPick }) {
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = [...e.currentTarget.querySelectorAll('[role="radio"]')];
    const i = list.indexOf(document.activeElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map(([v, l, d]) => (
        <button type="button" key={v} className="gx-row gx-radio" role="radio" aria-checked={value === v} tabIndex={value === v ? 0 : -1} onClick={() => onPick(v)}>
          <span className="gx-row-c"><span className="gx-t17">{l}</span>{d && <span className="gx-row-s gx-t13">{d}</span>}</span>
          <span className={`gx-rdot${value === v ? ' is-on' : ''}`} aria-hidden="true">{value === v && <Icon n="check" s={18} />}</span>
        </button>
      ))}
    </div>
  );
}

function CalendarBody({ preferences, onDone, toast }) {
  const tr = useT();
  const token = useCalendarToken();
  const { series, level, search } = calendarQuery(preferences);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const path = token ? `/api/calendar.ics?u=${token}` : `/api/calendar.ics?${search}`;
  const url = `${origin}${path}`;
  const [selected, setSelected] = useState(false);
  const onSubscribe = (method) => track('calendar_subscribe_clicked', { method, series_count: series.length, level, personal: Boolean(token) });
  const copy = async () => {
    onSubscribe('copy');
    try { await navigator.clipboard.writeText(url); onDone(); toast(tr('toast.addrCopied')); }
    catch { setSelected(true); }   // 클립보드가 막혔으면 닫지 않고 주소를 골라 둔다(직접 복사)
  };
  return (
    <div className="gx-sheet-pad">
      <code className="gx-cal-url gx-t13" aria-label={tr('sheet.cal.addrAria')} ref={(el) => {
        if (!el || !selected || typeof window.getSelection !== 'function') return;
        const range = document.createRange(); range.selectNodeContents(el); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }}>{url}</code>
      <a className="gx-btn is-primary is-full" href={`webcal://${host}${path}`} onClick={() => { onSubscribe('open'); onDone(); }}>{tr('settings.calendar.open')}</a>
      <button type="button" className="gx-btn is-weak is-full" onClick={copy}>{tr('settings.calendar.copy')}</button>
      <p className="gx-t13 gx-ter">{tr(token ? 'settings.calendar.notePersonal' : 'settings.calendar.note')}</p>
    </div>
  );
}

// sheet: { k, arg } | null. prefs: usePreferences() 결과(preferences, setSeriesMode, setCountry, setLocale).
export function ShellSheets({ sheet, onClose, dialog, prefs, themePref, setTheme, toast }) {
  const tr = useT();
  // 닫히는 움직임 동안 마지막 시트 내용을 그대로 둔다
  const [last, setLast] = useState(sheet);
  if (sheet && sheet !== last) setLast(sheet);
  const shown = sheet || last;
  const { preferences, setSeriesMode, setCountry, setLocale } = prefs;
  let title = null; let body = null;

  if (shown?.k === 'mode') {
    const s = shown.arg;
    const label = (m) => tr(m === 'race' && s === 'WRC' ? 'mode.race.WRC' : `mode.${m}`);
    const desc = (m) => tr(m !== 'off' && (s === 'F1' || s === 'WRC') ? `mode.desc.${m}.${s}` : `mode.desc.${m}`);
    const value = preferences?.series?.[s] || 'off';
    title = tr('sheet.mode.title', { series: s });
    body = <RadioList label={title} value={value} options={MODES.map((m) => [m, label(m), desc(m)])} onPick={(to) => {
      onClose();
      if (to === value) return;
      track('series_mode_changed', { series: s, from: value, to });
      setSeriesMode(s, to);
      toast(tr(to === 'race' && s === 'WRC' ? 'toast.mode.race.WRC' : `toast.mode.${to}`, { series: s }), {
        label: tr('toast.undo'),
        fn: () => { track('series_mode_changed', { series: s, from: to, to: value }); setSeriesMode(s, value); },
      });
    }} />;
  } else if (shown?.k === 'theme') {
    title = tr('sheet.theme.title');
    body = <RadioList label={title} value={themePref} options={THEMES.map((v) => [v, tr(`theme.${v}`), v === 'system' ? tr('settings.theme.sub') : null])}
      onPick={(v) => { onClose(); if (v !== themePref) setTheme(v); }} />;
  } else if (shown?.k === 'country') {
    title = tr('sheet.country.title');
    const value = countryIdFromValue(preferences?.country);
    body = <RadioList label={title} value={value} options={COUNTRY_OPTIONS.map((c) => [c.id, tr(c.label)])}
      onPick={(id) => { onClose(); if (id !== value) setCountry(countryValueFromId(id)); }} />;
  } else if (shown?.k === 'lang') {
    title = tr('sheet.lang.title');
    const value = preferences?.locale || 'ko';
    body = <RadioList label={title} value={value} options={LOCALES}
      onPick={(id) => { onClose(); if (id !== value) { track('locale_changed', { to: id }); setLocale(id); } }} />;
  } else if (shown?.k === 'cal') {
    title = tr('sheet.cal.title');
    body = <CalendarBody preferences={preferences} onDone={onClose} toast={toast} />;
  }
  return <Sheet open={!!sheet} onClose={onClose} title={title} dialog={dialog}>{body}</Sheet>;
}
