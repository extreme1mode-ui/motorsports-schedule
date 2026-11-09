// 배너 광고 자리(토스 빌드만). 광고는 platform.attachBanner가 붙이고, 웹에서는 아무것도 그리지 않는다
// (IS_TOSS가 빌드 때 false로 바뀌어 웹 번들에서 이 자리가 통째로 지워진다).
// - 컨테이너는 비어 있는 div, 너비 100%, 고정 높이 없음 — 광고가 없으면 높이 0으로 남는다(흰 빈칸 없음).
// - 위아래 여백(margin)은 광고가 그려진 뒤에만 준다. no fill·실패·미지원이면 자리를 아예 지운다.
// - 처음 방문한 날(getDaysSinceFirstVisit() === 0)에는 그리지 않는다.
import { useEffect, useRef, useState } from 'react';
import { IS_TOSS, attachBanner } from '../platform.js';
import { getDaysSinceFirstVisit } from '../analytics.js';

function TossAdSlot({ slot, margin }) {
  const ref = useRef(null);
  const [allowed] = useState(() => getDaysSinceFirstVisit() > 0);
  const [phase, setPhase] = useState('loading');   // loading → shown | empty
  // 다른 화면(상세·설정 스택)이 덮으면 그 화면은 inert가 된다. 덮인 동안은 광고를 떼고, 다시 드러나면 붙인다
  // — 가려진 광고를 두지 않고, 한 화면에 광고가 하나만 있게.
  useEffect(() => {
    const el = ref.current;
    if (!allowed || !el) return undefined;
    let detach = null;
    const sync = () => {
      const covered = !!el.closest('[inert]');
      if (covered && detach) { detach(); detach = null; setPhase('loading'); }
      else if (!covered && !detach) {
        detach = attachBanner(slot, el, {
          onRendered: () => setPhase('shown'),
          onEmpty: () => setPhase('empty'),
        });
      }
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['inert'] });
    return () => { mo.disconnect(); detach?.(); };
  }, [slot, allowed]);
  if (!allowed || phase === 'empty') return null;
  return <div ref={ref} style={{ width: '100%', margin: phase === 'shown' ? margin : 0 }} />;
}

export function AdBanner({ slot, margin = '16px 0' }) {
  return IS_TOSS ? <TossAdSlot slot={slot} margin={margin} /> : null;
}
