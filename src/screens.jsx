import { useState, useEffect } from 'react';
import { SERIES } from './data.js';
import { TOKENS, MONTHS_KO, DAYS_KO, kstDate, fmtDate, fmtDateFull, Mono, SeriesTag, StatusPill } from './primitives.jsx';

export function Schedule({ theme, races, onOpenRace, now }) {
  const t = TOKENS[theme];
  const [month, setMonth] = useState(Math.max(now.getMonth(), 0));

  const byMonth = {};
  for (const r of races) {
    const m = parseInt(r.raceDateKst.slice(5,7)) - 1;
    (byMonth[m] = byMonth[m] || []).push(r);
  }

  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ padding: '64px 18px 12px' }}>
        <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>2026 SEASON</Mono>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginTop: 4 }}>일정</div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 18px 10px', overflowX: 'auto' }}>
        {Array.from({length:12}, (_, i) => i).map(m => {
          const count = (byMonth[m] || []).length;
          const active = m === month;
          return (
            <button key={m} onClick={() => setMonth(m)} style={{
              padding: '8px 12px', borderRadius: 999, border: `1px solid ${active ? t.text : t.line}`,
              background: active ? t.text : 'transparent', color: active ? t.bg : t.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 'none',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {MONTHS_KO[m]}
              <Mono size={10} color={active ? (theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)') : t.text3}>
                {String(count).padStart(2,'0')}
              </Mono>
            </button>
          );
        })}
      </div>

      <MonthGrid month={month} races={byMonth[month] || []} theme={theme} onOpen={onOpenRace} now={now} />
    </div>
  );
}

function MonthGrid({ month, races, theme, onOpen, now }) {
  const t = TOKENS[theme];
  const year = 2026;
  const first = new Date(year, month, 1);
  const firstDow = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const byDay = {};
  for (const r of races) {
    const d = parseInt(r.raceDateKst.slice(8,10));
    (byDay[d] = byDay[d] || []).push(r);
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const todayStr = now.toISOString().slice(0,10);

  return (
    <div style={{ padding: '8px 14px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 4px 8px' }}>
        {DAYS_KO.map((d, i) => (
          <Mono key={d} size={10} color={i === 0 ? '#FF6B7A' : (i === 6 ? '#6BA3FF' : t.text3)} style={{ textAlign: 'center', letterSpacing: '0.08em' }}>
            {d}
          </Mono>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ aspectRatio: '1/1.05' }} />;
          const dayRaces = byDay[d] || [];
          const dateKey = `2026-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isToday = dateKey === todayStr;
          const isSun = i % 7 === 0; const isSat = i % 7 === 6;
          return (
            <div key={i} onClick={() => dayRaces.length && onOpen(dayRaces[0])} style={{
              aspectRatio: '1/1.05', borderRadius: 8,
              background: isToday ? t.text : t.surface, border: `1px solid ${t.line}`,
              padding: '5px 5px 4px', display: 'flex', flexDirection: 'column',
              cursor: dayRaces.length ? 'pointer' : 'default', overflow: 'hidden',
            }}>
              <Mono size={11} weight={isToday ? 700 : 500} color={isToday ? t.bg : (isSun ? '#FF6B7A' : isSat ? '#6BA3FF' : t.text)}>
                {d}
              </Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3, flex: 1 }}>
                {dayRaces.slice(0,3).map((r, j) => (
                  <div key={j} style={{ height: 4, borderRadius: 2, background: SERIES[r.series].accent }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
        {races.sort((a,b) => a.raceDateKst.localeCompare(b.raceDateKst)).map(r => (
          <ScheduleRow key={r.id} race={r} theme={theme} onOpen={() => onOpen(r)} />
        ))}
      </div>
    </div>
  );
}

export function ScheduleRow({ race, theme, onOpen }) {
  const t = TOKENS[theme];
  const d = kstDate(race.raceDateKst);
  const dow = DAYS_KO[d.getDay()];
  return (
    <div onClick={onOpen} style={{
      display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center',
      padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer', opacity: race.status === 'cancelled' ? 0.55 : 1,
    }}>
      <div style={{ textAlign: 'center', borderRight: `1px solid ${t.line}`, paddingRight: 12 }}>
        <Mono size={18} weight={700} color={t.text} style={{ display: 'block', lineHeight: 1 }}>
          {String(d.getDate()).padStart(2,'0')}
        </Mono>
        <Mono size={10} color={t.text3} style={{ display: 'block', marginTop: 3 }}>{dow}</Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <SeriesTag series={race.series} theme={theme} variant="ghost" />
          <Mono size={10} color={t.text3}>R{String(race.round || race.plannedRound || 0).padStart(2,'0')}</Mono>
          {race.status === 'cancelled' && <StatusPill status="cancelled" theme={theme} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textDecoration: race.status === 'cancelled' ? 'line-through' : 'none' }}>
          {race.name}
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{race.circuit} · {race.country}</div>
      </div>
      <Mono size={12} color={t.text2}>{race.kstTime || 'TBA'}</Mono>
    </div>
  );
}

export function SeriesView({ theme, races, onOpenRace, initialSeries }) {
  const t = TOKENS[theme];
  const [sel, setSel] = useState(initialSeries || 'F1');
  useEffect(() => { if (initialSeries) setSel(initialSeries); }, [initialSeries]);
  const s = SERIES[sel];
  const list = races.filter(r => r.series === sel).sort((a,b) => a.raceDateKst.localeCompare(b.raceDateKst));

  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ padding: '64px 18px 12px' }}>
        <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>BY SERIES · 2026</Mono>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginTop: 4 }}>시리즈별</div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 18px 14px', overflowX: 'auto' }}>
        {Object.values(SERIES).map(ss => (
          <button key={ss.id} onClick={() => setSel(ss.id)} style={{
            padding: '8px 14px', borderRadius: 999,
            border: `1px solid ${sel === ss.id ? ss.accent : t.line}`,
            background: sel === ss.id ? ss.accent : 'transparent',
            color: sel === ss.id ? '#fff' : t.text2,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none',
            fontFamily: 'inherit', letterSpacing: '-0.005em',
          }}>
            {ss.short}
          </button>
        ))}
      </div>

      <div style={{ margin: '0 18px 14px', padding: '18px', borderRadius: 16, background: theme === 'dark' ? s.dark : s.tint, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: 3, right: 0, background: s.accent }} />
        <div style={{ fontSize: 22, fontWeight: 800, color: theme === 'dark' ? '#fff' : '#111', letterSpacing: '-0.02em', marginTop: 8 }}>
          {s.name}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
          <Stat label="ROUNDS" val={String(list.filter(r => r.status !== 'cancelled').length).padStart(2,'0')} dark={theme === 'dark'} />
          <Stat label="FINISHED" val={String(list.filter(r => r.status === 'completed').length).padStart(2,'0')} dark={theme === 'dark'} />
          <Stat label="NEXT UP" val={list.find(r => r.status !== 'cancelled' && r.status !== 'completed') ? 'NEXT' : '—'} dark={theme === 'dark'} />
        </div>
      </div>

      <div style={{ padding: '0 18px', display: 'grid', gap: 8 }}>
        {list.map((r, idx) => <RoundRow key={r.id} race={r} idx={idx} theme={theme} onOpen={() => onOpenRace(r)} />)}
      </div>
    </div>
  );
}

function Stat({ label, val, dark }) {
  return (
    <div>
      <Mono size={9} color={dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.14em', display: 'block' }}>{label}</Mono>
      <Mono size={18} weight={700} color={dark ? '#fff' : '#111'} style={{ display: 'block', marginTop: 3 }}>{val}</Mono>
    </div>
  );
}

function RoundRow({ race, idx, theme, onOpen }) {
  const t = TOKENS[theme];
  const done = race.status === 'completed';
  const cancelled = race.status === 'cancelled';
  const d = kstDate(race.raceDateKst);
  return (
    <div onClick={onOpen} style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'center',
      padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer', opacity: cancelled ? 0.45 : 1,
    }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Mono size={9} color={t.text3} style={{ letterSpacing: '0.08em' }}>RND</Mono>
        <Mono size={16} weight={700} color={done ? t.text3 : t.text} style={{ lineHeight: 1, marginTop: 2, textDecoration: cancelled ? 'line-through' : 'none' }}>
          {String(race.round || race.plannedRound || (idx+1)).padStart(2,'0')}
        </Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
          {done && <StatusPill status="completed" theme={theme} />}
          {cancelled && <StatusPill status="cancelled" theme={theme} />}
          <Mono size={10} color={t.text3}>{fmtDate(race.raceDateKst)} · {DAYS_KO[d.getDay()]}</Mono>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {race.name}
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{race.circuit}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono size={13} weight={600} color={t.text}>{race.kstTime || 'TBA'}</Mono>
        <Mono size={9} color={t.text3} style={{ display: 'block', marginTop: 2, letterSpacing: '0.08em' }}>KST</Mono>
      </div>
    </div>
  );
}

export function Favorites({ theme, races, favorites, onOpenRace, toggleFav }) {
  const t = TOKENS[theme];
  const favList = races.filter(r => favorites.has(r.id)).sort((a,b) => a.raceDateKst.localeCompare(b.raceDateKst));
  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ padding: '64px 18px 20px' }}>
        <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>PINNED</Mono>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginTop: 4 }}>즐겨찾기</div>
      </div>
      {favList.length === 0 ? (
        <div style={{ padding: '40px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, margin: '0 auto 16px', background: t.surface2, display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="1.8">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 6 }}>아직 즐겨찾기한 경기가 없어요</div>
          <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.5 }}>
            홈이나 일정에서 ♥를 눌러 관심 경기를 저장하세요.
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 18px', display: 'grid', gap: 8 }}>
          {favList.map(r => <ScheduleRow key={r.id} race={r} theme={theme} onOpen={() => onOpenRace(r)} />)}
        </div>
      )}
    </div>
  );
}

export function RaceDetail({ race, theme, onClose, favorites, toggleFav }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const faved = favorites.has(race.id);
  const [notify, setNotify] = useState(false);

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, zIndex: 80, display: 'flex', flexDirection: 'column', overflow: 'auto', paddingBottom: 40 }}>
      <div style={{ padding: '60px 18px 22px', background: theme === 'dark' ? s.dark : s.tint, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', top: 0, right: -40, opacity: 0.6 }} width="260" height="280" viewBox="0 0 260 280">
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <line key={i} x1={i*32 - 30} y1={0} x2={i*32 + 100} y2={280} stroke={s.accent} strokeOpacity="0.15" strokeWidth="2" />
          ))}
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, position: 'relative' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? '#fff' : '#111'} strokeWidth="2.4" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button onClick={() => toggleFav(race.id)} style={{ width: 36, height: 36, borderRadius: 999, background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={faved ? s.accent : 'none'} stroke={faved ? s.accent : (theme === 'dark' ? '#fff' : '#111')} strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <SeriesTag series={race.series} theme={theme} />
            <Mono size={10} color={theme === 'dark' ? 'rgba(255,255,255,0.6)' : s.dark} style={{ letterSpacing: '0.12em' }}>
              ROUND {String(race.round || race.plannedRound || 0).padStart(2,'0')}
            </Mono>
            {race.isSprint && <span style={{ padding: '2px 6px', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', borderRadius: 3, background: 'rgba(255,255,255,0.18)', color: '#fff', fontFamily: '"JetBrains Mono", ui-monospace' }}>SPRINT</span>}
            {race.status === 'cancelled' && <StatusPill status="cancelled" theme={theme} />}
            {race.status === 'completed' && <StatusPill status="completed" theme={theme} />}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: theme === 'dark' ? '#fff' : '#111', marginBottom: 6 }}>
            {race.name}
          </div>
          <div style={{ fontSize: 13, color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
            {race.circuit}{race.city ? ` · ${race.city}` : ''} · {race.country}
          </div>
        </div>
      </div>

      {race.cancellationNote && (
        <div style={{ margin: '16px 18px 0', padding: 14, borderRadius: 12, background: 'rgba(255,77,95,0.08)', border: '1px solid rgba(255,77,95,0.25)', fontSize: 12, color: '#FF6B7A', lineHeight: 1.5 }}>
          <Mono size={10} weight={700} style={{ letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>NOTICE</Mono>
          {race.cancellationNote}
        </div>
      )}

      <section style={{ padding: '24px 18px 0' }}>
        <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>SESSIONS · 한국 시간 (KST)</Mono>
        <div style={{ marginTop: 12, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14, overflow: 'hidden' }}>
          {race.sessions.map((sess, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 10, alignItems: 'center',
              padding: '14px 16px', borderBottom: i === race.sessions.length - 1 ? 'none' : `1px solid ${t.line}`,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px 8px', borderRadius: 4,
                background: sess.t === '결승' ? s.accent : (theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: sess.t === '결승' ? '#fff' : t.text,
                fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em',
              }}>{sess.t}</div>
              <Mono size={13} color={t.text2}>{sess.kst && sess.kst !== 'TBA' ? sess.kst : '시간 TBA'}</Mono>
              <Mono size={10} color={t.text3} style={{ letterSpacing: '0.08em' }}>KST</Mono>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '20px 18px 0' }}>
        <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>WEEKEND</Mono>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <InfoCell label="시작" value={fmtDateFull(race.weekendStart)} theme={theme} />
          <InfoCell label="종료" value={fmtDateFull(race.weekendEnd)} theme={theme} />
        </div>
      </section>

      <section style={{ padding: '20px 18px 0' }}>
        <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>중계 · BROADCAST</Mono>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {(race.broadcast || []).map((b, i) => (
            <div key={i} style={{ padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: s.accent, display: 'grid', placeItems: 'center', color: '#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{b}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '20px 18px 0' }}>
        <div style={{ padding: '14px 16px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>시작 30분 전 알림</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>결승 세션 전에 푸시 알림</div>
          </div>
          <button onClick={() => setNotify(!notify)} style={{ width: 46, height: 28, borderRadius: 999, border: 0, cursor: 'pointer', background: notify ? s.accent : (theme === 'dark' ? '#3A3D45' : '#D8DAE3'), position: 'relative', transition: 'background 0.15s' }}>
            <div style={{ position: 'absolute', top: 2, left: notify ? 20 : 2, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.15s' }} />
          </button>
        </div>
      </section>

      <section style={{ padding: '24px 18px 0' }}>
        <button style={{ width: '100%', padding: '16px', borderRadius: 14, border: 0, background: s.accent, color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 10px 24px ${s.accent}33` }}>
          티켓 · 공식 사이트 열기
        </button>
      </section>
    </div>
  );
}

function InfoCell({ label, value, theme }) {
  const t = TOKENS[theme];
  return (
    <div style={{ padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10 }}>
      <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em', display: 'block' }}>{label}</Mono>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}
