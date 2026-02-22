import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  AirQualityGrade,
  AirQualityHourly,
  DailyAirQuality,
  GradeLabel,
  PredictionInfo,
  AccuracyInfo,
  City,
  WeatherData,
  VisualAnalysisResult,
} from './types';
import { PM25_THRESHOLDS, PM10_THRESHOLDS, GRADE_ORDER, CITIES } from './constants';
import { calculateChinaFactor } from './china-factor';
import { calculateWeatherFactor } from './weather-factor';
import { calculateVisualFactor } from './visual-factor';

export function getGrade(value: number | null, type: 'pm25' | 'pm10'): AirQualityGrade {
  if (value === null || value < 0) return 'good';
  const thresholds = type === 'pm25' ? PM25_THRESHOLDS : PM10_THRESHOLDS;
  for (const t of thresholds) {
    if (value >= t.min && value <= t.max) return t.grade;
  }
  return 'veryBad';
}

export function getOverallGrade(pm25Grade: AirQualityGrade, pm10Grade: AirQualityGrade): AirQualityGrade {
  return GRADE_ORDER[pm25Grade] >= GRADE_ORDER[pm10Grade] ? pm25Grade : pm10Grade;
}

export function getGradeLabel(grade: AirQualityGrade): GradeLabel {
  const labels: Record<AirQualityGrade, GradeLabel> = {
    good: '좋음',
    moderate: '보통',
    bad: '나쁨',
    veryBad: '매우나쁨',
  };
  return labels[grade];
}

export function getGradeColor(grade: AirQualityGrade): string {
  const colors: Record<AirQualityGrade, string> = {
    good: '#3B82F6',
    moderate: '#22C55E',
    bad: '#EAB308',
    veryBad: '#DC2626',
  };
  return colors[grade];
}

export function getGradeBgClass(grade: AirQualityGrade): string {
  const classes: Record<AirQualityGrade, string> = {
    good: 'bg-grade-good text-white',
    moderate: 'bg-grade-moderate text-white',
    bad: 'bg-grade-bad text-gray-900',
    veryBad: 'bg-grade-very-bad text-white',
  };
  return classes[grade];
}

export function getGradeBorderClass(grade: AirQualityGrade): string {
  const classes: Record<AirQualityGrade, string> = {
    good: 'border-l-grade-good',
    moderate: 'border-l-grade-moderate',
    bad: 'border-l-grade-bad',
    veryBad: 'border-l-grade-very-bad',
  };
  return classes[grade];
}

export function getGradeEmoji(grade: AirQualityGrade): string {
  const emojis: Record<AirQualityGrade, string> = {
    good: '',
    moderate: '',
    bad: '',
    veryBad: '',
  };
  return emojis[grade];
}

export function getCurrentHourData(hourly: AirQualityHourly[]): AirQualityHourly {
  const now = new Date();
  const currentHour = format(now, "yyyy-MM-dd'T'HH:00");

  const match = hourly.find((h) => h.time === currentHour);
  if (match) return match;

  const past = hourly
    .filter((h) => h.time <= currentHour && (h.pm25 !== null || h.pm10 !== null))
    .sort((a, b) => b.time.localeCompare(a.time));

  return past[0] || hourly[hourly.length - 1] || { time: currentHour, pm25: null, pm10: null };
}

export function groupByDate(hourly: AirQualityHourly[]): Map<string, AirQualityHourly[]> {
  const map = new Map<string, AirQualityHourly[]>();
  for (const h of hourly) {
    const date = h.time.substring(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(h);
  }
  return map;
}

export function calculateDailyStats(hourlyByDate: Map<string, AirQualityHourly[]>): DailyAirQuality[] {
  const results: DailyAirQuality[] = [];

  for (const [date, hours] of hourlyByDate) {
    const pm25Values = hours.map((h) => h.pm25).filter((v): v is number => v !== null);
    const pm10Values = hours.map((h) => h.pm10).filter((v): v is number => v !== null);

    if (pm25Values.length === 0 && pm10Values.length === 0) continue;

    const pm25Avg = pm25Values.length > 0 ? Math.round(pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length) : 0;
    const pm25Max = pm25Values.length > 0 ? Math.round(Math.max(...pm25Values)) : 0;
    const pm10Avg = pm10Values.length > 0 ? Math.round(pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length) : 0;
    const pm10Max = pm10Values.length > 0 ? Math.round(Math.max(...pm10Values)) : 0;

    const pm25Grade = getGrade(pm25Avg, 'pm25');
    const pm10Grade = getGrade(pm10Avg, 'pm10');

    results.push({
      date,
      pm25Avg,
      pm25Max,
      pm10Avg,
      pm10Max,
      pm25Grade,
      pm10Grade,
      overallGrade: getOverallGrade(pm25Grade, pm10Grade),
    });
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDateKorean(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'M월 d일 (EEE)', { locale: ko });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'M/d (EEE)', { locale: ko });
  } catch {
    return dateStr;
  }
}

export function formatHour(timeStr: string): string {
  try {
    return format(parseISO(timeStr), 'HH:mm');
  } catch {
    return timeStr;
  }
}

export function formatFullDateTime(timeStr: string): string {
  try {
    return format(parseISO(timeStr), 'yyyy년 M월 d일 HH:mm 기준', { locale: ko });
  } catch {
    return timeStr;
  }
}

// --- WMA Prediction Model ---

function weightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = i + 1;
    weightedSum += values[i] * weight;
    weightTotal += weight;
  }
  return weightedSum / weightTotal;
}

/**
 * Theil-Sen 추정량: 모든 점 쌍의 기울기 중앙값 사용 (outlier에 강건)
 */
function theilSenSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const slopes: number[] = [];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      slopes.push((values[j] - values[i]) / (j - i));
    }
  }
  slopes.sort((a, b) => a - b);
  // 중앙값
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0
    ? (slopes[mid - 1] + slopes[mid]) / 2
    : slopes[mid];
}

/**
 * IQR 기반 outlier clipping
 */
function clipOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values.map(v => Math.max(lower, Math.min(upper, v)));
}

function wmaPredictNext(values: number[], trendWeight = 0.3): number {
  const clipped = clipOutliers(values);
  const wma = weightedMovingAverage(clipped);
  const slope = theilSenSlope(clipped);
  const predicted = wma + slope * trendWeight;
  return Math.max(0, Math.round(predicted));
}

export function generatePrediction(
  today: DailyAirQuality | undefined,
  tomorrow: DailyAirQuality | undefined,
  history?: DailyAirQuality[],
  weather?: WeatherData,
  todayHourly?: AirQualityHourly[],
  visualAnalyses?: VisualAnalysisResult[],
): PredictionInfo | null {
  if (!tomorrow) return null;

  let predictedPm25 = tomorrow.pm25Avg;
  let predictedPm10 = tomorrow.pm10Avg;

  if (history && history.length >= 3) {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const recent = today ? [...sorted.slice(-4), today] : sorted.slice(-5);

    const pm25Values = recent.map((d) => d.pm25Avg).filter((v) => v > 0);
    const pm10Values = recent.map((d) => d.pm10Avg).filter((v) => v > 0);

    // 적응형 blend ratio: 최근 오차 기반
    let wmaRatio = 0.6; // 기본값

    if (sorted.length >= 4 && tomorrow) {
      // 최근 3일에 대해 WMA 오차 vs Open-Meteo 오차 비교
      const testDays = sorted.slice(-3);
      let wmaErrorSum = 0, omErrorSum = 0, testCount = 0;

      for (let i = 0; i < testDays.length; i++) {
        const dayIdx = sorted.indexOf(testDays[i]);
        if (dayIdx < 2) continue;
        const windowPm25 = sorted.slice(Math.max(0, dayIdx - 5), dayIdx).map(d => d.pm25Avg).filter(v => v > 0);
        if (windowPm25.length >= 2) {
          const wmaPred = wmaPredictNext(windowPm25, 0.3);
          wmaErrorSum += Math.abs(wmaPred - testDays[i].pm25Avg);
          omErrorSum += Math.abs(tomorrow.pm25Avg - testDays[i].pm25Avg);
          testCount++;
        }
      }

      if (testCount > 0) {
        const avgWmaErr = wmaErrorSum / testCount + 0.01; // epsilon
        const avgOmErr = omErrorSum / testCount + 0.01;
        const wmaWeight = 1 / avgWmaErr;
        const omWeight = 1 / avgOmErr;
        wmaRatio = wmaWeight / (wmaWeight + omWeight);
        // Clamping: [0.3, 0.8]
        wmaRatio = Math.max(0.3, Math.min(0.8, wmaRatio));
      }
    }

    if (pm25Values.length >= 3) {
      const wmaPm25 = wmaPredictNext(pm25Values, 0.3);
      predictedPm25 = Math.round(wmaPm25 * wmaRatio + tomorrow.pm25Avg * (1 - wmaRatio));
    }
    if (pm10Values.length >= 3) {
      const wmaPm10 = wmaPredictNext(pm10Values, 0.3);
      predictedPm10 = Math.round(wmaPm10 * wmaRatio + tomorrow.pm10Avg * (1 - wmaRatio));
    }
  }

  // 1) 중국 산업 보정 (풍향+풍속 통합)
  const tomorrowDate = new Date(tomorrow.date);
  const chinaResult = calculateChinaFactor(
    tomorrowDate,
    weather?.windDirection ?? null,
    weather?.windSpeed ?? null
  );

  // 2) 기상 보정 (강수, 안정도, 습도, 선행지표)
  const defaultWeather: WeatherData = {
    windDirection: null, windSpeed: null, temperature: null,
    humidity: null, precipitation: null, precipitationProbability: null,
    pressureMsl: null, surfacePressure: null, cloudCover: null,
  };
  const weatherResult = calculateWeatherFactor(
    weather ?? defaultWeather,
    todayHourly ?? []
  );

  // 3) CCTV 시각 보정 (선택적)
  const visualResult = visualAnalyses && visualAnalyses.length > 0
    ? calculateVisualFactor(visualAnalyses)
    : null;

  // 종합 적용: china factor × weather factor × visual factor
  // 안전 범위: [0.2, 3.0]
  const totalFactor = Math.max(0.2, Math.min(3.0,
    chinaResult.combinedFactor *
    weatherResult.combinedFactor *
    (visualResult?.combinedFactor ?? 1.0)
  ));

  predictedPm25 = Math.max(0, Math.round(predictedPm25 * totalFactor));
  predictedPm10 = Math.max(0, Math.round(predictedPm10 * totalFactor));

  const todayAvg = today?.pm25Avg ?? 0;
  const diff = predictedPm25 - todayAvg;

  let trend: PredictionInfo['trend'];
  if (diff > 5) trend = 'worsening';
  else if (diff < -5) trend = 'improving';
  else trend = 'stable';

  const pm25Grade = getGrade(predictedPm25, 'pm25');
  const pm10Grade = getGrade(predictedPm10, 'pm10');
  const tomorrowGrade = getOverallGrade(pm25Grade, pm10Grade);

  let message: string;
  if (trend === 'worsening') {
    message = '내일은 오늘보다 미세먼지 농도가 높아질 것으로 예상됩니다. 외출 시 마스크 착용을 권장합니다.';
  } else if (trend === 'improving') {
    message = '내일은 오늘보다 미세먼지 농도가 낮아질 것으로 예상됩니다. 환기하기 좋은 날이 될 것 같습니다.';
  } else {
    message = '내일은 오늘과 비슷한 미세먼지 수준이 예상됩니다.';
  }

  if (tomorrowGrade === 'bad' || tomorrowGrade === 'veryBad') {
    message += ' 실외 활동을 자제해 주세요.';
  }

  // 보정 요인 요약 추가
  const allFactors: string[] = [];
  if (chinaResult.summary !== '특별한 보정 요인 없음') allFactors.push(chinaResult.summary);
  if (weatherResult.summary !== '특별한 기상 보정 없음') allFactors.push(weatherResult.summary);
  if (visualResult && visualResult.summary !== 'CCTV 분석 데이터 없음') allFactors.push(visualResult.summary);
  if (allFactors.length > 0) {
    message += ` (보정: ${allFactors.join(' / ')})`;
  }

  return {
    tomorrowGrade,
    trend,
    tomorrowPm25Avg: predictedPm25,
    tomorrowPm10Avg: predictedPm10,
    message,
    chinaFactor: {
      combinedFactor: chinaResult.combinedFactor,
      summary: chinaResult.summary,
      windDescription: chinaResult.windDescription,
      holidayName: chinaResult.holidayName,
      seasonalFactor: chinaResult.seasonalFactor,
    },
    weatherFactors: {
      precipitationFactor: weatherResult.precipitationFactor,
      stabilityFactor: weatherResult.stabilityFactor,
      humidityFactor: weatherResult.humidityFactor,
      leadingIndicatorFactor: weatherResult.leadingIndicatorFactor,
      summary: weatherResult.summary,
    },
    visualFactor: visualResult ? {
      combinedFactor: visualResult.combinedFactor,
      haziness: visualResult.haziness,
      cameraCount: visualResult.cameraCount,
      summary: visualResult.summary,
    } : undefined,
  };
}

// --- Accuracy calculation with time-weighted Normalized MAE ---

const PM25_RANGE = 75;
const PM10_RANGE = 150;
const ACCURACY_DECAY = 0.85; // 시간 가중 감쇠율

export function calculateAccuracy(
  history: DailyAirQuality[],
  forecast: DailyAirQuality[]
): AccuracyInfo | null {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 3) return null;

  const pm25Errors: number[] = [];
  const pm10Errors: number[] = [];
  const weights: number[] = [];
  let gradeMatches = 0;
  let comparisons = 0;

  for (let i = 2; i < sorted.length; i++) {
    const actual = sorted[i];
    const windowStart = Math.max(0, i - 5);
    const window = sorted.slice(windowStart, i);

    const pm25Window = window.map((d) => d.pm25Avg).filter((v) => v >= 0);
    const pm10Window = window.map((d) => d.pm10Avg).filter((v) => v >= 0);

    // 시간 가중: 최근일수록 가중치 높음
    const dayWeight = Math.pow(ACCURACY_DECAY, sorted.length - 1 - i);

    if (pm25Window.length >= 2) {
      const predicted = wmaPredictNext(pm25Window, 0.3);
      const error = Math.abs(predicted - actual.pm25Avg) / PM25_RANGE;
      pm25Errors.push(error);
      weights.push(dayWeight);

      const predictedGrade = getGrade(predicted, 'pm25');
      if (predictedGrade === actual.pm25Grade) gradeMatches++;
      comparisons++;
    }

    if (pm10Window.length >= 2) {
      const predicted = wmaPredictNext(pm10Window, 0.3);
      const error = Math.abs(predicted - actual.pm10Avg) / PM10_RANGE;
      pm10Errors.push(error);
    }
  }

  if (pm25Errors.length === 0 && pm10Errors.length === 0) return null;

  // 가중 평균 오차 계산
  const weightedAvg = (errors: number[], wts: number[]): number => {
    if (errors.length === 0) return 0;
    let sumWeightedError = 0;
    let sumWeights = 0;
    for (let i = 0; i < errors.length; i++) {
      const w = i < wts.length ? wts[i] : 1;
      sumWeightedError += errors[i] * w;
      sumWeights += w;
    }
    return sumWeights > 0 ? sumWeightedError / sumWeights : 0;
  };

  const avgPm25Error = weightedAvg(pm25Errors, weights);
  const avgPm10Error = weightedAvg(pm10Errors, weights);

  const pm25Accuracy = Math.round(Math.max(0, Math.min(100, (1 - avgPm25Error) * 100)));
  const pm10Accuracy = Math.round(Math.max(0, Math.min(100, (1 - avgPm10Error) * 100)));
  const overallAccuracy = Math.round((pm25Accuracy + pm10Accuracy) / 2);
  const gradeMatchRate = comparisons > 0 ? Math.round((gradeMatches / comparisons) * 100) : 0;

  return {
    pm25Accuracy,
    pm10Accuracy,
    overallAccuracy,
    gradeMatchRate,
    sampleDays: sorted.length,
  };
}

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function displayValue(value: number | null): string {
  return value !== null ? Math.round(value).toString() : '--';
}
