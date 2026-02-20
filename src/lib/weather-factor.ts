/**
 * Weather-based prediction correction factors
 *
 * 기상 조건이 미세먼지 농도에 미치는 영향을 보정합니다.
 *
 * 보정 요인:
 * 1. 강수 세정 효과 (Precipitation Washout)
 * 2. 대기 안정도 (Atmospheric Stability)
 * 3. 습도 상호작용 (Hygroscopic Growth)
 * 4. 보조 오염물질 선행 지표 (NO2/SO2/CO Leading Indicators)
 */

import type { WeatherData, AirQualityHourly } from './types';

// --- 1. 강수 세정 효과 ---

export function getPrecipitationFactor(weather: WeatherData): { factor: number; description: string } {
  const prob = weather.precipitationProbability ?? 0;
  const amount = weather.precipitation ?? 0;

  if (prob > 70 && amount > 5) {
    return { factor: 0.4, description: '강한 비 예상 (대폭 세정)' };
  }
  if (prob > 70 && amount > 1) {
    return { factor: 0.6, description: '비 예상 (세정 효과)' };
  }
  if (prob > 50) {
    return { factor: 0.8, description: '비 가능성 (약한 세정)' };
  }
  return { factor: 1.0, description: '강수 없음' };
}

// --- 2. 대기 안정도 ---

export function getStabilityFactor(weather: WeatherData): { factor: number; description: string } {
  const windSpeed = weather.windSpeed ?? 3;
  const humidity = weather.humidity ?? 50;
  const cloudCover = weather.cloudCover ?? 50;
  const pressureMsl = weather.pressureMsl ?? 1013;
  const surfacePressure = weather.surfacePressure ?? 1013;

  // 안정도 점수 계산 (0 = 불안정, 1 = 매우 안정)
  let stabilityScore = 0;

  // 풍속: 약풍일수록 안정 (오염물질 정체)
  if (windSpeed < 1.5) stabilityScore += 0.35;
  else if (windSpeed < 3) stabilityScore += 0.2;
  else if (windSpeed > 7) stabilityScore -= 0.1;

  // 습도: 높을수록 안개/연무 → 트래핑
  if (humidity > 85) stabilityScore += 0.2;
  else if (humidity > 75) stabilityScore += 0.1;

  // 운량: 맑은 날 야간 복사 냉각 → 역전층
  if (cloudCover < 20) stabilityScore += 0.2;
  else if (cloudCover > 80) stabilityScore -= 0.05;

  // 기압차: 해면기압-지표기압 차이가 크면 안정적
  const pressureDiff = pressureMsl - surfacePressure;
  if (pressureDiff > 10) stabilityScore += 0.15;
  else if (pressureDiff > 5) stabilityScore += 0.1;

  // 고기압 (>1020hPa): 침강 역전 → 안정
  if (pressureMsl > 1025) stabilityScore += 0.1;
  else if (pressureMsl > 1020) stabilityScore += 0.05;

  // 0~1 범위로 클램핑
  stabilityScore = Math.max(0, Math.min(1, stabilityScore));

  // factor: 0.7(불안정) ~ 1.3(매우 안정)
  const factor = 0.7 + stabilityScore * 0.6;

  let description: string;
  if (stabilityScore > 0.6) description = '대기 매우 안정 (오염물질 정체 우려)';
  else if (stabilityScore > 0.3) description = '대기 보통 안정';
  else description = '대기 불안정 (분산 양호)';

  return { factor: Math.round(factor * 100) / 100, description };
}

// --- 3. 습도 보정 (Hygroscopic Growth) ---

export function getHumidityFactor(weather: WeatherData): { factor: number; description: string } {
  const humidity = weather.humidity ?? 50;

  if (humidity > 85) {
    return { factor: 1.3, description: '고습도 (입자 팽창 영향)' };
  }
  if (humidity > 70) {
    // 70~85% 구간: 선형 보간
    const extra = (humidity - 70) * 0.02;
    return {
      factor: Math.round((1.0 + extra) * 100) / 100,
      description: '다소 높은 습도',
    };
  }
  return { factor: 1.0, description: '보통 습도' };
}

// --- 4. 보조 오염물질 선행 지표 ---

export function getLeadingIndicatorFactor(
  todayHourly: AirQualityHourly[]
): { factor: number; description: string } {
  // 최근 24시간의 NO2, SO2, CO 데이터에서 추세 분석
  const recentHours = todayHourly.slice(-24);
  if (recentHours.length < 6) {
    return { factor: 1.0, description: '데이터 부족' };
  }

  // 전반부(older)와 후반부(recent) 비교
  const half = Math.floor(recentHours.length / 2);
  const olderHalf = recentHours.slice(0, half);
  const recentHalf = recentHours.slice(half);

  const avgVal = (arr: AirQualityHourly[], key: 'no2' | 'so2' | 'co'): number => {
    const vals = arr.map(h => h[key]).filter((v): v is number => v !== null && v !== undefined);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const no2Old = avgVal(olderHalf, 'no2');
  const no2New = avgVal(recentHalf, 'no2');
  const so2Old = avgVal(olderHalf, 'so2');
  const so2New = avgVal(recentHalf, 'so2');
  const coOld = avgVal(olderHalf, 'co');
  const coNew = avgVal(recentHalf, 'co');

  // 비율 변화 (0이면 변화 없음, 양수면 증가)
  const safeRatio = (newVal: number, oldVal: number): number => {
    if (oldVal <= 0) return 0;
    return (newVal - oldVal) / oldVal;
  };

  const no2Ratio = safeRatio(no2New, no2Old);
  const so2Ratio = safeRatio(so2New, so2Old);
  const coRatio = safeRatio(coNew, coOld);

  // 가중 점수: NO2(50%), SO2(30%), CO(20%)
  const score = no2Ratio * 0.5 + so2Ratio * 0.3 + coRatio * 0.2;

  let factor: number;
  let description: string;

  if (score > 0.6) {
    factor = 1.2;
    description = '오염물질 급증 (PM 상승 신호)';
  } else if (score > 0.3) {
    factor = 1.1;
    description = '오염물질 증가 추세';
  } else if (score < -0.2) {
    factor = 0.9;
    description = '오염물질 감소 (청정 신호)';
  } else {
    factor = 1.0;
    description = '오염물질 안정';
  }

  return { factor, description };
}

// --- 종합 기상 보정 ---

export interface WeatherFactorResult {
  /** 종합 기상 보정 계수 */
  combinedFactor: number;
  /** 강수 보정 */
  precipitationFactor: number;
  precipitationDesc: string;
  /** 대기 안정도 보정 */
  stabilityFactor: number;
  stabilityDesc: string;
  /** 습도 보정 */
  humidityFactor: number;
  humidityDesc: string;
  /** 선행 지표 보정 */
  leadingIndicatorFactor: number;
  leadingIndicatorDesc: string;
  /** 종합 설명 */
  summary: string;
}

export function calculateWeatherFactor(
  weather: WeatherData,
  todayHourly: AirQualityHourly[]
): WeatherFactorResult {
  const precip = getPrecipitationFactor(weather);
  const stability = getStabilityFactor(weather);
  const humidity = getHumidityFactor(weather);
  const leading = getLeadingIndicatorFactor(todayHourly);

  // 종합 계수:
  // - 강수: 곱셈 (세정은 절대적 효과)
  // - 안정도: 곱셈 (정체/분산은 배율 효과)
  // - 습도: 곱셈 (입자 크기 변화)
  // - 선행지표: 곱셈 (추세 반영)
  // 안전 범위: [0.3, 2.0]
  const combined = Math.max(0.3, Math.min(2.0,
    precip.factor * stability.factor * humidity.factor * leading.factor
  ));

  // 요약 생성
  const factors: string[] = [];
  if (precip.factor < 0.9) factors.push(precip.description);
  if (stability.factor > 1.15) factors.push(stability.description);
  else if (stability.factor < 0.85) factors.push(stability.description);
  if (humidity.factor > 1.1) factors.push(humidity.description);
  if (leading.factor > 1.05) factors.push(leading.description);
  else if (leading.factor < 0.95) factors.push(leading.description);

  const summary = factors.length > 0
    ? factors.join(', ')
    : '특별한 기상 보정 없음';

  return {
    combinedFactor: Math.round(combined * 100) / 100,
    precipitationFactor: precip.factor,
    precipitationDesc: precip.description,
    stabilityFactor: stability.factor,
    stabilityDesc: stability.description,
    humidityFactor: humidity.factor,
    humidityDesc: humidity.description,
    leadingIndicatorFactor: leading.factor,
    leadingIndicatorDesc: leading.description,
    summary,
  };
}
