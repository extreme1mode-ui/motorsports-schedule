// 즐겨찾기 수 화면 조각: 토스용 정보 줄 끝 숫자 · 홈 '많이 담은 경기'.
// 웹의 숫자는 하트 자체에 붙는다(ui2/parts.jsx HeartBtn의 count, home/Home.jsx CardHeart).
import './likes.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { Icon } from '../ui2/Icon.jsx';
import { Dot, ListHeader, Roll } from '../ui2/parts.jsx';
import { joinDot, SEP } from '../ui2/hooks.js';
import { prefetchHandlers } from '../photo-prefetch.js';
import { getPrimarySession } from '../schedule/utils.js';
import { WxInline } from '../weather/Wx.jsx';
import { useWeather, wxOfRace } from '../weather/forecast.js';
import { formatCount, likeCount, useLikes, COUNT_IN_HEART } from './likes.js';

// 토스: 정보 줄 끝 '· ♡ 1,234'. 웹은 하트 버튼 안에 숫자가 있어(누르면 바로 ±1) 여기는 비어 있다.
export function LikeInline({ race, fav }) {
  const fmt = useFormat(); const tr = useT();
  useLikes();
  if (COUNT_IN_HEART) return null;
  const lc = likeCount(race, fav);
  if (!lc.show) return null;
  const c = formatCount(lc.n, fmt.locale);
  return (
    <span className="gx-likei" role="img" aria-label={tr('home.popular.countAria', { n: c })}>
      <span aria-hidden="true">{SEP}</span><span className="gx-likei-n" aria-hidden="true"><Icon n="heart" s={14} /><span className="gx-tnum"><Roll>{c}</Roll></span></span>
    </span>
  );
}

// 홈 '많이 담은 경기': 왼쪽 날짜 칸 · 이름 · 'F1 · 02:00 · ☂ 약한 비' · 오른쪽 숫자. 목록이 비면 섹션째 없다(부르는 쪽이 거른다)
export function Popular({ list, onOpen, preferences }) {
  const fmt = useFormat(); const tr = useT();
  useWeather();
  if (!list.length) return null;
  return (
    <section aria-labelledby="gx-pop-h">
      <ListHeader id="gx-pop-h" title={tr('home.popular.title')} sub={tr('home.popular.sub')} />
      {list.map(({ race: r, n }) => {
        const s = getPrimarySession(r); const t = s?.startUtc ? Date.parse(s.startUtc) : null; const p = t != null ? fmt.parts(t) : null;
        const c = formatCount(n, fmt.locale);
        return (
          <button type="button" key={r.id} {...prefetchHandlers(r)} className="gx-row gx-pop" onClick={() => onOpen(r)}
            aria-label={`${fmt.race(r).shortName}, ${tr('home.popular.countAria', { n: c })}`}>
            <span className="gx-leaf" aria-hidden="true">{p ? <><span className="gx-t13 gx-sub">{p.monthShort}</span><b className="gx-t20">{Number(p.day)}</b></> : <span className="gx-t13 gx-ter">{tr('status.tba')}</span>}</span>
            <span className="gx-row-c">
              <span className="gx-row-t gx-t17 gx-w600" aria-hidden="true">{fmt.race(r).shortName}</span>
              <span className="gx-row-s gx-t13"><span aria-hidden="true"><Dot series={r.series} />{joinDot([r.series, t != null ? fmt.time(t) : null])}</span><WxInline w={wxOfRace(r, preferences)} /></span>
            </span>
            <span className="gx-pop-n gx-t15 gx-w600" aria-hidden="true"><Icon n="heart" s={16} /><span className="gx-tnum"><Roll>{c}</Roll></span></span>
          </button>
        );
      })}
    </section>
  );
}
