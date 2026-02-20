export interface City {
  name: string;
  slug: string;
  lat: number;
  lon: number;
  region: string;
}

export type AirQualityGrade = 'good' | 'moderate' | 'bad' | 'veryBad';

export type GradeLabel = '좋음' | '보통' | '나쁨' | '매우나쁨';

export interface AirQualityHourly {
  time: string;
  pm25: number | null;
  pm10: number | null;
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

export interface CityAirQualityDetail {
  city: City;
  current: AirQualityHourly;
  todayHourly: AirQualityHourly[];
  dailyStats: DailyAirQuality[];
  forecast: DailyAirQuality[];
  history: DailyAirQuality[];
  windDirection: number | null;
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
  };
  hourly_units: {
    time: string;
    pm10: string;
    pm2_5: string;
  };
}
