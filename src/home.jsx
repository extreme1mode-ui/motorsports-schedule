import { CATEGORIES, SERIES, getDateKeyInKst } from './schedule/index.js';
import { TOKENS, DAYS_KO, fmtDate, fmtDateFull, Mono, SeriesTag, StatusPill, EventBadge, getRoundDescriptor, getRoundDisplay } from './primitives.jsx';

export function Home({ theme, now, races, onOpenRace, onGo, favorites, toggleFav, seasonYear }) {
  const t = TOKENS[theme];
  const raceList = Array.isArray(races) ? races : [];
  const safeSeasonYear = Number.isFinite(seasonYear)
    ? seasonYear
    : Number((raceList.find((race) => race?.raceDateKst)?.raceDateKst || '').slice(0, 4)) || 2026;

  const upcoming = raceList.filter(r => r.status === 'upcoming');
  const next = raceList.find(r => r.isNextRace) || upcoming[0];
  const followUps = upcoming.slice(1, 5);

  const weekStart = new Date(now); weekStart.setHours(0,0,0,0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = raceList.filter(r => {
    if (r.status === 'cancelled') return false;
    const d = new Date(r.raceDateKst + 'T00:00:00+09:00');
    return d >= weekStart && d < weekEnd;
  });

  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const key = getDateKeyInKst(d);
    const dayRaces = raceList.filter(r => r.raceDateKst === key && r.status !== 'cancelled');
    return { d, key, races: dayRaces };
  });

  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <TopBar theme={theme} seasonYear={safeSeasonYear} />
      {next && <NextRaceHero race={next} now={now} theme={theme} onOpen={() => onOpenRace(next)} favorites={favorites} toggleFav={toggleFav} />}

      <section style={{ padding: '28px 18px 0' }}>
        <SectionHeader theme={theme} label="THIS WEEK" sub="이번 주 일정" />
        <WeekStrip days={weekDays} theme={theme} onOpen={onOpenRace} />
      </section>

      {thisWeek.length > 0 && (
        <section style={{ padding: '24px 18px 0' }}>
          <SectionHeader theme={theme} label="ON TRACK · 경기 중" sub={`${thisWeek.length}개 이벤트`} />
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {thisWeek.map(r => <WeekendCard key={r.id} race={r} theme={theme} onOpen={() => onOpenRace(r)} />)}
          </div>
        </section>
      )}

      <section style={{ padding: '28px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionHeader theme={theme} label="UP NEXT" sub="다가오는 경기" inline />
          <button onClick={() => onGo('schedule')} style={{
            background: 'none', border: 0, color: t.text3, fontSize: 12, fontWeight: 600,
            letterSpacing: '-0.005em', cursor: 'pointer', fontFamily: 'inherit',
          }}>전체 보기 →</button>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {followUps.map(r => <UpNextRow key={r.id} race={r} now={now} theme={theme} onOpen={() => onOpenRace(r)} />)}
        </div>
      </section>

      <section style={{ padding: '28px 18px 0' }}>
        <SectionHeader theme={theme} label="SERIES" sub="시리즈별 보기" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
          {Object.values(CATEGORIES).map(s => {
            const count = raceList.filter(r => r.category === s.id).length;
            return (
              <button key={s.id} onClick={() => onGo('series', s.id)} style={{
                background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14,
                padding: '14px 14px', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.005em' }}>{s.short}</div>
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{s.name}</div>
                  </div>
                  <Mono size={11} color={t.text3}>{String(count).padStart(2,'0')}R</Mono>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TopBar({ theme, seasonYear = 2026 }) {
  const t = TOKENS[theme];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '64px 18px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: t.text, display: 'grid', placeItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect width="4" height="4" x="0" y="0" fill={t.bg}/>
            <rect width="4" height="4" x="8" y="0" fill={t.bg}/>
            <rect width="4" height="4" x="4" y="4" fill={t.bg}/>
            <rect width="4" height="4" x="12" y="4" fill={t.bg}/>
            <rect width="4" height="4" x="0" y="8" fill={t.bg}/>
            <rect width="4" height="4" x="8" y="8" fill={t.bg}/>
            <rect width="4" height="4" x="4" y="12" fill={t.bg}/>
            <rect width="4" height="4" x="12" y="12" fill={t.bg}/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', lineHeight: 1 }}>PADDOCK</div>
          <Mono size={9} color={t.text3} style={{ letterSpacing: '0.15em' }}>{seasonYear} · SEASON</Mono>
        </div>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 999, background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M10 21a2 2 0 004 0"/>
        </svg>
      </div>
    </div>
  );
}

function SectionHeader({ label, sub, theme, inline }) {
  const t = TOKENS[theme];
  return (
    <div style={{ display: inline ? 'block' : 'flex', alignItems: 'baseline', gap: 8, marginBottom: inline ? 0 : 8 }}>
      <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>{label}</Mono>
      {sub && <span style={{ fontSize: 12, color: t.text2, marginLeft: 8 }}>{sub}</span>}
    </div>
  );
}

function NextRaceHero({ race, now, theme, onOpen, favorites, toggleFav }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const ms = new Date(race.raceKstIso || race.raceDateKst + 'T23:59:59+09:00') - now;
  const days = Math.max(0, Math.floor(ms / 86400000));
  const hours = Math.max(0, Math.floor((ms % 86400000) / 3600000));
  const minutes = Math.max(0, Math.floor((ms % 3600000) / 60000));
  const seconds = Math.max(0, Math.floor((ms % 60000) / 1000));
  const faved = favorites.has(race.id);

  return (
    <section style={{ padding: '16px 18px 0' }}>
      <div onClick={onOpen} style={{
        position: 'relative', overflow: 'hidden',
        background: theme === 'dark' ? s.dark : s.tint,
        borderRadius: 20, padding: '20px 20px 22px', cursor: 'pointer',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
      }}>
        <svg style={{ position: 'absolute', top: 0, right: -20, opacity: 0.5 }} width="200" height="140" viewBox="0 0 200 140">
          <defs>
            <linearGradient id="gradNext" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={s.accent} stopOpacity="0"/>
              <stop offset="1" stopColor={s.accent} stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          {[0,1,2,3,4,5,6].map(i => (
            <line key={i} x1={i*30 - 20} y1={0} x2={i*30 + 60} y2={140} stroke="url(#gradNext)" strokeWidth="1.5" />
          ))}
        </svg>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SeriesTag series={race.series} theme={theme} />
            <Mono size={10} color={theme === 'dark' ? 'rgba(255,255,255,0.5)' : s.dark} style={{ letterSpacing: '0.12em' }}>
              {getRoundDescriptor(race)} · NEXT UP
            </Mono>
            {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
            {race.status === 'live' && <StatusPill status="live" theme={theme} />}
          </div>
          <button onClick={(e) => { e.stopPropagation(); toggleFav(race.id); }} style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', color: theme === 'dark' ? '#fff' : s.dark }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={faved ? s.accent : 'none'} stroke={faved ? s.accent : 'currentColor'} strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>

        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, color: theme === 'dark' ? '#fff' : '#111', marginBottom: 6, position: 'relative' }}>
          {race.name}
        </div>
        <div style={{ fontSize: 13, color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)', marginBottom: 20, position: 'relative' }}>
          {race.circuit}{race.country ? ` · ${race.country}` : ''}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18, position: 'relative' }}>
          {[['DAYS', days], ['HRS', hours], ['MIN', minutes], ['SEC', seconds]].map(([label, val]) => (
            <div key={label} style={{
              background: theme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)',
              borderRadius: 10, padding: '10px 4px', textAlign: 'center',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.9)',
            }}>
              <Mono size={26} weight={700} color={theme === 'dark' ? '#fff' : '#111'} style={{ display: 'block', lineHeight: 1 }}>
                {String(val).padStart(2,'0')}
              </Mono>
              <Mono size={9} color={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.14em', marginTop: 4, display: 'block' }}>
                {label}
              </Mono>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)', position: 'relative' }}>
          <div>
            <Mono size={9} color={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.14em' }}>LIGHTS OUT</Mono>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme === 'dark' ? '#fff' : '#111', marginTop: 2, fontFamily: '"JetBrains Mono", ui-monospace', letterSpacing: '-0.01em' }}>
              {fmtDateFull(race.raceDateKst)} {race.kstTime || 'TBA'} <span style={{ fontSize: 11, opacity: 0.6 }}>KST</span>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? '#fff' : '#111'} strokeWidth="2.4" strokeLinecap="round">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </div>
      </div>
    </section>
  );
}

function WeekStrip({ days, theme, onOpen }) {
  const t = TOKENS[theme];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 10 }}>
      {days.map((d) => {
        const isToday = d.d.toDateString() === new Date().toDateString();
        const hasRace = d.races.length > 0;
        return (
          <div key={d.key} onClick={() => hasRace && onOpen(d.races[0])} style={{
            padding: '10px 4px 8px', borderRadius: 10,
            background: isToday ? (theme === 'dark' ? '#fff' : '#111') : t.surface,
            border: `1px solid ${t.line}`, textAlign: 'center',
            cursor: hasRace ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', minHeight: 64,
          }}>
            <Mono size={9} color={isToday ? (theme === 'dark' ? '#111' : '#fff') : t.text3} style={{ letterSpacing: '0.08em', display: 'block' }}>
              {DAYS_KO[d.d.getDay()]}
            </Mono>
            <Mono size={16} weight={700} color={isToday ? (theme === 'dark' ? '#111' : '#fff') : t.text} style={{ display: 'block', lineHeight: 1, marginTop: 4 }}>
              {d.d.getDate()}
            </Mono>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 6, minHeight: 6 }}>
              {d.races.slice(0,3).map((r, j) => (
                <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: SERIES[r.series].accent }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekendCard({ race, theme, onOpen }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  return (
    <div onClick={onOpen} style={{
      background: t.surface, borderRadius: 14, padding: 14,
      border: `1px solid ${t.line}`, cursor: 'pointer', position: 'relative',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ width: 3, height: 40, background: s.accent, borderRadius: 2, flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <SeriesTag series={race.series} theme={theme} variant="ghost" />
          <Mono size={10} color={t.text3}>{getRoundDisplay(race)}</Mono>
          {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
          {race.isNextRace && <StatusPill status="next" theme={theme} />}
          {race.status === 'live' && <StatusPill status="live" theme={theme} />}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.005em', marginBottom: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {race.name}
        </div>
        <div style={{ fontSize: 11, color: t.text3 }}>{race.circuit}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <Mono size={11} color={t.text3} style={{ display: 'block' }}>{fmtDate(race.raceDateKst)}</Mono>
        <Mono size={13} weight={600} color={t.text} style={{ display: 'block', marginTop: 2 }}>{race.kstTime || 'TBA'}</Mono>
      </div>
    </div>
  );
}

function UpNextRow({ race, now, theme, onOpen }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const days = Math.max(0, Math.ceil((new Date(race.raceDateKst + 'T00:00:00+09:00') - now) / 86400000));
  return (
    <div onClick={onOpen} style={{
      display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 12, alignItems: 'center',
      padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Mono size={9} color={s.accent} style={{ letterSpacing: '0.08em', display: 'block' }}>D-</Mono>
        <Mono size={18} weight={700} color={t.text} style={{ display: 'block', lineHeight: 1, marginTop: 2 }}>
          {String(days).padStart(2,'0')}
        </Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <SeriesTag series={race.series} theme={theme} variant="ghost" />
          {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
          {race.isNextRace && <StatusPill status="next" theme={theme} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {race.name}
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{race.circuit}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono size={11} color={t.text3} style={{ display: 'block' }}>{fmtDate(race.raceDateKst)}</Mono>
        <Mono size={12} color={t.text2} style={{ display: 'block', marginTop: 2 }}>{race.kstTime || 'TBA'}</Mono>
      </div>
    </div>
  );
}
