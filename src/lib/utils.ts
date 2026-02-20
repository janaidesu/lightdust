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
} from './types';
import { PM25_THRESHOLDS, PM10_THRESHOLDS, GRADE_ORDER, CITIES } from './constants';
import { calculateChinaFactor, type ChinaFactorResult } from './china-factor';

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

  // Fallback: find the closest past hour with data
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

// --- Weighted Moving Average (WMA) prediction model ---

/**
 * Calculate weighted moving average from an array of values.
 * More recent values get higher weights: [1, 2, 3, ..., n]
 */
function weightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = i + 1; // older=1, newest=n
    weightedSum += values[i] * weight;
    weightTotal += weight;
  }
  return weightedSum / weightTotal;
}

/**
 * Calculate linear trend (slope) from recent values using least squares.
 * Returns the average daily change.
 */
function calculateTrendSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * WMA prediction: combine weighted average with trend adjustment.
 * trendWeight controls how much the trend influences the forecast (0~1).
 */
function wmaPredictNext(values: number[], trendWeight = 0.3): number {
  const wma = weightedMovingAverage(values);
  const slope = calculateTrendSlope(values);
  // Predict next value = WMA + trend adjustment (damped)
  const predicted = wma + slope * trendWeight;
  return Math.max(0, Math.round(predicted));
}

export function generatePrediction(
  today: DailyAirQuality | undefined,
  tomorrow: DailyAirQuality | undefined,
  history?: DailyAirQuality[],
  windDirection?: number | null
): PredictionInfo | null {
  if (!tomorrow) return null;

  // Use WMA if we have enough history, otherwise fall back to Open-Meteo forecast
  let predictedPm25 = tomorrow.pm25Avg;
  let predictedPm10 = tomorrow.pm10Avg;

  if (history && history.length >= 3) {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    // Take up to last 5 days + today for WMA
    const recent = today ? [...sorted.slice(-4), today] : sorted.slice(-5);

    const pm25Values = recent.map((d) => d.pm25Avg).filter((v) => v > 0);
    const pm10Values = recent.map((d) => d.pm10Avg).filter((v) => v > 0);

    if (pm25Values.length >= 3) {
      const wmaPm25 = wmaPredictNext(pm25Values, 0.3);
      // Blend: 60% WMA + 40% Open-Meteo forecast for best accuracy
      predictedPm25 = Math.round(wmaPm25 * 0.6 + tomorrow.pm25Avg * 0.4);
    }
    if (pm10Values.length >= 3) {
      const wmaPm10 = wmaPredictNext(pm10Values, 0.3);
      predictedPm10 = Math.round(wmaPm10 * 0.6 + tomorrow.pm10Avg * 0.4);
    }
  }

  // Apply China industrial factor
  const tomorrowDate = new Date(tomorrow.date);
  const chinaResult = calculateChinaFactor(tomorrowDate, windDirection ?? null);

  // Apply the combined factor as a multiplier on the predicted values
  predictedPm25 = Math.max(0, Math.round(predictedPm25 * chinaResult.combinedFactor));
  predictedPm10 = Math.max(0, Math.round(predictedPm10 * chinaResult.combinedFactor));

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

  // Add China factor context to message
  if (chinaResult.summary !== '특별한 보정 요인 없음') {
    message += ` (보정 요인: ${chinaResult.summary})`;
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
  };
}

// --- Accuracy calculation using Normalized MAE back-testing ---

// Typical range for normalization (based on Korean air quality scale)
const PM25_RANGE = 75;  // 매우나쁨 기준 76 → 0~75 범위를 100%로
const PM10_RANGE = 150; // 매우나쁨 기준 151 → 0~150 범위를 100%로

export function calculateAccuracy(
  history: DailyAirQuality[],
  forecast: DailyAirQuality[]
): AccuracyInfo | null {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 3) return null;

  const pm25Errors: number[] = [];
  const pm10Errors: number[] = [];
  let gradeMatches = 0;
  let comparisons = 0;

  // Sliding window back-test: for each day from index 2 onward,
  // use preceding days to make a WMA prediction, then compare to actual.
  // Error is normalized by the pollutant range, not by the actual value,
  // so low-concentration days don't produce inflated error rates.
  for (let i = 2; i < sorted.length; i++) {
    const actual = sorted[i];
    const windowStart = Math.max(0, i - 5);
    const window = sorted.slice(windowStart, i);

    const pm25Window = window.map((d) => d.pm25Avg).filter((v) => v >= 0);
    const pm10Window = window.map((d) => d.pm10Avg).filter((v) => v >= 0);

    if (pm25Window.length >= 2) {
      const predicted = wmaPredictNext(pm25Window, 0.3);
      // Normalized error: absolute error / range
      const error = Math.abs(predicted - actual.pm25Avg) / PM25_RANGE;
      pm25Errors.push(error);

      // Grade comparison
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

  const avgPm25Error = pm25Errors.length > 0
    ? pm25Errors.reduce((a, b) => a + b, 0) / pm25Errors.length
    : 0;
  const avgPm10Error = pm10Errors.length > 0
    ? pm10Errors.reduce((a, b) => a + b, 0) / pm10Errors.length
    : 0;

  // Convert normalized error to accuracy percentage
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
