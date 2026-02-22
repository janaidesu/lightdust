export interface City {
  name: string;
  slug: string;
  lat: number;
  lon: number;
  region: string;
}

/** 도시별 보정 프로파일 */
export interface CityProfile {
  chinaInfluence: number;   // 0-1, 중국 영향 민감도
  basinEffect: number;      // 0-1, 분지 정체 효과
  coastalEffect: number;    // 0-1, 해양 정화 효과
}

export type AirQualityGrade = 'good' | 'moderate' | 'bad' | 'veryBad';

export type GradeLabel = '좋음' | '보통' | '나쁨' | '매우나쁨';

export interface AirQualityHourly {
  time: string;
  pm25: number | null;
  pm10: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
}

export interface DailyAirQuality {
  date: string;
  pm25Avg: number;
  pm25Max: number;
  pm10Avg: number;
  pm10Max: number;
  pm25Grade: AirQualityGrade;
  pm10Grade: AirQualityGrade;
  overallGrade: AirQualityGrade;
}

export interface CityAirQualitySummary {
  city: City;
  currentPm25: number | null;
  currentPm10: number | null;
  pm25Grade: AirQualityGrade;
  pm10Grade: AirQualityGrade;
  overallGrade: AirQualityGrade;
  updatedAt: string;
}

/** 기상 데이터 (Weather API에서 가져옴) */
export interface WeatherData {
  windDirection: number | null;
  windSpeed: number | null;
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  pressureMsl: number | null;
  surfacePressure: number | null;
  cloudCover: number | null;
}

export interface CityAirQualityDetail {
  city: City;
  current: AirQualityHourly;
  todayHourly: AirQualityHourly[];
  dailyStats: DailyAirQuality[];
  forecast: DailyAirQuality[];
  history: DailyAirQuality[];
  weather: WeatherData;
}

/** CCTV 카메라 정보 */
export interface CCTVStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  streamUrl: string;
  snapshotUrl?: string;
  source: 'its' | 'topis' | 'mock';
  roadName?: string;
}

/** 이미지 분석 메트릭 */
export interface VisualMetrics {
  contrast: number;              // 0-1, RMS 대비
  edgeDensity: number;           // 0-1, 에지 픽셀 비율
  colorShift: number;            // 0-1, 블루-그레이 편향
  brightness: number;            // 0-255, 평균 휘도
  brightnessUniformity: number;  // 0-1, 휘도 균일도 (높을수록 흐림)
  haziness: number;              // 0-1, 종합 흐림도
}

/** CCTV 개별 분석 결과 */
export interface VisualAnalysisResult {
  cctvId: string;
  cctvName: string;
  timestamp: string;
  snapshotUrl: string;
  metrics: VisualMetrics;
  visibilityGrade: AirQualityGrade;
  estimatedPm25Range: { min: number; max: number };
  confidence: number;            // 0-1
}

/** 시각 보정 계수 종합 결과 */
export interface VisualFactorResult {
  combinedFactor: number;
  haziness: number;
  cameraCount: number;
  summary: string;
  analyses: VisualAnalysisResult[];
}

export interface PredictionInfo {
  tomorrowGrade: AirQualityGrade;
  trend: 'improving' | 'stable' | 'worsening';
  tomorrowPm25Avg: number;
  tomorrowPm10Avg: number;
  message: string;
  chinaFactor?: {
    combinedFactor: number;
    summary: string;
    windDescription: string;
    holidayName: string | null;
    seasonalFactor: number;
  };
  weatherFactors?: {
    precipitationFactor: number;
    stabilityFactor: number;
    humidityFactor: number;
    leadingIndicatorFactor: number;
    summary: string;
  };
  visualFactor?: {
    combinedFactor: number;
    haziness: number;
    cameraCount: number;
    summary: string;
  };
}

export interface AccuracyInfo {
  pm25Accuracy: number;  // 0-100%
  pm10Accuracy: number;  // 0-100%
  overallAccuracy: number; // 0-100%
  gradeMatchRate: number;  // 등급 일치율 0-100%
  sampleDays: number;      // 비교에 사용된 일수
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    pm10: (number | null)[];
    pm2_5: (number | null)[];
    nitrogen_dioxide?: (number | null)[];
    sulphur_dioxide?: (number | null)[];
    carbon_monoxide?: (number | null)[];
  };
  hourly_units: {
    time: string;
    pm10: string;
    pm2_5: string;
  };
}
