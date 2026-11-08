// 서킷 좌표 — 비 예보(api/weather.js)가 MET Norway에 물을 한 점. 키는 일정 데이터의 circuit 값 그대로다(데이터 파일은 고치지 않는다).
// 값: [위도, 경도], 소수 4자리 이하(MET 규칙: 4자리 넘으면 403).
//
// 출처
//  - venue: 서킷 맵(src/circuit-map) venue.js의 투영 기준점
//  - approx: 근사값(검증 전). 반영 전에 `node tools/check-venues-geo.mjs`로 Wikipedia 서킷 문서 좌표와 대조한다.
//    예보 격자가 수 km 단위라 1–2km 차이는 결과를 바꾸지 않는다. 크게 다른 줄만 고친다.
// WRC는 넣지 않는다 — 스테이지가 넓게 퍼져 있어 서비스 파크 한 점 예보로는 말할 수 없다.
// 없는 서킷은 비 예보가 없다(조용히 숨는다).

export const VENUES_GEO = {
  'Albert Park Circuit': [-37.8497, 144.968],                         // approx
  'Algarve International Circuit': [37.227, -8.6267],                  // approx
  'Autodromo Internazionale Enzo e Dino Ferrari': [44.3439, 11.7167],  // approx
  'Autodromo Nazionale Monza': [45.6234, 9.2807],                      // venue
  'Autódromo Hermanos Rodríguez': [19.4017, -99.0969],                 // venue
  'Autódromo José Carlos Pace': [-23.7017, -46.7005],                  // venue(Interlagos)
  'Autódromo José Carlos Pace (Interlagos)': [-23.7017, -46.7005],     // venue
  'Bahrain International Circuit': [26.0325, 50.5106],                 // approx
  'Baku City Circuit': [40.3725, 49.8533],                             // approx
  'Brands Hatch Circuit': [51.3569, 0.2631],                           // approx
  'Canadian Tire Motorsport Park': [44.0481, -78.6756],                // approx
  'Circuit Gilles Villeneuve': [45.5057, -73.5299],                    // venue
  'Circuit Paul Ricard': [43.2506, 5.7917],                            // approx
  'Circuit Zandvoort': [52.3888, 4.5409],                              // approx
  'Circuit de Barcelona-Catalunya': [41.57, 2.2611],                   // approx
  'Circuit de Monaco': [43.7372, 7.4212],                              // venue
  'Circuit de Nevers Magny-Cours': [46.8642, 3.1636],                  // approx
  'Circuit de Spa-Francorchamps': [50.4347, 5.9596],                   // venue
  'Circuit de la Sarthe': [47.95, 0.2077],                             // approx
  'Circuit of the Americas': [30.135, -97.6435],                       // venue
  'Daytona International Speedway': [29.1852, -81.0705],               // approx
  'Detroit Street Circuit': [42.329, -83.04],                          // approx
  'Fuji International Speedway': [35.3717, 138.9275],                  // approx(Fuji Speedway와 같은 곳)
  'Fuji Speedway': [35.3717, 138.9275],                                // approx
  'Hungaroring': [47.5789, 19.2486],                                   // approx
  'Indianapolis Motor Speedway': [39.795, -86.2347],                   // approx
  'Indianapolis Motor Speedway (road course)': [39.795, -86.2347],     // approx
  'Istanbul Park': [40.9517, 29.405],                                  // approx
  'Jeddah Corniche Circuit': [21.6319, 39.1044],                       // approx
  'Las Vegas Strip Circuit': [36.1167, -115.1732],                     // venue
  'Long Beach Street Circuit': [33.765, -118.189],                     // approx
  'Lusail International Circuit': [25.4905, 51.4475],                  // venue
  'Madring': [40.465, -3.615],                                         // approx
  'Marina Bay Street Circuit': [1.29, 103.8495],                       // venue
  'Miami International Autodrome': [25.9581, -80.2389],                // approx
  'Michelin Raceway Road Atlanta': [34.1458, -83.8133],                // approx
  'Misano World Circuit Marco Simoncelli': [43.9614, 12.6833],         // approx
  'Mount Panorama Circuit': [-33.4475, 149.5578],                      // approx
  'Nürburgring': [50.3356, 6.9475],                                    // approx
  'Nürburgring (Grand Prix circuit)': [50.3356, 6.9475],               // approx
  'Nürburgring (Nordschleife + Grand Prix circuit)': [50.3356, 6.9475], // approx
  'Okayama International Circuit': [34.9147, 134.2211],                // approx
  'Pertamina Mandalika International Circuit': [-8.895, 116.3],        // approx
  'Red Bull Ring': [47.2197, 14.7647],                                 // approx
  'Road America': [43.798, -87.989],                                   // approx
  'Sebring International Raceway': [27.4547, -81.3483],                // approx
  'Sepang International Circuit': [2.7608, 101.7382],                  // approx
  'Shanghai International Circuit': [31.3389, 121.2197],               // approx
  'Silverstone Circuit': [52.0718, -1.0243],                           // venue
  'Suzuka Circuit': [34.8446, 136.5219],                               // venue(Suzuka International Racing Course와 같은 곳)
  'Suzuka International Racing Course': [34.8446, 136.5219],           // venue
  'VIRginia International Raceway': [36.5683, -79.2064],               // approx
  'Watkins Glen International': [42.3369, -76.9272],                   // approx
  'WeatherTech Raceway Laguna Seca': [36.5842, -121.7536],             // approx
  'Yas Marina Circuit': [24.4709, 54.6016],                            // venue
};

// MET에 보낼 좌표 문자열. 4자리에서 자른다(반올림이 아니라 버림 — MET 규칙 'truncate').
// 곱셈으로 자르면 45.6234가 45.6233이 된다(부동소수). 글자로 자른다.
export function metCoord(v) {
  const [int, dec = ''] = Number(v).toFixed(8).split('.');
  const d = dec.slice(0, 4).replace(/0+$/, '');
  return d ? `${int}.${d}` : int;
}
