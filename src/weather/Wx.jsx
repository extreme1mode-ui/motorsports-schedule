// 비 예보 화면 조각: 세션 줄 칩 · 상세 핵심 줄 · 홈 카드 유리 칩 · 목록 줄 끝 '· ☂ 약한 비'.
// 노랑은 쓰지 않는다(노랑은 '진행 중'만). 중립 면 + 파란 아이콘.
import './weather.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { Icon } from '../ui2/Icon.jsx';
import { getVisibleSessions } from '../schedule/utils.js';
import { useWeather, forecastFor, viewModeOf, WX_LEVEL_KEY } from './forecast.js';

// MET Norway 데이터는 CC BY 4.0 — 출처와 라이선스 링크를 예보 옆에 둔다.
const MET_LICENSE = 'https://api.met.no/doc/License';
const wxIcon = (level) => (level === 3 ? 'bolt' : 'rain');

// 세션 줄 오른쪽: 우산·번개 + '약한 비'
export function WxChip({ w }) {
  const tr = useT();
  if (!w) return null;
  const level = tr(WX_LEVEL_KEY[w.level]);
  return <span className="gx-wx" role="img" aria-label={tr('detail.wx.chipAria', { level })}><Icon n={wxIcon(w.level)} s={14} /><span aria-hidden="true">{level}</span></span>;
}

// 상세 핵심 블록 아래 한 줄: 보는 세션 중 가장 이른 비 예보 하나 + 예보 시각 · 출처(라이선스 링크)
export function WxKeyLine({ race, now, preferences }) {
  const fmt = useFormat(); const tr = useT();
  useWeather();
  const f = forecastFor(race);
  if (!f.ok) return null;
  const list = getVisibleSessions(race, viewModeOf(preferences, race.series))
    .map((s) => ({ s, w: f.of(s) })).filter((x) => x.w)
    .sort((a, b) => Date.parse(a.s.startUtc) - Date.parse(b.s.startUtc));
  if (!list.length) return null;
  const { s, w } = list[0];
  const level = tr(WX_LEVEL_KEY[w.level]);
  const at = f.updatedAt == null ? null
    : fmt.dayDiff(f.updatedAt, now) === 0 ? fmt.time(f.updatedAt) : `${fmt.dayDateNoDow(f.updatedAt)} ${fmt.time(f.updatedAt)}`;
  return (
    <div className="gx-krows">
      <div className="gx-krow">
        <span className="gx-kric" aria-hidden="true"><Icon n={wxIcon(w.level)} s={20} /></span>
        <span className="gx-krtxt">
          <span className="gx-t15">{tr('detail.wx.key', { label: fmt.sessionLabel(s), level })}</span>
          <span className="gx-t13 gx-krmeta">
            {at && <>{tr('detail.wx.at', { time: at })} · </>}
            <a className="gx-wxcredit" href={MET_LICENSE} target="_blank" rel="noopener noreferrer"
              aria-label={`${tr('detail.wx.credit')}. ${tr('aria.external')}`}>{tr('detail.wx.credit')}</a>
          </span>
        </span>
      </div>
    </div>
  );
}

// 홈 덱 카드: 사진 위 유리 칩 '☂ 약한 비 예보'('언제' 아래)
export function WxCardTag({ w }) {
  const tr = useT();
  if (!w) return null;
  return <span className="gx-card-wx"><Icon n={wxIcon(w.level)} s={14} />{tr('home.wx.tag', { level: tr(WX_LEVEL_KEY[w.level]) })}</span>;
}

// 목록 줄(일정 · 이후 일정 · 많이 담은 경기 · 내 주말 시간표): 둘째 줄 끝에 '· ☂ 약한 비'
export function WxInline({ w, sep = true }) {
  const tr = useT();
  if (!w) return null;
  const level = tr(WX_LEVEL_KEY[w.level]);
  return <span className="gx-wxi" role="img" aria-label={tr('detail.wx.chipAria', { level })}>{sep && <span className="gx-wxi-sep" aria-hidden="true">·</span>}<Icon n={wxIcon(w.level)} s={14} /><span aria-hidden="true">{level}</span></span>;
}
