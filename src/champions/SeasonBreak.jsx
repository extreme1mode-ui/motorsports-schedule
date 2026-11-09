// 시즌 사이: 관심 시리즈에 남은 경기가 하나도 없을 때 홈 맨 위 '예정된 경기가 없어요' 대신.
// 다음 시즌 첫 경기(정적 시즌 파일 2027)를 날짜 순으로. 누르면 그 시리즈 탭(지난 시즌 정리 · 챔피언이 먼저 보인다).
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { ListHeader, SeriesTile } from '../ui2/parts.jsx';
import { joinDot } from '../ui2/hooks.js';
import { Icon } from '../ui2/Icon.jsx';
import { SEASON } from './data-2026.js';

const CAT_OF = { F1: 'F1', WEC: 'ENDURANCE', IMSA: 'ENDURANCE', WRC: 'WRC', GTWC: 'GTWC' };

export function SeasonBreak({ list, now, onGo }) {
  const fmt = useFormat(); const tr = useT();
  return (
    <section aria-labelledby="gx-break-h" className="gx-break">
      <ListHeader id="gx-break-h" title={tr('home.break.list', { year: SEASON + 1 })} />
      {list.map(({ series, race, t, timed }) => (
        <button type="button" key={series} className="gx-row gx-break-row" onClick={() => onGo('series', CAT_OF[series])}>
          <SeriesTile id={series} size={44} />
          <span className="gx-row-c">
            <span className="gx-row-t gx-t17 gx-w600">{fmt.race(race).shortName}</span>
            <span className="gx-row-s gx-t13 gx-ell">{joinDot([series, timed ? fmt.time(t) : tr('home.break.tba')])}</span>
          </span>
          <span className="gx-row-r"><span className="gx-t15 gx-w600">{timed ? fmt.dayDate(t) : tr('home.break.weekend', { date: fmt.dayDateNoDow(t) })}</span><span className="gx-t13 gx-sub">{fmt.relDay(t, now)}</span></span>
        </button>
      ))}
      <p className="gx-break-note gx-t13"><Icon n="info" s={16} />{tr('home.alertTba')}</p>
    </section>
  );
}
