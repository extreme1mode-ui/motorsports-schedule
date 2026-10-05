// 데모 시계 시트 — 데모 빌드에서 홈 시계 칩을 누르면 열린다. 서킷 맵의 데모 시계와 같은 시계를 움직인다.
import { useCallback, useEffect, useRef, useState } from 'react';
import './demo.css';
import { demoClock } from './clock.js';
import { useT } from '../i18n/index.js';
import { useFormat } from '../use-format.js';

// 싱가포르 GP 2026 주말을 따라가는 순간들 (UTC). 라벨은 사용자 시간대로 표시한다.
const PRESETS = [
  { key: 'before', at: Date.UTC(2026, 9, 8, 12, 0) },
  { key: 'sprint', at: Date.UTC(2026, 9, 10, 8, 40) },
  { key: 'race30', at: Date.UTC(2026, 9, 11, 11, 30) },
  { key: 'raceLive', at: Date.UTC(2026, 9, 11, 12, 50) },
  { key: 'after', at: Date.UTC(2026, 9, 12, 1, 0) },
];

export const openDemoClock = () => window.dispatchEvent(new Event('gantry:demo-open'));

export function DemoClockSheet() {
  const [open, setOpen] = useState(false);
  const tr = useT();
  const fmt = useFormat();
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const [, force] = useState(0);

  useEffect(() => {
    const on = () => { openerRef.current = document.activeElement; setOpen(true); };
    window.addEventListener('gantry:demo-open', on);
    return () => window.removeEventListener('gantry:demo-open', on);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    const op = openerRef.current; if (op && op.isConnected) op.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector('button')?.focus({ preventScroll: true });
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const i = setInterval(() => force((n) => n + 1), 1000);
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); clearInterval(i); };
  }, [open, close]);

  if (!demoClock.enabled || !open) return null;
  const now = new Date();
  const pick = (at) => { demoClock.set(at, 1); close(); };
  return (
    <div className="dmc" role="dialog" aria-modal="true" aria-labelledby="dmc-h">
      <div className="dmc-scrim" onClick={close} />
      <div className="dmc-panel" ref={panelRef}>
        <div className="dmc-hd">
          <div>
            <span className="dmc-lbl">{tr('demo.badge')}</span>
            <h2 id="dmc-h">{tr('demo.title')}</h2>
          </div>
          <button type="button" className="dmc-x press-icon" aria-label={tr('demo.close')} onClick={close}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="dmc-sub">{tr('demo.sub')}</p>
        <div className="dmc-now">
          <span className="t">{fmt.time(now)}</span>
          <span className="z">{fmt.zoneLabel}</span>
          <span className="d">{fmt.shortDate(now)}</span>
        </div>
        <div className="dmc-list">
          {PRESETS.map((p) => {
            const cur = Math.abs(now.getTime() - p.at) < 60e3 * 2;
            return (
              <button key={p.key} type="button" className="dmc-row press-row" aria-current={cur || undefined} onClick={() => pick(p.at)}>
                <b>{tr(`demo.p.${p.key}`)}</b>
                <span>{fmt.shortDateTime(new Date(p.at))}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="dmc-real" onClick={() => { demoClock.real(); close(); }}>{tr('demo.real')}</button>
      </div>
    </div>
  );
}
