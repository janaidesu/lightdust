import {
  OpenMeteoAirQualityResponse,
  CityAirQualitySummary,
  CityAirQualityDetail,
  AirQualityHourly,
  DailyAirQuality,
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

function parseHourlyData(response: OpenMeteoAirQualityResponse): AirQualityHourly[] {
  const { time, pm2_5, pm10 } = response.hourly;
  return time.map((t, i) => ({
    time: t,
    pm25: pm2_5[i],
    pm10: pm10[i],
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

async function fetchCurrentWindDirection(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `${WEATHER_BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=wind_direction_10m&timezone=Asia/Seoul&forecast_days=2&past_days=0`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json();
    const times: string[] = data.hourly?.time ?? [];
    const directions: (number | null)[] = data.hourly?.wind_direction_10m ?? [];

    // Find the current hour's wind direction
    const now = new Date();
    const currentHour = format(now, "yyyy-MM-dd'T'HH:00");
    const idx = times.indexOf(currentHour);
    if (idx !== -1 && directions[idx] !== null) {
      return directions[idx];
    }

    // Fallback: find closest past hour with data
    for (let i = times.length - 1; i >= 0; i--) {
      if (times[i] <= currentHour && directions[i] !== null) {
        return directions[i];
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCityDetail(slug: string): Promise<CityAirQualityDetail | null> {
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) return null;

  const url = `${BASE_URL}?latitude=${city.lat}&longitude=${city.lon}&hourly=pm10,pm2_5&timezone=Asia/Seoul&past_days=7&forecast_days=7`;

  // Fetch air quality and wind direction in parallel
  const [res, windDirection] = await Promise.all([
    fetch(url, { next: { revalidate: 1800 } }),
    fetchCurrentWindDirection(city.lat, city.lon),
  ]);

  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

  const data: OpenMeteoAirQualityResponse = await res.json();
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
    windDirection,
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
