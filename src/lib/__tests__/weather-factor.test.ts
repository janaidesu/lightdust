import { describe, it, expect } from 'vitest';
import type { WeatherData, AirQualityHourly } from '../types';
import {
  getPrecipitationFactor,
  getStabilityFactor,
  getHumidityFactor,
  getLeadingIndicatorFactor,
  calculateWeatherFactor,
} from '../weather-factor';

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    windDirection: null,
    windSpeed: null,
    temperature: null,
    humidity: null,
    precipitation: null,
    precipitationProbability: null,
    pressureMsl: null,
    surfacePressure: null,
    cloudCover: null,
    ...overrides,
  };
}

describe('getPrecipitationFactor', () => {
  it('returns 0.4 for heavy rain (high prob + high amount)', () => {
    const w = makeWeather({ precipitationProbability: 80, precipitation: 10 });
    const result = getPrecipitationFactor(w);
    expect(result.factor).toBe(0.4);
    expect(result.description).toContain('강한 비');
  });

  it('returns 0.6 for moderate rain', () => {
    const w = makeWeather({ precipitationProbability: 80, precipitation: 3 });
    const result = getPrecipitationFactor(w);
    expect(result.factor).toBe(0.6);
  });

  it('returns 0.8 for possible rain (>50% prob)', () => {
    const w = makeWeather({ precipitationProbability: 55, precipitation: 0 });
    const result = getPrecipitationFactor(w);
    expect(result.factor).toBe(0.8);
  });

  it('returns 1.0 when no precipitation expected', () => {
    const w = makeWeather({ precipitationProbability: 10, precipitation: 0 });
    const result = getPrecipitationFactor(w);
    expect(result.factor).toBe(1.0);
  });

  it('handles null values as zero', () => {
    const w = makeWeather();
    const result = getPrecipitationFactor(w);
    expect(result.factor).toBe(1.0);
  });
});

describe('getStabilityFactor', () => {
  it('returns high stability factor for stagnant conditions', () => {
    const w = makeWeather({
      windSpeed: 1,
      humidity: 90,
      cloudCover: 10,
      pressureMsl: 1030,
      surfacePressure: 1015,
    });
    const result = getStabilityFactor(w);
    expect(result.factor).toBeGreaterThan(1.2);
    expect(result.description).toContain('매우 안정');
  });

  it('returns low stability factor for windy, cloudy conditions', () => {
    const w = makeWeather({
      windSpeed: 10,
      humidity: 40,
      cloudCover: 90,
      pressureMsl: 1005,
      surfacePressure: 1005,
    });
    const result = getStabilityFactor(w);
    expect(result.factor).toBeLessThanOrEqual(0.76);
    expect(result.description).toContain('불안정');
  });

  it('returns moderate factor with default values', () => {
    const w = makeWeather();
    const result = getStabilityFactor(w);
    expect(result.factor).toBeGreaterThanOrEqual(0.7);
    expect(result.factor).toBeLessThanOrEqual(1.3);
  });

  it('clamps stability score to [0,1] range', () => {
    // Extreme stagnant conditions that might push score over 1
    const w = makeWeather({
      windSpeed: 0.5,
      humidity: 95,
      cloudCover: 5,
      pressureMsl: 1035,
      surfacePressure: 1010,
    });
    const result = getStabilityFactor(w);
    // factor = 0.7 + score * 0.6, max score = 1.0 → max factor = 1.3
    expect(result.factor).toBeLessThanOrEqual(1.3);
  });
});

describe('getHumidityFactor', () => {
  it('returns 1.3 for very high humidity (>85%)', () => {
    const w = makeWeather({ humidity: 90 });
    const result = getHumidityFactor(w);
    expect(result.factor).toBe(1.3);
    expect(result.description).toContain('고습도');
  });

  it('returns interpolated factor for 70-85% humidity', () => {
    const w = makeWeather({ humidity: 78 });
    const result = getHumidityFactor(w);
    // extra = (78 - 70) * 0.02 = 0.16 → factor = 1.16
    expect(result.factor).toBe(1.16);
  });

  it('returns 1.0 for normal humidity', () => {
    const w = makeWeather({ humidity: 50 });
    const result = getHumidityFactor(w);
    expect(result.factor).toBe(1.0);
  });

  it('uses default 50 when humidity is null', () => {
    const w = makeWeather();
    const result = getHumidityFactor(w);
    expect(result.factor).toBe(1.0);
  });
});

describe('getLeadingIndicatorFactor', () => {
  function makeHourly(
    count: number,
    no2Fn: (i: number) => number | null = () => null,
    so2Fn: (i: number) => number | null = () => null,
    coFn: (i: number) => number | null = () => null,
  ): AirQualityHourly[] {
    return Array.from({ length: count }, (_, i) => ({
      time: `2026-06-30T${String(i).padStart(2, '0')}:00`,
      pm25: 25,
      pm10: 50,
      no2: no2Fn(i),
      so2: so2Fn(i),
      co: coFn(i),
    }));
  }

  it('returns 1.0 when data is insufficient (<6 hours)', () => {
    const hourly = makeHourly(3);
    const result = getLeadingIndicatorFactor(hourly);
    expect(result.factor).toBe(1.0);
    expect(result.description).toBe('데이터 부족');
  });

  it('returns 1.2 for rapidly increasing pollutants', () => {
    // Older half: low NO2, recent half: high NO2
    const hourly = makeHourly(
      24,
      (i) => (i < 12 ? 10 : 30), // tripled NO2
      (i) => (i < 12 ? 5 : 15),  // tripled SO2
      (i) => (i < 12 ? 100 : 300), // tripled CO
    );
    const result = getLeadingIndicatorFactor(hourly);
    expect(result.factor).toBe(1.2);
    expect(result.description).toContain('급증');
  });

  it('returns 0.9 for decreasing pollutants', () => {
    const hourly = makeHourly(
      24,
      (i) => (i < 12 ? 30 : 15), // halved NO2
      (i) => (i < 12 ? 20 : 10), // halved SO2
      (i) => (i < 12 ? 300 : 150), // halved CO
    );
    const result = getLeadingIndicatorFactor(hourly);
    expect(result.factor).toBe(0.9);
    expect(result.description).toContain('감소');
  });

  it('returns 1.0 for stable pollutants', () => {
    const hourly = makeHourly(24, () => 20, () => 10, () => 200);
    const result = getLeadingIndicatorFactor(hourly);
    expect(result.factor).toBe(1.0);
    expect(result.description).toBe('오염물질 안정');
  });

  it('handles null pollutant values gracefully', () => {
    const hourly = makeHourly(24, () => null, () => null, () => null);
    const result = getLeadingIndicatorFactor(hourly);
    expect(result.factor).toBe(1.0);
  });
});

describe('calculateWeatherFactor', () => {
  it('returns combined factor within safe range [0.3, 2.0]', () => {
    const w = makeWeather({
      precipitationProbability: 80,
      precipitation: 10,
      windSpeed: 0.5,
      humidity: 90,
      cloudCover: 5,
      pressureMsl: 1030,
      surfacePressure: 1015,
    });
    const result = calculateWeatherFactor(w, []);
    expect(result.combinedFactor).toBeGreaterThanOrEqual(0.3);
    expect(result.combinedFactor).toBeLessThanOrEqual(2.0);
  });

  it('returns all sub-factors in the result', () => {
    const w = makeWeather();
    const result = calculateWeatherFactor(w, []);
    expect(result).toHaveProperty('combinedFactor');
    expect(result).toHaveProperty('precipitationFactor');
    expect(result).toHaveProperty('stabilityFactor');
    expect(result).toHaveProperty('humidityFactor');
    expect(result).toHaveProperty('leadingIndicatorFactor');
    expect(result).toHaveProperty('summary');
  });

  it('returns default summary when conditions are moderate', () => {
    // Use values that produce stability factor in the neutral [0.85, 1.15] range
    const w = makeWeather({
      windSpeed: 2.5,    // < 3 → stabilityScore += 0.2
      humidity: 50,
      cloudCover: 15,    // < 20 → stabilityScore += 0.2 → total 0.4 → factor ≈ 0.94
      pressureMsl: 1013,
      surfacePressure: 1013,
      precipitationProbability: 10,
      precipitation: 0,
    });
    const result = calculateWeatherFactor(w, []);
    expect(result.summary).toBe('특별한 기상 보정 없음');
  });

  it('mentions precipitation in summary when raining', () => {
    const w = makeWeather({ precipitationProbability: 80, precipitation: 10 });
    const result = calculateWeatherFactor(w, []);
    expect(result.summary).toContain('비');
  });
});
