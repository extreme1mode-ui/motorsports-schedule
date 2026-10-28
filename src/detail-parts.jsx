// 경기 상세 본문 부품 — 모바일 시트(screens.jsx RaceDetail)와 데스크톱 드로어(web-screens.jsx RaceDrawer)가 같이 쓴다.
// 순서·내용·계측은 예전 그대로. 바뀐 것은 표현뿐이다(AI 티 정리 2026-10-29):
//   영문 섹션 라벨 → 한국어 섹션 머리, 칸 격자 → 이름·값 목록, 아이콘 타일·빛 그림자 없음, 구현 값(IANA 시간대) → 사람 말.
import { SeriesTag, StatusPill, EventBadge, AccessBadge, ExternalIcon } from './primitives.jsx';
import { getRoundDescriptor } from './list-utils.js';
import { offsetText, canAddAlarm, ticketOf } from './detail-utils.js';
import { SectionHead, Group, GroupNote, KeyValueRow } from './ui.jsx';
import { useFormat } from './use-format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { SR_ONLY } from './a11y.js';
import { toggleAlarm, useAlarms } from './alarm.js';

// 사진 위 첫 줄: ● F1 · 19라운드 · 스프린트 주말 · 상태
export function DetailTagLine({ race }) {
  const tr = useT();
  const round = getRoundDescriptor(race, tr);
  const status = race.status === 'live' ? 'live' : race.status === 'cancelled' ? 'cancelled' : race.status === 'completed' ? 'completed' : race.isNextRace ? 'next' : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 10px', marginBottom: 8 }}>
      <SeriesTag series={race.series} onPhoto size={13} />
      {round && <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{round}</span>}
      {race.isSprint && <EventBadge label={tr('status.sprint')} onPhoto />}
      {race.specialBadge && <EventBadge label={race.specialBadge} onPhoto />}
      {status && <StatusPill status={status} onPhoto />}
    </div>
  );
}

// 취소 등 안내
export function DetailNotice({ race }) {
  const tr = useT();
  if (!race.cancellationNote) return null;
  return (
    <Group style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{tr('detail.notice')}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text2)' }}>{race.cancellationNote}</div>
    </Group>
  );
}

// 세션 일정: 이름 왼쪽, 내 시각 오른쪽, 그 아래 현지 시각. 결승은 굵기로만 구분한다(시리즈 색 면 없음).
export function DetailSessions({ sessions }) {
  const fmt = useFormat();
  const tr = useT();
  if (!sessions?.length) return null;
  return (
    <>
      <SectionHead title={tr('detail.sessions')} aside={tr('detail.sessionsZone', { zone: fmt.zoneLabel })} />
      <Group>
        {sessions.map((sess, i) => {
          const local = sess.startUtc && sess.local && sess.local !== 'TBA' ? sess.local.slice(11, 16) : '';
          const race = sess.kind === 'race';
          return (
            <div key={i} className="g-row">
              <span style={{ fontSize: 15, fontWeight: race ? 700 : 500, color: 'var(--text)', minWidth: 0 }}>{fmt.sessionLabel(sess)}</span>
              <span style={{ marginLeft: 'auto', textAlign: 'right', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: race ? 700 : 600, color: sess.startUtc ? 'var(--text)' : 'var(--text3)' }}>
                  {sess.startUtc ? fmt.shortDateTime(sess.startUtc) : tr('detail.timeTba')}
                </span>
                {local && <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text3)' }}>{tr('detail.local', { time: local })}</span>}
              </span>
            </div>
          );
        })}
      </Group>
    </>
  );
}

// 주말 정보: 기간 · 결승 현지 시각 · 시차 (· 경기 시간). 예전 2×2 칸 격자 대신 이름·값 목록.
export function DetailWeekend({ race }) {
  const fmt = useFormat();
  const tr = useT();
  // localTime은 'YYYY-MM-DD HH:MM'(세션 현지값) 또는 'HH:MM'(OpenF1 경로). 날짜가 없으면 raceDateLocal을 붙인다.
  const lt = typeof race.localTime === 'string' ? race.localTime : '';
  const local = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(lt)
    ? `${fmt.plainShortDate(lt.slice(0, 10))} ${lt.slice(11, 16)}`
    : /^\d{2}:\d{2}$/.test(lt)
      ? [race.raceDateLocal ? fmt.plainShortDate(race.raceDateLocal) : '', lt].filter(Boolean).join(' ')
      : tr('time.tba');
  const period = race.weekendStart && race.weekendEnd
    ? `${fmt.plainShortDate(race.weekendStart)} – ${fmt.plainShortDate(race.weekendEnd)}`
    : tr('time.tba');
  const offset = offsetText(race, fmt, tr);
  return (
    <>
      <SectionHead title={tr('detail.weekend')} />
      <Group>
        <KeyValueRow label={tr('detail.period')} value={period} />
        <KeyValueRow label={tr('detail.raceLocal')} value={local} />
        {offset && <KeyValueRow label={tr('detail.offset')} value={offset} />}
        {race.durationLabel && <KeyValueRow label={tr('detail.duration')} value={race.durationLabel} />}
      </Group>
    </>
  );
}

// 중계: 서비스 이름 + 유료·무료 글자 + 바깥 링크 표시. 재생 아이콘 타일 없음.
export function DetailBroadcast({ race }) {
  const fmt = useFormat();
  const tr = useT();
  const list = fmt.broadcast(race.broadcast);
  return (
    <>
      <SectionHead title={tr('detail.broadcast')} />
      {list.length > 0 && (
        <Group>
          {list.map((b, i) => (
            // 실제 링크(<a>): 가운데 클릭·Cmd 클릭·새 탭이 되고 스크린리더가 링크로 읽는다.
            <a key={i} className="g-row g-tap press-row" href={b.url ?? undefined} target="_blank" rel="noopener noreferrer"
              onClick={() => track('broadcast_clicked', { name: b.name, region: b.region, access: b.access, series: race.series, source: 'detail' })}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{b.name}</span>
                <AccessBadge access={b.access} label={b.access ? tr(`detail.access.${b.access}`) : ''} />
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--text3)', display: 'grid' }}><ExternalIcon size={18} /></span>
              <span style={SR_ONLY}>{tr('aria.external')}</span>
            </a>
          ))}
        </Group>
      )}
      <GroupNote style={{ padding: '0 4px' }}>{tr('detail.broadcastNote')}</GroupNote>
    </>
  );
}

// 캘린더 담기 줄. 끝났거나 취소됐거나 시각이 확정된 세션이 없으면 그리지 않는다(예전과 같다).
export function DetailAlarm({ race, preferences }) {
  const fmt = useFormat();
  const tr = useT();
  const alarms = useAlarms();
  const on = alarms.has(race.id);
  if (!canAddAlarm(race)) return null;
  return (
    <Group>
      <div className="g-row" style={{ minHeight: 64 }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{tr('detail.alarmTitle')}</span>
          <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--text2)' }}>{tr('detail.alarmSub')}</span>
        </span>
        {/* 스위치가 아니라 버튼이다 — 꺼도 캘린더에서 지워지지 않으니 스위치는 거짓말이 된다. */}
        <button type="button" onClick={() => toggleAlarm(race, { source: 'detail', preferences, locale: fmt.locale })} aria-pressed={on}
          style={{ marginLeft: 'auto', flex: 'none', minHeight: 44, minWidth: 44, padding: 0, border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 34, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: on ? 'var(--fill)' : 'var(--brand)', color: on ? 'var(--text2)' : 'var(--onbrand)',
          }}>
            {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            {on ? tr('detail.alarmAdded') : tr('detail.alarmAdd')}
          </span>
        </button>
      </div>
    </Group>
  );
}

// 티켓·공식 사이트. 티켓은 아직 안 끝나고 안 취소된 경기에만, 공식 사이트는 언제나. 그림자·시리즈 색 없음.
export function DetailLinks({ race }) {
  const tr = useT();
  const ticketUrl = ticketOf(race);
  const officialUrl = race.officialUrl || null;
  if (!ticketUrl && !officialUrl) return null;
  const linkTrack = (event) => track(event, { series: race.series, race_id: race.id, source: 'detail' });
  return (
    <>
      <a href={ticketUrl || officialUrl} target="_blank" rel="noopener noreferrer"
        onClick={() => linkTrack(ticketUrl ? 'ticket_clicked' : 'official_site_clicked')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 52, borderRadius: 'var(--r-btn)',
          background: 'var(--brand)', color: 'var(--onbrand)', fontSize: 15, fontWeight: 600, textDecoration: 'none',
        }}>
        {ticketUrl ? tr('detail.buyTickets') : tr('detail.openOfficialSite')}<ExternalIcon size={16} />
        <span style={SR_ONLY}>{tr('aria.external')}</span>
      </a>
      {ticketUrl && officialUrl && (
        <a href={officialUrl} target="_blank" rel="noopener noreferrer" onClick={() => linkTrack('official_site_clicked')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, marginTop: 4, fontSize: 15, fontWeight: 500, color: 'var(--text2)', textDecoration: 'none' }}>
          {tr('detail.officialSite')}<ExternalIcon size={16} />
          <span style={SR_ONLY}>{tr('aria.external')}</span>
        </a>
      )}
    </>
  );
}

