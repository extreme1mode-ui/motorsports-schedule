// UX v2 아이콘(24 격자, 선 1.9). 프로토타입 ui.jsx와 같은 모양. 장식이라 늘 aria-hidden — 이름은 버튼의 aria-label이 맡는다.
import './ui2.css';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const PATHS = {
  home: <path {...P} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  homeF: <path fill="currentColor" d="M3.4 10.1 12 3.1l8.6 7a1 1 0 0 1 .4.8V19a2 2 0 0 1-2 2h-4.2v-6.2H9.2V21H5a2 2 0 0 1-2-2v-8.1a1 1 0 0 1 .4-.8z" />,
  cal: <g {...P}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></g>,
  calF: <path fill="currentColor" d="M7 2.2a1 1 0 0 1 1 1V4h8v-.8a1 1 0 1 1 2 0V4h.5A3.5 3.5 0 0 1 22 7.5V9H2V7.5A3.5 3.5 0 0 1 5.5 4H6v-.8a1 1 0 0 1 1-1zM2 11h20v7.5a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 18.5z" />,
  grid: <g {...P}><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></g>,
  gridF: <g fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2.2" /><rect x="13" y="3" width="8" height="8" rx="2.2" /><rect x="3" y="13" width="8" height="8" rx="2.2" /><rect x="13" y="13" width="8" height="8" rx="2.2" /></g>,
  heart: <path {...P} d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z" />,
  heartF: <path fill="currentColor" d="M12 21s-8.5-5-8.5-11.2A5 5 0 0 1 12 6.4a5 5 0 0 1 8.5 3.4C20.5 16 12 21 12 21z" />,
  gear: <g {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-2.6-1.5L14.2 2.5h-4l-.4 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3.9 2-3.4z" /></g>,
  back: <path {...P} d="M15 5l-7 7 7 7" />,
  chev: <path {...P} d="M9.5 6l6 6-6 6" />,
  down: <path {...P} d="M6 9.5l6 6 6-6" />,
  up: <path {...P} d="M6 14.5l6-6 6 6" />,
  close: <path {...P} d="M6 6l12 12M18 6 6 18" />,
  share: <g {...P}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5" /></g>,
  ext: <g {...P}><path d="M14 4h6v6M20 4l-8.5 8.5" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></g>,
  bell: <g {...P}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></g>,
  check: <path {...P} d="M5 12.5l4.5 4.5L19 7.5" />,
  map: <g {...P}><path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z" /><path d="M9 4.5v13M15 6.5v13" /></g>,
  ticket: <g {...P}><path d="M3.5 8.5V6.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5z" /><path d="M14.5 6v12" strokeDasharray="1.5 2.5" /></g>,
  globe: <g {...P}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" /></g>,
  more: <g fill="currentColor"><circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" /></g>,
  tv: <g {...P}><rect x="3" y="5.5" width="18" height="12" rx="2.5" /><path d="M8.5 21h7" /></g>,
  flag: <g {...P}><path d="M5 21V4" /><path d="M5 4.5h12l-2.5 4 2.5 4H5" /></g>,
  moon: <path {...P} d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  list: <path {...P} d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  info: <g {...P}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8h.01" /></g>,
  plus: <path {...P} d="M12 5v14M5 12h14" />,
};

export function Icon({ n, s = 24, style, className = '' }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={style} className={`gx-icon${className ? ` ${className}` : ''}`}>
      {PATHS[n]}
    </svg>
  );
}
