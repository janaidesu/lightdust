import { describe, it, expect } from 'vitest';
import {
  getWeekdayFactor,
  getHolidayFactor,
  getSeasonalFactor,
  getWindFactor,
  calculateChinaFactor,
} from '../china-factor';

describe('getWeekdayFactor', () => {
  it('returns highest factor on a Tuesday (Mon+Tue both full rate)', () => {
    // Tuesday: todayRate=1.0, yesterdayRate=1.0 → 1.0*0.6 + 1.0*0.4 = 1.0
    const tuesday = new Date('2026-06-30'); // Tuesday
    expect(getWeekdayFactor(tuesday)).toBe(1.0);
  });

  it('returns lowest factor on a Sunday (Sat+Sun low rates)', () => {
    // Sunday: todayRate=0.4, yesterdayRate=0.6 → 0.6*0.6 + 0.4*0.4 = 0.52
    const sunday = new Date('2026-06-28');
    expect(getWeekdayFactor(sunday)).toBe(0.52);
  });

  it('returns reduced factor on Saturday', () => {
    // Saturday: todayRate=0.6, yesterdayRate=0.9 → 0.9*0.6 + 0.6*0.4 = 0.78
    const saturday = new Date('2026-06-27');
    expect(getWeekdayFactor(saturday)).toBe(0.78);
  });

  it('returns mixed factor on Monday (blend of Sun+Mon)', () => {
    // Monday: todayRate=1.0, yesterdayRate=0.4 → 0.4*0.6 + 1.0*0.4 = 0.64
    const monday = new Date('2026-06-29');
    expect(getWeekdayFactor(monday)).toBe(0.64);
  });
});

describe('getHolidayFactor', () => {
  it('returns Spring Festival factor during 2026 춘절', () => {
    const date = new Date('2026-02-15');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(0.2);
    expect(result.holidayName).toBe('춘절');
  });

  it('returns National Day factor during 국경절', () => {
    const date = new Date('2026-10-03');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(0.3);
    expect(result.holidayName).toBe('국경절');
  });

  it('returns Labor Day factor during 노동절', () => {
    const date = new Date('2026-05-03');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(0.5);
    expect(result.holidayName).toBe('노동절');
  });

  it('returns 청명절 factor', () => {
    const date = new Date('2026-04-05');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(0.6);
    expect(result.holidayName).toBe('청명절');
  });

  it('returns Dragon Boat factor for 2026 단오절', () => {
    const date = new Date('2026-06-18');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(0.6);
    expect(result.holidayName).toBe('단오절');
  });

  it('returns Mid-Autumn factor for 2026 중추절', () => {
    const date = new Date('2026-09-24');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(0.5);
    expect(result.holidayName).toBe('중추절');
  });

  it('returns factor 1.0 and null name on a normal day', () => {
    const date = new Date('2026-06-30');
    const result = getHolidayFactor(date);
    expect(result.factor).toBe(1.0);
    expect(result.holidayName).toBeNull();
  });
});

describe('getSeasonalFactor', () => {
  it('returns highest factor in January', () => {
    expect(getSeasonalFactor(new Date('2026-01-15'))).toBe(1.3);
  });

  it('returns lowest factor in July/August', () => {
    expect(getSeasonalFactor(new Date('2026-07-15'))).toBe(0.7);
    expect(getSeasonalFactor(new Date('2026-08-15'))).toBe(0.7);
  });

  it('returns moderate factor in spring', () => {
    expect(getSeasonalFactor(new Date('2026-04-15'))).toBe(1.0);
  });

  it('returns elevated factor in November', () => {
    expect(getSeasonalFactor(new Date('2026-11-15'))).toBe(1.1);
  });
});

describe('getWindFactor', () => {
  it('returns factor 1.0 when wind direction is null', () => {
    const result = getWindFactor(null, null);
    expect(result.factor).toBe(1.0);
    expect(result.description).toBe('풍향 데이터 없음');
  });

  it('returns high factor for westerly wind (240-300 deg) with moderate speed', () => {
    const result = getWindFactor(270, 5);
    expect(result.factor).toBeGreaterThan(1.3);
    expect(result.description).toContain('서풍');
  });

  it('returns moderate factor for NW wind', () => {
    const result = getWindFactor(320, 3);
    expect(result.factor).toBeGreaterThan(1.1);
    expect(result.description).toContain('북서풍');
  });

  it('returns low factor for easterly wind (clean ocean air)', () => {
    const result = getWindFactor(90, 5);
    expect(result.factor).toBeLessThan(1.0);
    expect(result.description).toContain('동풍');
  });

  it('reduces factor for strong wind with westerly direction (dispersion)', () => {
    const normalWind = getWindFactor(270, 5);
    const strongWind = getWindFactor(270, 12);
    expect(strongWind.factor).toBeLessThan(normalWind.factor);
  });

  it('increases factor for light wind with easterly direction (stagnation)', () => {
    const lightWind = getWindFactor(90, 1);
    const normalWind = getWindFactor(90, 5);
    expect(lightWind.factor).toBeGreaterThan(normalWind.factor);
  });

  it('normalizes negative wind direction', () => {
    const result = getWindFactor(-90, 5);
    // -90 → 270 (westerly)
    expect(result.factor).toBeGreaterThan(1.3);
  });

  it('normalizes wind direction > 360', () => {
    const result = getWindFactor(630, 5); // 630 % 360 = 270
    expect(result.factor).toBeGreaterThan(1.3);
  });

  it('handles north wind correctly', () => {
    const result = getWindFactor(350, 3);
    expect(result.description).toContain('북풍');
  });
});

describe('calculateChinaFactor', () => {
  it('returns a combined result with all sub-factors', () => {
    const date = new Date('2026-01-15'); // January, Thursday
    const result = calculateChinaFactor(date, 270, 5);
    expect(result).toHaveProperty('combinedFactor');
    expect(result).toHaveProperty('weekdayRate');
    expect(result).toHaveProperty('seasonalFactor');
    expect(result).toHaveProperty('windFactor');
    expect(result).toHaveProperty('windDescription');
    expect(result).toHaveProperty('holidayName');
    expect(result).toHaveProperty('holidayFactor');
    expect(result).toHaveProperty('summary');
  });

  it('returns elevated combined factor in winter with westerly wind', () => {
    const date = new Date('2026-01-15');
    const result = calculateChinaFactor(date, 270, 5);
    expect(result.combinedFactor).toBeGreaterThan(1.5);
    expect(result.summary).toContain('겨울철 난방 영향');
  });

  it('returns reduced combined factor during summer with easterly wind', () => {
    const date = new Date('2026-07-15');
    const result = calculateChinaFactor(date, 90, 5);
    expect(result.combinedFactor).toBeLessThan(0.7);
  });

  it('reflects holiday factor during 춘절', () => {
    const date = new Date('2026-02-15');
    const result = calculateChinaFactor(date, null, null);
    expect(result.holidayName).toBe('춘절');
    expect(result.holidayFactor).toBe(0.2);
    expect(result.summary).toContain('춘절 연휴');
  });

  it('returns default summary when no special factors', () => {
    // A Wednesday in April with no wind data
    const date = new Date('2026-04-15');
    const result = calculateChinaFactor(date, null, null);
    expect(result.summary).toBe('특별한 보정 요인 없음');
  });

  it('returns lower combined factor on weekends due to reduced factory rate', () => {
    const sunday = new Date('2026-04-12'); // Sunday in April
    const tuesday = new Date('2026-04-14'); // Tuesday in April
    const sundayResult = calculateChinaFactor(sunday, null, null);
    const tuesdayResult = calculateChinaFactor(tuesday, null, null);
    expect(sundayResult.weekdayRate).toBeLessThan(tuesdayResult.weekdayRate);
    expect(sundayResult.combinedFactor).toBeLessThan(tuesdayResult.combinedFactor);
  });
});
