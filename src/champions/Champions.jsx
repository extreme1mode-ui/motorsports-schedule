// 챔피언 화면 조각
//  - 홈 '2026 챔피언': F1 큰 카드(모두에게, 화제) + 관심 시리즈 한 줄씩(누르면 그 시리즈 탭)
//  - 시리즈 탭: 그 분류의 시리즈마다 카드 하나(관심과 상관없이), 히어로 바로 아래
//  - F1은 드라이버 사진 큰 카드, 다른 시리즈는 차 사진 카드(같은 어두운 면). 홈 한 줄에도 작은 차 사진
// 참고: F1.com 드라이버 페이지(팀 색 면 · 큰 차 번호 · 이름 두 줄), WRC 챔피언 기사(라벨 위 이름), IMSA 챔피언 발표(드라이버·팀·제조사 묶음),
//       WEC · GTWC 챔피언 그래픽(차 사진이 위, 아래로 녹는 어둠 위에 이름), 시리즈 탭 히어로(데스크톱: 사진이 오른쪽에서 왼쪽으로 녹는다)
// 노랑·금색은 쓰지 않는다(노랑은 '진행 중'만 — 결정 경기가 실제로 달리는 중일 때 LiveText). 강조는 팀 색(F1 데이터)·시리즈 색.
// 부연 설명은 싣지 않는다: '…에서 확정', 이전 기록, 띠 범례, 2위 이름, 다른 타이틀의 둘째 줄, 사진 캡션. 사진 출처는 아주 옅게.
import { Fragment } from 'react';
import './champions.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { Icon } from '../ui2/Icon.jsx';
import { ListHeader, LiveText, Photo, SeriesTile } from '../ui2/parts.jsx';
import { joinDot } from '../ui2/hooks.js';
import { CREDIT } from '../home/photos.js';
import { useF1Results, photoOf, teamColor, raceKey } from '../results/results.js';
import { getRaceState, isCancelled } from '../home/time.js';
import { SEASON } from './data-2026.js';
import { categoryChampions, requestSeriesView, SEASON_RACES } from './champions.js';

const cx = (...list) => list.filter(Boolean).join(' ');
const CAT_OF = { F1: 'F1', WEC: 'ENDURANCE', IMSA: 'ENDURANCE', WRC: 'WRC', GTWC: 'GTWC' };
const famLine = (drivers) => drivers.map((d) => d.family).join(' · ');
const givenLine = (drivers) => drivers.map((d) => d.given).join(' · ');
// 이름 속 하이픈에서 줄이 갈리지 않게(Mercedes-AMG) — 보이는 글자만 바꾸고 값은 그대로
const nbh = (t) => String(t).replace(/-/g, '\u2011');
const CLASSIFIED = (st) => st === 'Finished' || /^\+\d+ Laps?$/.test(st || '') || st === 'Lapped';

// 라운드별 결과 띠(F1): 우승 · 2·3위 · 점수권 · 점수 밖 · 완주 못 함 · 남은 경기
function seasonCells(data, code) {
  const list = SEASON_RACES.filter((r) => r.series === 'F1' && String(r.id).includes(`-${SEASON}-`) && !isCancelled(r) && r.round)
    .sort((a, b) => a.round - b.round);
  return list.map((r) => {
    const x = data?.races?.[raceKey(r)]?.gp?.find((g) => g.code === code);
    if (!x) return { r: r.round, k: 'f' };
    const pt = Number(x.pt);
    const k = !CLASSIFIED(x.status) ? 'r' : pt === 1 ? 'w' : pt <= 3 ? 'p' : Number(x.pts) > 0 ? 'pt' : 'n';
    return { r: r.round, k };
  });
}

// 챔피언 정보. F1은 결과 데이터(Jolpica)의 순위 1위 줄 · 경기 결과에서, 다른 시리즈는 data-2026.js 값 그대로
function useHolder(st) {
  const data = useF1Results(st?.series === 'F1');
  if (!st) return null;
  const { c } = st;
  if (st.series !== 'F1') return { drivers: c.drivers || [], team: c.team, car: c.car };
  const me = data?.standings?.rows?.find((x) => x.code === c.code);
  if (!me) return null;
  const cells = seasonCells(data, c.code);
  return {
    drivers: [{ given: me.given, family: me.family }], team: (me.teams || []).join(' / '), color: me.c, number: c.number,
    photo: photoOf(data, me.code), pts: me.pts, wins: me.wins,
    podiums: cells.filter((x) => x.k === 'w' || x.k === 'p').length, cells,
  };
}


function Kicker({ st }) {
  const tr = useT();
  return (
    <span className="gx-champ-k gx-t13">
      <Icon n="trophy" s={16} />
      {tr(`champ.title.${st.c.title}`, { year: SEASON })}
    </span>
  );
}

// 이야기 한 줄(F1 최연소). 덧붙이는 둘째 줄은 두지 않는다
function Story({ s }) {
  const tr = useT();
  if (!s) return null;
  return <p className="gx-champ-story">{tr(s.key, s.p)}</p>;
}

// 시즌 기록 칸: 라벨 위 · 숫자 아래, 가는 세로선으로 나눈다. 점수 · 차이는 단위를 작게
const UNIT = { pts: 'champ.stat.unit', gap: 'champ.stat.unit' };
function Stats({ list }) {
  const tr = useT();
  if (!list?.length) return null;
  return (
    <dl className="gx-champ-stats">
      {list.map((x) => (
        <div key={x.k}>
          <dt className="gx-t13">{tr(`champ.stat.${x.k}`)}</dt>
          <dd>
            <span className="gx-champ-stat-v">{x.v}</span>
            {UNIT[x.k] && <span className="gx-champ-stat-u">{tr(UNIT[x.k])}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TitleList({ list, head }) {
  const tr = useT();
  if (!list?.length) return null;
  return (
    <div className="gx-champ-list">
      {head && <span className="gx-champ-list-h gx-t13">{head}</span>}
      <dl>
        {list.map((o) => (
          <div className="gx-champ-r" key={o.title}>
            <dt className="gx-t13">{tr(`champ.title.${o.title}`, { year: SEASON })}</dt>
            <dd className="gx-t15 gx-w600">{nbh(o.name)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------- F1: 큰 카드(어두운 면 · 팀 색 빛 · 큰 차 번호 · 사진) ----------
function SeasonStrip({ h }) {
  const tr = useT();
  const done = h.cells.filter((x) => x.k !== 'f').length;
  return (
    <div className="gx-strip-wrap">
      <div className="gx-strip-h gx-t13"><span>{tr('champ.strip.title')}</span><span className="gx-tnum">{tr('champ.strip.count', { done, total: h.cells.length })}</span></div>
      <div className="gx-strip" role="img" aria-label={tr('champ.strip.aria', { done, total: h.cells.length, wins: h.wins, podiums: h.podiums })}
        style={{ gridTemplateColumns: `repeat(${h.cells.length}, minmax(0, 1fr))` }}>
        {h.cells.map((x) => <i key={x.r} className={`k-${x.k}`} />)}
      </div>
    </div>
  );
}

function FeatureCard({ st, h, onMore }) {
  const tr = useT();
  return (
    <article className={cx('gx-champ-hero', !onMore && 'is-bare')} style={{ '--team': teamColor(h.color) }} aria-labelledby={`gx-champ-n-${st.series}`}>
      <span className="gx-champ-hero-glow" aria-hidden="true" />
      {h.number && <span className="gx-champ-hero-no" aria-hidden="true">{h.number}</span>}
      {h.photo && <span className="gx-champ-hero-ph" aria-hidden="true"><img src={h.photo} alt="" decoding="async" /></span>}
      <div className="gx-champ-hero-top">
        <Kicker st={st} />
        <h3 className="gx-champ-hero-name" id={`gx-champ-n-${st.series}`}>
          <span className="gx-t15">{givenLine(h.drivers)}</span>
          <span className="gx-t30">{famLine(h.drivers)}</span>
        </h3>
        <span className="gx-champ-hero-team gx-t15"><i className="gx-team-dot" />{h.team}</span>
      </div>
      <Story s={st.c.story} />
      <SeasonStrip h={h} />
      {onMore && (
        <div className="gx-champ-hero-foot">
          <button type="button" className="gx-champ-more gx-t15" onClick={onMore}>{tr('champ.more')}<Icon n="chev" s={16} /></button>
        </div>
      )}
    </article>
  );
}

// ---------- 다른 시리즈: 차 사진 카드 ----------
// 사진: 모바일은 카드 위 띠(아래로 면에 녹는다), 데스크톱은 오른쪽에서 왼쪽으로 녹는다. 사진 파일은 경기 사진을 다시 쓴다(data-2026.js photo)
// 경기 사진(slug)을 다시 쓰거나, 챔피언용으로 따로 넣은 사진(dir · credit)을 쓴다
const photoSrc = (p, size) => `${p.dir || '/photos/races/'}${p.slug}${size === 'card' ? '-card' : ''}.webp`;
const zoomStyle = (pos, zoom) => (zoom && zoom !== 1 ? { transformOrigin: pos, transform: `scale(${zoom})` } : undefined);

// 사진 출처만: '사진 MarcelX42 · CC BY-SA 4.0'(Commons CC BY · BY-SA 표기 조건). 캡션은 두지 않는다
function ChampPhoto({ p }) {
  const tr = useT();
  const c = p.credit || CREDIT[p.slug];   // [작가, 라이선스, Commons 파일 페이지]
  const cap = { text: c ? tr('photo.credit', { by: c[0], license: c[1] }) : '', url: c?.[2] };
  return (
    <div className="gx-champ-media">
      <span className="gx-champ-zoom" style={zoomStyle(p.pos, p.zoom)}>
        <Photo className="gx-champ-img" src={photoSrc(p)} pos={p.pos} lazy />
      </span>
      {cap.text && (cap.url
        ? <a className="gx-champ-credit" href={cap.url} target="_blank" rel="noopener noreferrer" title={cap.text} aria-label={`${cap.text}. ${tr('aria.external')}`}>{cap.text}</a>
        : <span className="gx-champ-credit">{cap.text}</span>)}
    </div>
  );
}

// 차 번호: 흰 번호판(어두운 면 위에서 경주차 번호처럼 읽힌다)
function Plate({ car, big = false }) {
  const tr = useT();
  if (!car) return null;
  return <span className={cx('gx-champ-plate', big && 'is-big')}><span className="gx-vh">{tr('champ.car')} </span>{car}</span>;
}

// 틀: 사진 + 위(이름 · 이야기) + 아래(다른 타이틀 · 메타). 데스크톱은 위가 사진 옆, 아래는 전체 폭
function Frame({ st, className, top, rest, labelled = true }) {
  const p = st.c.photo;
  return (
    <article className={cx('gx-champ', `s-${st.series}`, p && 'has-photo', className)} aria-labelledby={labelled ? `gx-champ-n-${st.series}` : undefined}>
      <div className="gx-champ-top">
        {p && <ChampPhoto p={p} />}
        <div className="gx-champ-head">{top}</div>
      </div>
      {rest && <div className="gx-champ-rest">{rest}</div>}
    </article>
  );
}

function TitleCard({ st, h }) {
  const tr = useT();
  const { c } = st;
  return (
    <Frame st={st}
      top={<>
        <Kicker st={st} />
        <h3 className="gx-champ-name" id={`gx-champ-n-${st.series}`}>
          <span className="gx-t15">{givenLine(h.drivers)}</span>
          {/* ' · '는 앞을 붙여 두고(줄 끝에 남게) 뒤에서만 줄이 바뀐다 */}
          <span className={cx('gx-champ-fam', h.drivers.length > 2 && 'is-many')}>
            {h.drivers.map((d, i) => <Fragment key={d.family}>{i > 0 && <i>{'\u00A0· '}</i>}<span>{d.family}</span></Fragment>)}
          </span>
        </h3>
        <span className="gx-champ-team gx-t15"><Plate car={h.car} /><span>{nbh(h.team)}</span></span>
        {c.coDriver && <span className="gx-champ-co gx-t15">{tr('champ.coDriver', { name: c.coDriver })}</span>}
        <Stats list={c.stats} />
      </>}
      rest={(st.others.length > 0 || c.classes?.length > 0) && <>
        <TitleList list={st.others} />
        <TitleList list={c.classes} head={tr('champ.classes')} />
      </>} />
  );
}

// 결정 중(마지막 경기에서 정해짐) · 결과 반영 전(확정된 다른 타이틀만)
function DecidingCard({ st, now }) {
  const fmt = useFormat(); const tr = useT();
  const others = st.others;
  const d = st.c.deciding;
  if (st.status === 'partial') {
    return <Frame st={st} labelled={false} className="is-partial" top={<Kicker st={st} />} rest={<TitleList list={others} />} />;
  }
  const race = st.race; const L = fmt.race(race);
  const rs = getRaceState(race, now);
  const live = rs === 'live' || rs === 'session';
  const start = race.sessions?.find((s) => s.kind === 'race')?.startUtc;
  const today = !!start && fmt.dayDiff(Date.parse(start), now) === 0;
  return (
    <Frame st={st} className="is-deciding"
      top={<>
        <div className="gx-champ-k-row"><Kicker st={st} />{live && <span className="gx-t13"><LiveText /></span>}</div>
        <h3 className="gx-champ-q gx-t22" id={`gx-champ-n-${st.series}`}>{tr(today ? 'champ.deciding.today' : 'champ.deciding.at', { race: L.shortName })}</h3>
        {!today && start && <span className="gx-champ-meta gx-t13">{fmt.dayDate(start)}</span>}
        <div className="gx-champ-leader">
          <Plate car={d.leader.car} big />
          <span className="gx-champ-leader-t">
            <span className="gx-t13 gx-champ-dim">{tr('champ.deciding.leaderLabel')}</span>
            <span className="gx-t17 gx-w600">{d.leader.drivers.join(' · ')}</span>
            <span className="gx-t13 gx-champ-dim">{joinDot([d.leader.team, tr('champ.deciding.lead', { lead: d.lead })])}</span>
          </span>
        </div>
      </>}
      rest={others.length > 0 && <TitleList list={others} />} />
  );
}

function Card({ st, now, onMore, feature }) {
  const h = useHolder(st);
  if (st.status !== 'decided') return <DecidingCard st={st} now={now} />;
  if (!h) return null;
  if (st.series === 'F1' && feature) return <FeatureCard st={st} h={h} onMore={onMore} />;
  return <TitleCard st={st} h={h} />;
}

// ---------- 홈 한 줄 ----------
// 왼쪽은 그 챔피언(또는 같은 팀) 차의 작은 사진. 출처는 시리즈 탭 카드에 있다(누르면 그리로 간다)
function Thumb({ st, h }) {
  const p = st.c.photo;
  if (!p && h?.photo) {
    return <span className="gx-champ-thumb is-face" style={{ '--team': teamColor(h.color) }} aria-hidden="true"><img src={h.photo} alt="" decoding="async" loading="lazy" /></span>;
  }
  if (!p) return <SeriesTile id={st.series} size={44} />;
  const pos = p.tpos || p.pos;
  return (
    <span className="gx-champ-thumb" aria-hidden="true">
      <span className="gx-champ-zoom" style={zoomStyle(pos, p.tzoom ?? p.zoom)}><Photo className="gx-champ-img" src={photoSrc(p, 'card')} pos={pos} lazy /></span>
    </span>
  );
}

function Row({ st, onOpen, now }) {
  const fmt = useFormat(); const tr = useT();
  const h = useHolder(st);
  const short = tr(`champ.short.${st.c.title}`);
  let main; let meta; let right = <Icon n="chev" s={20} className="gx-ter" />;
  if (st.status === 'decided' && h) {
    main = famLine(h.drivers);
    meta = joinDot([short, h.team]);
  } else if (st.status === 'deciding') {
    const start = st.race.sessions?.find((s) => s.kind === 'race')?.startUtc;
    const today = !!start && fmt.dayDiff(Date.parse(start), now) === 0;
    const rs = getRaceState(st.race, now);
    main = today ? tr('champ.deciding.rowToday') : tr('champ.deciding.rowAt', { date: fmt.dayDateNoDow(Date.parse(start)) });
    meta = joinDot([fmt.race(st.race).shortName, tr('champ.deciding.rowLead', { car: st.c.deciding.leader.car, team: st.c.deciding.leader.team, lead: st.c.deciding.lead })]);
    if (rs === 'live' || rs === 'session') right = <span className="gx-t13"><LiveText /></span>;
  } else {
    const o = st.others[0];
    if (!o) return null;
    main = o.name;
    meta = tr('champ.rowTitle', { series: st.series, title: tr(`champ.title.${o.title}`, { year: SEASON }) });
  }
  return (
    <button type="button" className="gx-row gx-champ-row" onClick={() => onOpen(CAT_OF[st.series])}>
      <Thumb st={st} h={st.status === 'decided' ? h : null} />
      <span className="gx-row-c">
        <span className="gx-row-t gx-t17 gx-w600">{main}</span>
        <span className="gx-row-s gx-t13 gx-ell">{meta}</span>
      </span>
      <span className="gx-row-r gx-row-r-mid">{right}</span>
    </button>
  );
}

// data = homeChampions() 결과(홈이 계산해 넘긴다 — 비었으면 홈이 섹션과 띠를 같이 뺀다)
export function HomeChampions({ data, now, onGo }) {
  const tr = useT();
  const { feature, rows } = data;
  // F1 큰 카드는 결과 데이터(따로 받는 파일)가 와야 그려진다. 오기 전에는 섹션째 그리지 않는다(제목만 먼저 뜨지 않게)
  const f1 = useF1Results(!!feature);
  const openSeries = (cat) => onGo('series', cat);
  if (feature && !f1) return null;
  return (
    <section aria-labelledby="gx-champ-h" className="gx-champ-sec">
      <ListHeader id="gx-champ-h" title={tr('champ.section', { year: SEASON })} />
      {feature && <Card st={feature} now={now} feature onMore={() => { requestSeriesView('drivers'); openSeries('F1'); }} />}
      {rows.length > 0 && <div className="gx-champ-rows">{rows.map((st) => <Row key={st.series} st={st} onOpen={openSeries} now={now} />)}</div>}
    </section>
  );
}

export function SeriesChampions({ category, now }) {
  const tr = useT();
  const list = categoryChampions(category, now);
  const f1 = useF1Results(category === 'F1');
  if (!list.length || (category === 'F1' && !f1)) return null;
  return (
    <section aria-labelledby="gx-champ-sh" className="gx-champ-sec is-series">
      <ListHeader id="gx-champ-sh" title={tr('champ.section', { year: SEASON })} />
      {list.map((st) => <Card key={st.series} st={st} now={now} feature={st.series === 'F1'} />)}
    </section>
  );
}
