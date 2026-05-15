import { TOKENS, DAYS_KO, fmtDate, fmtDateFull, Mono, SeriesTag, StatusPill, EventBadge, getRoundDescriptor, getRoundDisplay } from './primitives.jsx';
import { CATEGORIES, SERIES, getDateKeyInKst } from './schedule/index.js';
import { PageHeader } from './web.jsx';

export function WebHome({ theme, now, races, onOpenRace, onGo, favorites, toggleFav, tier }) {
  const t = TOKENS[theme];

  const upcoming = races.filter(r => r.status === 'upcoming');
  const next = races.find(r => r.isNextRace) || upcoming[0];
  const followUps = upcoming.slice(1, tier === 'ultra' ? 9 : 6);

  const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = races.filter(r => {
    if (r.status === 'cancelled') return false;
    const d = new Date(r.raceDateKst + 'T00:00:00+09:00');
    return d >= weekStart && d < weekEnd;
  });

  const weekDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const key = getDateKeyInKst(d);
    const dayRaces = races.filter(r => r.raceDateKst === key && r.status !== 'cancelled');
    return { d, key, races: dayRaces };
  });

  const upNextCols = tier === 'ultra' ? 3 : 2;
  const seriesCols = tier === 'tablet' ? 3 : 5;

  return (
    <div>
      <PageHeader theme={theme}
        kicker="DASHBOARD · 2026 SEASON"
        title="홈"
        subtitle="다가오는 모터스포츠 경기를 한눈에"
        right={<LiveBadge theme={theme} now={now} />} />

      {next && <WebNextRaceHero race={next} now={now} theme={theme} tier={tier}
        onOpen={() => onOpenRace(next)} favorites={favorites} toggleFav={toggleFav} />}

      <section style={{ marginTop: 32 }}>
        <SectionTitle theme={theme} kicker="NEXT 14 DAYS" title="2주 일정" />
        <WebWeekStrip days={weekDays} theme={theme} onOpen={onOpenRace} now={now} />
      </section>

      <section style={{
        marginTop: 36, display: 'grid',
        gridTemplateColumns: tier === 'tablet' ? '1fr' : 'minmax(0, 1fr) 320px',
        gap: 28, alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionTitle theme={theme} kicker="UP NEXT" title="다가오는 경기" inline />
            <button onClick={() => onGo('schedule')} style={{
              background: 'none', border: 0, color: t.text2, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>전체 일정 →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${upNextCols}, 1fr)`, gap: 12 }}>
            {followUps.map(r => <UpNextCard key={r.id} race={r} now={now} theme={theme}
              onOpen={() => onOpenRace(r)} favorites={favorites} toggleFav={toggleFav} />)}
          </div>
        </div>

        {tier !== 'tablet' && (
          <aside>
            <SectionTitle theme={theme} kicker="ON TRACK" title="이번 주" />
            <div style={{ display: 'grid', gap: 10 }}>
              {thisWeek.length === 0 && (
                <div style={{
                  padding: 18, borderRadius: 12, border: `1px dashed ${t.line2}`,
                  color: t.text3, fontSize: 13, textAlign: 'center',
                }}>이번 주 경기 없음 — 다음 주를 확인하세요.</div>
              )}
              {thisWeek.map(r => <OnTrackCard key={r.id} race={r} theme={theme} onOpen={() => onOpenRace(r)} />)}
            </div>

            <div style={{
              marginTop: 18, padding: 14, borderRadius: 12,
              background: theme === 'dark' ? '#0E1014' : '#fff',
              border: `1px solid ${t.line}`,
            }}>
              <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>SEASON STATS</Mono>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <MiniStat theme={theme} label="TOTAL" value={String(races.length).padStart(2, '0')} />
                <MiniStat theme={theme} label="DONE" value={String(races.filter(r => r.status === 'completed').length).padStart(2, '0')} />
                <MiniStat theme={theme} label="LEFT" value={String(upcoming.length).padStart(2, '0')} />
                <MiniStat theme={theme} label="PINNED" value={String(favorites.size).padStart(2, '0')} />
              </div>
            </div>
          </aside>
        )}
      </section>

      <section style={{ marginTop: 40 }}>
        <SectionTitle theme={theme} kicker="SERIES" title="시리즈별 보기" />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${seriesCols}, 1fr)`, gap: 12 }}>
          {Object.values(CATEGORIES).map(s => {
            const list = races.filter(r => r.category === s.id);
            const done = list.filter(r => r.status === 'completed').length;
            return (
              <button key={s.id} onClick={() => onGo('series', s.id)} style={{
                background: t.surface, border: `1px solid ${t.line}`, borderRadius: 16,
                padding: '18px 18px 16px', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent + '55'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.line; }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
                <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: '-0.01em' }}>{s.short}</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>{s.name}</div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Mono size={22} weight={700} color={t.text}>{String(list.length).padStart(2, '0')}</Mono>
                  <Mono size={10} color={t.text3} style={{ letterSpacing: '0.1em' }}>
                    {String(done).padStart(2, '0')} DONE
                  </Mono>
                </div>
                <div style={{ marginTop: 10, height: 2, background: t.line, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${list.length ? (done / list.length) * 100 : 0}%`, background: s.accent }} />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function WebNextRaceHero({ race, now, theme, tier, onOpen, favorites, toggleFav }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const ms = new Date(race.raceKstIso || race.raceDateKst + 'T23:59:59+09:00') - now;
  const days = Math.max(0, Math.floor(ms / 86400000));
  const hours = Math.max(0, Math.floor((ms % 86400000) / 3600000));
  const minutes = Math.max(0, Math.floor((ms % 3600000) / 60000));
  const seconds = Math.max(0, Math.floor((ms % 60000) / 1000));
  const faved = favorites.has(race.id);
  const twoCol = tier !== 'tablet';

  return (
    <section onClick={onOpen} style={{
      position: 'relative', overflow: 'hidden', cursor: 'pointer',
      background: theme === 'dark' ? s.dark : s.tint,
      borderRadius: 20, padding: tier === 'ultra' ? '36px 40px' : '28px 28px',
      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
    }}>
      <svg style={{ position: 'absolute', top: 0, right: -40, opacity: 0.55, pointerEvents: 'none' }}
        width="640" height="100%" viewBox="0 0 640 360" preserveAspectRatio="none">
        <defs>
          <linearGradient id="webHeroStripe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={s.accent} stopOpacity="0" />
            <stop offset="1" stopColor={s.accent} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={i * 50 - 100} y1={0} x2={i * 50 + 200} y2={360}
            stroke="url(#webHeroStripe)" strokeWidth="1.5" />
        ))}
      </svg>

      <div style={{
        display: twoCol ? 'grid' : 'block',
        gridTemplateColumns: twoCol ? '1fr 1px 1fr' : undefined,
        gap: twoCol ? 40 : 0,
        position: 'relative',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <SeriesTag series={race.series} theme={theme} />
            <Mono size={11} color={theme === 'dark' ? 'rgba(255,255,255,0.55)' : s.dark} style={{ letterSpacing: '0.16em' }}>
              {getRoundDescriptor(race)} · NEXT UP
            </Mono>
            {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
            {race.status === 'live' && <StatusPill status="live" theme={theme} />}
            {race.isSprint && (
              <span style={{
                padding: '2px 7px', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                borderRadius: 3, background: 'rgba(255,255,255,0.18)', color: '#fff',
                fontFamily: '"JetBrains Mono", ui-monospace',
              }}>SPRINT</span>
            )}
          </div>
          <div style={{
            fontSize: tier === 'ultra' ? 56 : tier === 'desktop' ? 46 : 38,
            fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 0.98,
            color: theme === 'dark' ? '#fff' : '#111', marginBottom: 14,
          }}>{race.name}</div>
          <div style={{
            fontSize: 15, color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            marginBottom: 26, maxWidth: 480,
          }}>
            {race.circuit}{race.city ? ` · ${race.city}` : ''}{race.country ? `, ${race.country}` : ''}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 14,
            padding: '12px 14px 12px 16px', borderRadius: 12,
            background: theme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)',
          }}>
            <div>
              <Mono size={9} color={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.16em' }}>LIGHTS OUT · KST</Mono>
              <div style={{
                fontSize: 16, fontWeight: 700, color: theme === 'dark' ? '#fff' : '#111', marginTop: 3,
                fontFamily: '"JetBrains Mono", ui-monospace', letterSpacing: '-0.005em',
              }}>
                {fmtDateFull(race.raceDateKst)} · {race.kstTime || 'TBA'}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); toggleFav(race.id); }} style={{
              width: 38, height: 38, borderRadius: 10, border: 0, cursor: 'pointer',
              background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: faved ? s.accent : (theme === 'dark' ? '#fff' : '#111'),
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
        </div>

        {twoCol && <div style={{ background: 'rgba(255,255,255,0.08)' }} />}

        <div>
          <Mono size={10} color={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.18em', display: 'block', marginBottom: 12 }}>COUNTDOWN TO LIGHTS OUT</Mono>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
            {[['DAYS', days], ['HRS', hours], ['MIN', minutes], ['SEC', seconds]].map(([label, val]) => (
              <div key={label} style={{
                background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.55)',
                borderRadius: 12, padding: '16px 8px', textAlign: 'center',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.9)',
              }}>
                <Mono size={tier === 'ultra' ? 48 : 40} weight={700}
                  color={theme === 'dark' ? '#fff' : '#111'} style={{ display: 'block', lineHeight: 1 }}>
                  {String(val).padStart(2, '0')}
                </Mono>
                <Mono size={10} color={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                  style={{ letterSpacing: '0.18em', marginTop: 8, display: 'block' }}>
                  {label}
                </Mono>
              </div>
            ))}
          </div>

          {race.sessions && race.sessions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {race.sessions.slice(0, 4).map((sess, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: theme === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)',
                  alignItems: 'center',
                }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4, textAlign: 'center',
                    background: sess.t === '결승' ? s.accent : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                    color: sess.t === '결승' ? '#fff' : (theme === 'dark' ? '#fff' : '#111'),
                    fontSize: 10, fontWeight: 700, letterSpacing: '-0.005em',
                  }}>{sess.t}</span>
                  <Mono size={12} color={theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'}>
                    {sess.kst && sess.kst !== 'TBA' ? sess.kst : '시간 미정'}
                  </Mono>
                  <Mono size={9} color={theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.12em' }}>KST</Mono>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WebWeekStrip({ days, theme, onOpen, now }) {
  const t = TOKENS[theme];
  const todayStr = new Date().toDateString();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 6 }}>
      {days.map(d => {
        const isToday = d.d.toDateString() === todayStr;
        const hasRace = d.races.length > 0;
        const isSun = d.d.getDay() === 0;
        const isSat = d.d.getDay() === 6;
        return (
          <div key={d.key} onClick={() => hasRace && onOpen(d.races[0])} style={{
            padding: '14px 8px 12px', borderRadius: 12,
            background: isToday ? (theme === 'dark' ? '#fff' : '#111') : t.surface,
            border: `1px solid ${t.line}`,
            cursor: hasRace ? 'pointer' : 'default',
            transition: 'transform 0.12s',
          }}
          onMouseEnter={e => { if (hasRace) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
            <Mono size={9} color={
              isToday ? (theme === 'dark' ? '#111' : '#fff') :
              isSun ? '#FF6B7A' : isSat ? '#6BA3FF' : t.text3
            } style={{ letterSpacing: '0.1em', display: 'block' }}>
              {DAYS_KO[d.d.getDay()]}
            </Mono>
            <Mono size={20} weight={700}
              color={isToday ? (theme === 'dark' ? '#111' : '#fff') : t.text}
              style={{ display: 'block', lineHeight: 1, marginTop: 6 }}>
              {d.d.getDate()}
            </Mono>
            <Mono size={9}
              color={isToday ? (theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)') : t.text3}
              style={{ marginTop: 4, display: 'block' }}>
              {String(d.d.getMonth() + 1).padStart(2, '0')}월
            </Mono>
            <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-start', marginTop: 8, minHeight: 6, flexWrap: 'wrap' }}>
              {d.races.slice(0, 4).map((r, j) => (
                <span key={j} title={r.name} style={{
                  width: 6, height: 6, borderRadius: '50%', background: SERIES[r.series].accent,
                }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpNextCard({ race, now, theme, onOpen, favorites, toggleFav }) {
  const t = TOKENS[theme];
  const s = SERIES[race.series];
  const days = Math.max(0, Math.ceil((new Date(race.raceDateKst + 'T00:00:00+09:00') - now) / 86400000));
  const faved = favorites.has(race.id);

  return (
    <div onClick={onOpen} style={{
      background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14,
      padding: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent + '44'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = t.line; }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.accent }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SeriesTag series={race.series} theme={theme} variant="ghost" />
            <Mono size={10} color={t.text3}>{getRoundDisplay(race)}</Mono>
            {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
            {race.isNextRace && <StatusPill status="next" theme={theme} />}
            {race.status === 'live' && <StatusPill status="live" theme={theme} />}
          </div>
          <button onClick={e => { e.stopPropagation(); toggleFav(race.id); }} style={{
            background: 'none', border: 0, padding: 2, cursor: 'pointer', color: faved ? s.accent : t.text3,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: '-0.01em',
          lineHeight: 1.25, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{race.name}</div>
        <div style={{ fontSize: 12, color: t.text3, marginBottom: 14,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{race.circuit}</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          paddingTop: 12, borderTop: `1px solid ${t.line}`,
        }}>
          <div>
            <Mono size={9} color={s.accent} style={{ letterSpacing: '0.1em', display: 'block' }}>D-</Mono>
            <Mono size={22} weight={700} color={t.text} style={{ display: 'block', lineHeight: 1, marginTop: 2 }}>
              {String(days).padStart(2, '0')}
            </Mono>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Mono size={10} color={t.text3} style={{ display: 'block' }}>{fmtDate(race.raceDateKst)}</Mono>
            <Mono size={13} weight={600} color={t.text} style={{ display: 'block', marginTop: 2 }}>{race.kstTime || 'TBA'}</Mono>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnTrackCard({ race, theme, onOpen }) {
  const s = SERIES[race.series];
  return (
    <div onClick={onOpen} style={{
      padding: 14, borderRadius: 12, cursor: 'pointer',
      background: theme === 'dark' ? s.dark : s.tint,
      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.accent }} />
      <SeriesTag series={race.series} theme={theme} />
      {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
      {race.isNextRace && <StatusPill status="next" theme={theme} />}
      <div style={{
        fontSize: 16, fontWeight: 700, color: theme === 'dark' ? '#fff' : '#111',
        marginTop: 10, letterSpacing: '-0.005em', lineHeight: 1.25,
      }}>{race.name}</div>
      <div style={{ fontSize: 11, color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)', marginTop: 2 }}>
        {race.circuit}
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono size={11} color={theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}>
          {fmtDate(race.raceDateKst)}
        </Mono>
        <Mono size={13} weight={600} color={theme === 'dark' ? '#fff' : '#111'}>
          {race.kstTime || 'TBA'}
        </Mono>
      </div>
    </div>
  );
}

export function SectionTitle({ theme, kicker, title, inline }) {
  const t = TOKENS[theme];
  return (
    <div style={{ display: inline ? 'flex' : 'block', alignItems: 'baseline', gap: 12, marginBottom: inline ? 0 : 14 }}>
      <Mono size={11} weight={700} color={t.text3} style={{ letterSpacing: '0.18em', display: 'block' }}>{kicker}</Mono>
      <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', marginTop: 4 }}>{title}</div>
    </div>
  );
}

export function MiniStat({ theme, label, value }) {
  const t = TOKENS[theme];
  return (
    <div>
      <Mono size={9} color={t.text3} style={{ letterSpacing: '0.16em', display: 'block' }}>{label}</Mono>
      <Mono size={20} weight={700} color={t.text} style={{ display: 'block', marginTop: 4 }}>{value}</Mono>
    </div>
  );
}

export function LiveBadge({ theme, now }) {
  const t = TOKENS[theme];
  const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      border: `1px solid ${t.line}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22D77E', boxShadow: '0 0 8px #22D77E' }} />
      <Mono size={10} color={t.text3} style={{ letterSpacing: '0.16em' }}>KST</Mono>
      <Mono size={13} weight={600} color={t.text}>{time}</Mono>
    </div>
  );
}
