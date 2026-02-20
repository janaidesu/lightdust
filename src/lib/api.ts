import {
  OpenMeteoAirQualityResponse,
  CityAirQualitySummary,
  CityAirQualityDetail,
  AirQualityHourly,
  DailyAirQuality,
  WeatherData,
} from './types';
import { CITIES } from './constants';
import {
  getGrade,
  getOverallGrade,
  getCurrentHourData,
  groupByDate,
  calculateDailyStats,
} from './utils';
import { format } from 'date-fns';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/** Air Quality API 파라미터: PM + 보조 오염물질 (NO2, SO2, CO) */
const AQ_PARAMS = 'pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide';

/** Weather API 파라미터: 풍향, 풍속, 온도, 습도, 강수, 기압, 운량 */
const WEATHER_PARAMS = 'wind_direction_10m,wind_speed_10m,temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,pressure_msl,surface_pressure,cloud_cover';

function parseHourlyData(response: OpenMeteoAirQualityResponse): AirQualityHourly[] {
  const { time, pm2_5, pm10 } = response.hourly;
  const no2 = response.hourly.nitrogen_dioxide;
  const so2 = response.hourly.sulphur_dioxide;
  const co = response.hourly.carbon_monoxide;

  return time.map((t, i) => ({
    time: t,
    pm25: pm2_5[i],
    pm10: pm10[i],
    no2: no2?.[i] ?? null,
    so2: so2?.[i] ?? null,
    co: co?.[i] ?? null,
  }));
}

export async function fetchAllCitiesCurrent(): Promise<CityAirQualitySummary[]> {
  const lats = CITIES.map((c) => c.lat).join(',');
  const lons = CITIES.map((c) => c.lon).join(',');

  const url = `${BASE_URL}?latitude=${lats}&longitude=${lons}&hourly=pm10,pm2_5&timezone=Asia/Seoul&forecast_days=1&past_days=1`;

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

  const data = await res.json();

  // When multiple locations, response is an array
  const responses: OpenMeteoAirQualityResponse[] = Array.isArray(data) ? data : [data];

  return responses.map((response, index) => {
    const city = CITIES[index];
    const hourly = parseHourlyData(response);
    const current = getCurrentHourData(hourly);
    const pm25Grade = getGrade(current.pm25, 'pm25');
    const pm10Grade = getGrade(current.pm10, 'pm10');

    return {
      city,
      currentPm25: current.pm25 !== null ? Math.round(current.pm25) : null,
      currentPm10: current.pm10 !== null ? Math.round(current.pm10) : null,
      pm25Grade,
      pm10Grade,
      overallGrade: getOverallGrade(pm25Grade, pm10Grade),
      updatedAt: current.time,
    };
  });
}

/**
 * 현재 시간의 기상 데이터를 가져옵니다.
 * 풍향, 풍속, 기온, 습도, 강수, 기압, 운량을 한 번에 요청합니다.
 */
async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  const defaultWeather: WeatherData = {
    windDirection: null,
    windSpeed: null,
    temperature: null,
    humidity: null,
    precipitation: null,
    precipitationProbability: null,
    pressureMsl: null,
    surfacePressure: null,
    cloudCover: null,
  };

  try {
    const url = `${WEATHER_BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=${WEATHER_PARAMS}&timezone=Asia/Seoul&forecast_days=2&past_days=0`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return defaultWeather;

    const data = await res.json();
    const times: string[] = data.hourly?.time ?? [];

    const now = new Date();
    const currentHour = format(now, "yyyy-MM-dd'T'HH:00");

    // 현재 시간 또는 가장 가까운 과거 시간 찾기
    let idx = times.indexOf(currentHour);
    if (idx === -1) {
      for (let i = times.length - 1; i >= 0; i--) {
        if (times[i] <= currentHour) {
          idx = i;
          break;
        }
      }
    }

    if (idx === -1) return defaultWeather;

    const h = data.hourly;
    return {
      windDirection: h.wind_direction_10m?.[idx] ?? null,
      windSpeed: h.wind_speed_10m?.[idx] ?? null,
      temperature: h.temperature_2m?.[idx] ?? null,
      humidity: h.relative_humidity_2m?.[idx] ?? null,
      precipitation: h.precipitation?.[idx] ?? null,
      precipitationProbability: h.precipitation_probability?.[idx] ?? null,
      pressureMsl: h.pressure_msl?.[idx] ?? null,
      surfacePressure: h.surface_pressure?.[idx] ?? null,
      cloudCover: h.cloud_cover?.[idx] ?? null,
    };
  } catch {
    return defaultWeather;
  }
}

export async function fetchCityDetail(slug: string): Promise<CityAirQualityDetail | null> {
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) return null;

  // Air Quality: PM + NO2/SO2/CO, 7일 과거 + 7일 예보
  const aqUrl = `${BASE_URL}?latitude=${city.lat}&longitude=${city.lon}&hourly=${AQ_PARAMS}&timezone=Asia/Seoul&past_days=7&forecast_days=7`;

  // Air Quality + Weather 병렬 호출 (2회만)
  const [aqRes, weather] = await Promise.all([
    fetch(aqUrl, { next: { revalidate: 1800 } }),
    fetchCurrentWeather(city.lat, city.lon),
  ]);

  if (!aqRes.ok) throw new Error(`Open-Meteo API error: ${aqRes.status}`);

  const data: OpenMeteoAirQualityResponse = await aqRes.json();
  const hourly = parseHourlyData(data);
  const current = getCurrentHourData(hourly);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayHourly = hourly.filter((h) => h.time.startsWith(today));

  const byDate = groupByDate(hourly);
  const allDailyStats = calculateDailyStats(byDate);

  const history = allDailyStats.filter((d) => d.date < today);
  const forecast = allDailyStats
    .filter((d) => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    city,
    current,
    todayHourly,
    dailyStats: allDailyStats,
    forecast,
    history,
    weather,
  };
}

export async function fetchCityHistory(
  slug: string,
  pastDays: number
): Promise<DailyAirQuality[]> {
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) return [];

  const url = `${BASE_URL}?latitude=${city.lat}&longitude=${city.lon}&hourly=pm10,pm2_5&timezone=Asia/Seoul&past_days=${pastDays}&forecast_days=0`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

  const data: OpenMeteoAirQualityResponse = await res.json();
  const hourly = parseHourlyData(data);
  const byDate = groupByDate(hourly);
  return calculateDailyStats(byDate);
}
