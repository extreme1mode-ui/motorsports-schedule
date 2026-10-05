// 데모 시계 시트를 여는 신호. 컴포넌트 파일과 분리해 둬야 Fast Refresh가 시트를 그대로 갱신한다.
export const DEMO_OPEN_EVENT = 'gantry:demo-open';
export const openDemoClock = () => window.dispatchEvent(new Event(DEMO_OPEN_EVENT));
