import { useState, useEffect } from 'react';
import { TOKENS, MONTHS_KO, DAYS_KO, kstDate, fmtDate, fmtDateFull, Mono, SeriesTag, StatusPill, EventBadge, getRoundDescriptor, getRoundDisplay } from './primitives.jsx';
import { CATEGORIES, SERIES } from './schedule/index.js';
import { PageHeader } from './web.jsx';
import { SectionTitle } from './web-home.jsx';

export function WebSchedule({ theme, races, onOpenRace, now, tier, seasonYear }) {
  const t = TOKENS[theme];
  const safeSeasonYear = Number.isFinite(seasonYear) ? seasonYear : 2026;
  const [month, setMonth] = useState(now.getMonth());
  const [filterCategory, setFilterCategory] = useState('ALL');

  const filtered = filterCategory === 'ALL' ? races : races.filter(r => r.category === filterCategory);
  const monthRaces = filtered.filter(r => parseInt(r.raceDateKst.slice(5, 7)) - 1 === month);
  const sortedMonth = [...monthRaces].sort((a, b) => a.raceDateKst.localeCompare(b.raceDateKst));

  const monthCounts = Array.from({ length: 12 }, (_, m) =>
    filtered.filter(r => parseInt(r.raceDateKst.slice(5, 7)) - 1 === m).length
  );

  return (
    <div>
      <PageHeader theme={theme}
        kicker={`CALENDAR · ${safeSeasonYear}`}
        title="일정"
        subtitle={`${MONTHS_KO[month]} · ${sortedMonth.length}개 경기${filterCategory !== 'ALL' ? ` · ${CATEGORIES[filterCategory].short}` : ''}`}
        right={<CategoryFilterBar theme={theme} value={filterCategory} onChange={setFilterCategory} />} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, marginBottom: 28 }}>
        {Array.from({ length: 12 }, (_, m) => m).map(m => {
          const active = m === month;
          const cnt = monthCounts[m];
          return (
            <button key={m} onClick={() => setMonth(m)} style={{
              padding: '12px 8px', borderRadius: 10,
              border: `1px solid ${active ? t.text : t.line}`,
              background: active ? t.text : 'transparent',
              color: active ? t.bg : (cnt > 0 ? t.text2 : t.text3),
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'background 0.12s',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>{MONTHS_KO[m]}</div>
              <Mono size={9}
                color={active ? (theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)') : t.text3}
                style={{ letterSpacing: '0.14em', display: 'block', marginTop: 4 }}>
                {String(cnt).padStart(2, '0')} 경기
              </Mono>
            </button>
          );
        })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: tier === 'tablet' ? '1fr' : 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 24, alignItems: 'flex-start',
      }}>
        <BigMonthGrid theme={theme} month={month} races={monthRaces} onOpen={onOpenRace} now={now} seasonYear={safeSeasonYear} />

        <div>
          <SectionTitle theme={theme} kicker={`${MONTHS_KO[month].toUpperCase()} ROUNDS`} title="경기 일정" />
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedMonth.length === 0 && (
              <div style={{
                padding: 24, borderRadius: 12, border: `1px dashed ${t.line2}`,
                color: t.text3, fontSize: 13, textAlign: 'center',
              }}>이 달에는 경기가 없습니다.</div>
            )}
            {sortedMonth.map(r => <WebScheduleRow key={r.id} race={r} theme={theme} onOpen={() => onOpenRace(r)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BigMonthGrid({ theme, month, races, onOpen, now, seasonYear }) {
  const t = TOKENS[theme];
  const year = seasonYear;
  const first = new Date(year, month, 1);
  const firstDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = {};
  for (const r of races) {
    const d = parseInt(r.raceDateKst.slice(8, 10));
    (byDay[d] = byDay[d] || []).push(r);
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const todayStr = now.toISOString().slice(0, 10);

  return (
    <div style={{
      background: theme === 'dark' ? '#0E1014' : '#fff',
      border: `1px solid ${t.line}`, borderRadius: 16, padding: 14,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
        {DAYS_KO.map((d, i) => (
          <Mono key={d} size={10}
            color={i === 0 ? '#FF6B7A' : i === 6 ? '#6BA3FF' : t.text3}
            style={{ textAlign: 'center', letterSpacing: '0.12em', padding: '8px 0' }}>
            {d}
          </Mono>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ minHeight: 96 }} />;
          const dayRaces = byDay[d] || [];
          const dateKey = `${seasonYear}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = dateKey === todayStr;
          const isSun = i % 7 === 0; const isSat = i % 7 === 6;
          return (
            <div key={i} onClick={() => dayRaces[0] && onOpen(dayRaces[0])} style={{
              minHeight: 96, borderRadius: 10, padding: 8,
              background: isToday ? (theme === 'dark' ? '#fff' : '#111') : 'transparent',
              border: `1px solid ${isToday ? 'transparent' : t.line}`,
              cursor: dayRaces.length ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column',
              transition: 'border-color 0.12s',
            }}>
              <Mono size={13} weight={isToday ? 700 : 500}
                color={isToday ? (theme === 'dark' ? '#111' : '#fff') : isSun ? '#FF6B7A' : isSat ? '#6BA3FF' : t.text}
                style={{ display: 'block' }}>
                {d}
              </Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6, flex: 1 }}>
                {dayRaces.slice(0, 3).map((r, j) => (
                  <div key={j} title={r.name} style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '-0.005em',
                    padding: '3px 5px', borderRadius: 4,
                    background: SERIES[r.series].accent, color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    opacity: r.status === 'cancelled' ? 0.45 : 1,
                    textDecoration: r.status === 'cancelled' ? 'line-through' : 'none',
                  }}>{r.shortName || r.name}</div>
                ))}
                {dayRaces.length > 3 && (
                  <Mono size={9} color={isToday ? (theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)') : t.text3}
                    style={{ letterSpacing: '0.08em', marginTop: 2 }}>
                    +{dayRaces.length - 3}
                  </Mono>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WebScheduleRow({ race, theme, onOpen }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const d = kstDate(race.raceDateKst);
  const dow = DAYS_KO[d.getDay()];
  return (
    <div onClick={onOpen} style={{
      display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 14, alignItems: 'center',
      padding: '14px 16px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer', opacity: race.status === 'cancelled' ? 0.5 : 1,
      transition: 'border-color 0.12s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent + '40'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = t.line; }}>
      <div style={{ textAlign: 'center', borderRight: `1px solid ${t.line}`, paddingRight: 12 }}>
        <Mono size={20} weight={700} color={t.text} style={{ display: 'block', lineHeight: 1 }}>
          {String(d.getDate()).padStart(2, '0')}
        </Mono>
        <Mono size={10} color={t.text3} style={{ display: 'block', marginTop: 4, letterSpacing: '0.1em' }}>{dow}</Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <SeriesTag series={race.series} theme={theme} variant="ghost" />
          <Mono size={10} color={t.text3}>{getRoundDisplay(race)}</Mono>
          {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
          {race.isNextRace && <StatusPill status="next" theme={theme} />}
          {race.status === 'live' && <StatusPill status="live" theme={theme} />}
          {race.status === 'cancelled' && <StatusPill status="cancelled" theme={theme} />}
          {race.status === 'completed' && <StatusPill status="completed" theme={theme} />}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: '-0.005em',
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
          textDecoration: race.status === 'cancelled' ? 'line-through' : 'none',
        }}>{race.name}</div>
        <div style={{ fontSize: 12, color: t.text3, marginTop: 2,
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>{race.circuit}{race.country ? ` · ${race.country}` : ''}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono size={13} weight={600} color={t.text}>{race.kstTime || 'TBA'}</Mono>
        <Mono size={9} color={t.text3} style={{ display: 'block', marginTop: 2, letterSpacing: '0.1em' }}>KST</Mono>
      </div>
    </div>
  );
}

function CategoryFilterBar({ theme, value, onChange }) {
  const t = TOKENS[theme];
  const all = [{ id: 'ALL', short: 'ALL', accent: t.text }, ...Object.values(CATEGORIES)];
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 3, borderRadius: 10,
      background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      border: `1px solid ${t.line}`,
    }}>
      {all.map(s => {
        const active = value === s.id;
        return (
          <button key={s.id} onClick={() => onChange(s.id)} style={{
            padding: '6px 12px', borderRadius: 7, border: 0,
            background: active ? (s.id === 'ALL' ? t.text : s.accent) : 'transparent',
            color: active ? (s.id === 'ALL' ? t.bg : '#fff') : t.text2,
            fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{s.short}</button>
        );
      })}
    </div>
  );
}

export function WebSeries({ theme, races, onOpenRace, initialCategory, tier, seasonYear }) {
  const t = TOKENS[theme];
  const safeSeasonYear = Number.isFinite(seasonYear) ? seasonYear : 2026;
  const [sel, setSel] = useState(initialCategory || 'F1');
  useEffect(() => { if (initialCategory) setSel(initialCategory); }, [initialCategory]);
  const s = CATEGORIES[sel];
  const list = races.filter(r => r.category === sel).sort((a, b) => a.raceDateKst.localeCompare(b.raceDateKst));
  const roundCount = list.filter(r => r.includeInRoundCount !== false).length;
  const done = list.filter(r => r.status === 'completed' && r.includeInRoundCount !== false).length;
  const cancelled = list.filter(r => r.status === 'cancelled').length;
  const upcoming = list.filter(r => r.status === 'upcoming' && r.includeInRoundCount !== false).length;

  return (
    <div>
      <PageHeader theme={theme}
        kicker={`BY CATEGORY · ${safeSeasonYear}`}
        title="카테고리별"
        subtitle={`${Object.keys(CATEGORIES).length}개 카테고리 · 라운드별 상세 일정`}
        right={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {Object.values(CATEGORIES).map(ss => (
              <button key={ss.id} onClick={() => setSel(ss.id)} style={{
                padding: '9px 14px', borderRadius: 999, fontFamily: 'inherit',
                border: `1px solid ${sel === ss.id ? ss.accent : t.line}`,
                background: sel === ss.id ? ss.accent : 'transparent',
                color: sel === ss.id ? '#fff' : t.text2,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.005em',
              }}>{ss.short}</button>
            ))}
          </div>
        } />

      <section style={{
        padding: tier === 'ultra' ? '36px 36px' : '28px 28px',
        background: theme === 'dark' ? s.dark : s.tint,
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
        borderRadius: 20, marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
        <svg style={{ position: 'absolute', top: 0, right: -40, opacity: 0.45, pointerEvents: 'none' }}
          width="500" height="100%" viewBox="0 0 500 240" preserveAspectRatio="none">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={i * 50 - 80} y1={0} x2={i * 50 + 160} y2={240}
              stroke={s.accent} strokeOpacity="0.2" strokeWidth="2" />
          ))}
        </svg>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <Mono size={11} color={theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'} style={{ letterSpacing: '0.18em' }}>
              {s.short} · {safeSeasonYear} SEASON
            </Mono>
            <div style={{
              fontSize: tier === 'ultra' ? 56 : 44, fontWeight: 800, letterSpacing: '-0.025em',
              color: theme === 'dark' ? '#fff' : '#111', marginTop: 8, lineHeight: 1,
            }}>{s.name}</div>
          </div>

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <BigStat label="ROUNDS" value={String(roundCount).padStart(2, '0')} dark={theme === 'dark'} />
            <BigStat label="DONE" value={String(done).padStart(2, '0')} dark={theme === 'dark'} />
            <BigStat label="UPCOMING" value={String(upcoming).padStart(2, '0')} dark={theme === 'dark'} accent={s.accent} />
            {cancelled > 0 && <BigStat label="CANCELLED" value={String(cancelled).padStart(2, '0')} dark={theme === 'dark'} />}
          </div>
        </div>
      </section>

      <SectionTitle theme={theme} kicker="ROUND LIST" title="라운드 일정" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: tier === 'tablet' ? '1fr' : '1fr 1fr',
        gap: 10,
      }}>
        {list.map((r, idx) => <WebRoundRow key={r.id} race={r} idx={idx} theme={theme}
          onOpen={() => onOpenRace(r)} total={list.length} />)}
      </div>
    </div>
  );
}

function BigStat({ label, value, dark, accent }) {
  return (
    <div>
      <Mono size={10} color={dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'} style={{ letterSpacing: '0.18em', display: 'block' }}>{label}</Mono>
      <Mono size={32} weight={700}
        color={accent || (dark ? '#fff' : '#111')}
        style={{ display: 'block', marginTop: 6, lineHeight: 1 }}>{value}</Mono>
    </div>
  );
}

function WebRoundRow({ race, idx, theme, onOpen }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const done = race.status === 'completed';
  const cancelled = race.status === 'cancelled';
  const d = kstDate(race.raceDateKst);

  return (
    <div onClick={onOpen} style={{
      display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 14, alignItems: 'center',
      padding: '14px 16px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer', opacity: cancelled ? 0.45 : 1,
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.12s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent + '44'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = t.line; }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: done ? t.text3 : s.accent }} />
      <div style={{
        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
        borderRight: `1px solid ${t.line}`, paddingRight: 8,
      }}>
        <Mono size={9} color={t.text3} style={{ letterSpacing: '0.12em' }}>RND</Mono>
        <Mono size={18} weight={700} color={done ? t.text3 : t.text} style={{
          lineHeight: 1, marginTop: 4, textDecoration: cancelled ? 'line-through' : 'none',
        }}>
          {race.roundLabel || String(race.round || race.plannedRound || (idx + 1)).padStart(2, '0')}
        </Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
          {done && <StatusPill status="completed" theme={theme} />}
          {race.status === 'live' && <StatusPill status="live" theme={theme} />}
          {race.isNextRace && <StatusPill status="next" theme={theme} />}
          {cancelled && <StatusPill status="cancelled" theme={theme} />}
          {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
          {race.isSprint && (
            <span style={{
              padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              borderRadius: 3, background: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
              color: t.text2, fontFamily: '"JetBrains Mono", ui-monospace',
            }}>SPRINT</span>
          )}
          <Mono size={10} color={t.text3}>{fmtDate(race.raceDateKst)} · {DAYS_KO[d.getDay()]}</Mono>
        </div>
        <div style={{
          fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: '-0.005em',
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>{race.name}</div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 2,
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>{race.circuit}{race.country ? ` · ${race.country}` : ''}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono size={14} weight={600} color={t.text}>{race.kstTime || 'TBA'}</Mono>
        <Mono size={9} color={t.text3} style={{ display: 'block', marginTop: 2, letterSpacing: '0.1em' }}>KST</Mono>
      </div>
    </div>
  );
}

export function WebFavorites({ theme, races, favorites, onOpenRace, toggleFav, tier }) {
  const t = TOKENS[theme];
  const favList = races.filter(r => favorites.has(r.id)).sort((a, b) => a.raceDateKst.localeCompare(b.raceDateKst));
  const cols = tier === 'ultra' ? 3 : 2;

  return (
    <div>
      <PageHeader theme={theme}
        kicker="PINNED RACES"
        title="즐겨찾기"
        subtitle={`${favList.length}개의 즐겨찾기한 경기${favList.length > 0 ? ' · 시간 임박 순' : ''}`} />

      {favList.length === 0 ? (
        <div style={{
          padding: '80px 40px', textAlign: 'center',
          background: t.surface, border: `1px dashed ${t.line2}`, borderRadius: 16,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 999, margin: '0 auto 18px',
            background: t.surface2, display: 'grid', placeItems: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="1.8">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 8 }}>아직 즐겨찾기한 경기가 없어요</div>
          <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            홈이나 일정에서 ♥를 눌러 관심 경기를 저장하세요.<br/>알림과 캘린더 연동도 함께 받아볼 수 있어요.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
          {favList.map(r => <FavCard key={r.id} race={r} theme={theme}
            onOpen={() => onOpenRace(r)} toggleFav={toggleFav} />)}
        </div>
      )}
    </div>
  );
}

function FavCard({ race, theme, onOpen, toggleFav }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const d = kstDate(race.raceDateKst);
  const cancelled = race.status === 'cancelled';

  return (
    <div onClick={onOpen} style={{
      padding: 18, borderRadius: 14, cursor: 'pointer',
      background: t.surface, border: `1px solid ${t.line}`,
      position: 'relative', overflow: 'hidden', opacity: cancelled ? 0.5 : 1,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <SeriesTag series={race.series} theme={theme} />
        {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
        {race.isNextRace && <StatusPill status="next" theme={theme} />}
        <button onClick={e => { e.stopPropagation(); toggleFav(race.id); }} style={{
          background: 'none', border: 0, padding: 0, cursor: 'pointer', color: s.accent,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.01em',
        lineHeight: 1.2, marginBottom: 4,
        textDecoration: cancelled ? 'line-through' : 'none',
      }}>{race.name}</div>
      <div style={{ fontSize: 12, color: t.text3 }}>{race.circuit}{race.country ? ` · ${race.country}` : ''}</div>

      <div style={{
        marginTop: 16, padding: '12px 0 0', borderTop: `1px solid ${t.line}`,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em', display: 'block' }}>RACE DAY</Mono>
          <Mono size={18} weight={700} color={t.text} style={{ display: 'block', marginTop: 4 }}>
            {String(d.getMonth() + 1).padStart(2, '0')}.{String(d.getDate()).padStart(2, '0')}
          </Mono>
          <Mono size={10} color={t.text3} style={{ display: 'block', marginTop: 2 }}>{DAYS_KO[d.getDay()]}</Mono>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em', display: 'block' }}>LIGHTS OUT</Mono>
          <Mono size={18} weight={700} color={t.text} style={{ display: 'block', marginTop: 4 }}>{race.kstTime || 'TBA'}</Mono>
          <Mono size={10} color={t.text3} style={{ display: 'block', marginTop: 2, letterSpacing: '0.1em' }}>KST</Mono>
        </div>
      </div>
    </div>
  );
}

export function RaceDrawer({ race, theme, onClose, favorites, toggleFav, tier }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const faved = favorites.has(race.id);
  const [notify, setNotify] = useState(false);
  const width = tier === 'ultra' ? 560 : tier === 'desktop' ? 480 : 440;

  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }} />
      <aside style={{
        position: 'relative', width, maxWidth: '100vw', height: '100vh',
        background: t.bg, overflow: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        borderLeft: `1px solid ${t.line}`,
      }}>
        <div style={{
          padding: '24px 28px 28px',
          background: theme === 'dark' ? s.dark : s.tint,
          position: 'relative', overflow: 'hidden',
        }}>
          <svg style={{ position: 'absolute', top: 0, right: -30, opacity: 0.5, pointerEvents: 'none' }}
            width="400" height="100%" viewBox="0 0 400 320" preserveAspectRatio="none">
            {Array.from({ length: 10 }, (_, i) => (
              <line key={i} x1={i * 45 - 60} y1={0} x2={i * 45 + 140} y2={320}
                stroke={s.accent} strokeOpacity="0.2" strokeWidth="2" />
            ))}
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 10, border: 0, cursor: 'pointer',
              background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)',
              color: theme === 'dark' ? '#fff' : '#111', display: 'grid', placeItems: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <button onClick={() => toggleFav(race.id)} style={{
              width: 36, height: 36, borderRadius: 10, border: 0, cursor: 'pointer',
              background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)',
              color: faved ? s.accent : (theme === 'dark' ? '#fff' : '#111'),
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <SeriesTag series={race.series} theme={theme} />
              <Mono size={11} color={theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'} style={{ letterSpacing: '0.14em' }}>
                {getRoundDescriptor(race)}
              </Mono>
              {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
              {race.isSprint && (
                <span style={{
                  padding: '3px 7px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                  borderRadius: 3, background: 'rgba(255,255,255,0.2)', color: '#fff',
                  fontFamily: '"JetBrains Mono", ui-monospace',
                }}>SPRINT</span>
              )}
              {race.isNextRace && <StatusPill status="next" theme={theme} />}
              {race.status === 'live' && <StatusPill status="live" theme={theme} />}
              {race.status === 'cancelled' && <StatusPill status="cancelled" theme={theme} />}
              {race.status === 'completed' && <StatusPill status="completed" theme={theme} />}
            </div>
            <div style={{
              fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05,
              color: theme === 'dark' ? '#fff' : '#111', marginBottom: 6,
            }}>{race.name}</div>
            <div style={{ fontSize: 13, color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
              {race.circuit}{race.city ? ` · ${race.city}` : ''} · {race.country}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px 40px' }}>
          {race.cancellationNote && (
            <div style={{
              padding: 14, borderRadius: 12, marginBottom: 24,
              background: 'rgba(255,77,95,0.08)', border: '1px solid rgba(255,77,95,0.25)',
              fontSize: 13, color: '#FF6B7A', lineHeight: 1.5,
            }}>
              <Mono size={10} weight={700} style={{ letterSpacing: '0.14em', display: 'block', marginBottom: 4 }}>NOTICE</Mono>
              {race.cancellationNote}
            </div>
          )}

          <section style={{ marginBottom: 24 }}>
            <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.16em', display: 'block', marginBottom: 12 }}>SESSIONS · 한국 시간 (KST)</Mono>
            <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12, overflow: 'hidden' }}>
              {race.sessions.map((sess, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 10, alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: i === race.sessions.length - 1 ? 'none' : `1px solid ${t.line}`,
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4px 8px', borderRadius: 4,
                    background: sess.t === '결승' ? s.accent : (theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                    color: sess.t === '결승' ? '#fff' : t.text,
                    fontSize: 11, fontWeight: 700,
                  }}>{sess.t}</span>
                  <Mono size={13} color={t.text2}>{sess.kst && sess.kst !== 'TBA' ? sess.kst : '시간 TBA'}</Mono>
                  <Mono size={10} color={t.text3} style={{ letterSpacing: '0.1em' }}>KST</Mono>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.16em', display: 'block', marginBottom: 12 }}>WEEKEND</Mono>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <DrawerCell theme={theme} label="시작" value={fmtDateFull(race.weekendStart)} />
              <DrawerCell theme={theme} label="종료" value={fmtDateFull(race.weekendEnd)} />
              <DrawerCell theme={theme} label="현지 시각" value={race.localTime || 'TBA'} />
              <DrawerCell theme={theme} label="TIMEZONE" value={race.timezone || 'TBA'} />
              {race.durationLabel && <DrawerCell theme={theme} label="DURATION" value={race.durationLabel} />}
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.16em', display: 'block', marginBottom: 12 }}>중계 · BROADCAST</Mono>
            <div style={{ display: 'grid', gap: 8 }}>
              {(race.broadcast || []).map((b, i) => (
                <div key={i} style={{
                  padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`,
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 6, background: s.accent,
                      display: 'grid', placeItems: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{b}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <div style={{
              padding: '14px 16px', background: t.surface, border: `1px solid ${t.line}`,
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>시작 30분 전 알림</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>결승 세션 전에 푸시 알림</div>
              </div>
              <button onClick={() => setNotify(!notify)} style={{
                width: 46, height: 28, borderRadius: 999, border: 0, cursor: 'pointer',
                background: notify ? s.accent : (theme === 'dark' ? '#3A3D45' : '#D8DAE3'),
                position: 'relative', transition: 'background 0.15s',
              }}>
                <div style={{
                  position: 'absolute', top: 2, left: notify ? 20 : 2,
                  width: 24, height: 24, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.15s',
                }} />
              </button>
            </div>
          </section>

          <button style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 0,
            background: s.accent, color: '#fff', fontSize: 15, fontWeight: 700,
            letterSpacing: '-0.005em', cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 10px 24px ${s.accent}33`,
          }}>
            티켓 · 공식 사이트 열기
          </button>
        </div>
      </aside>
    </div>
  );
}

function DrawerCell({ theme, label, value }) {
  const t = TOKENS[theme];
  return (
    <div style={{ padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10 }}>
      <Mono size={9} color={t.text3} style={{ letterSpacing: '0.16em', display: 'block' }}>{label}</Mono>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}
