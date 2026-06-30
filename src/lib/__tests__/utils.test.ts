import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AirQualityGrade, AirQualityHourly, DailyAirQuality } from '../types';
import {
  getGrade,
  getOverallGrade,
  getGradeLabel,
  getGradeColor,
  getGradeBgClass,
  getGradeBorderClass,
  getGradeEmoji,
  groupByDate,
  calculateDailyStats,
  formatDateKorean,
  formatDateShort,
  formatHour,
  formatFullDateTime,
  calculateAccuracy,
  getCityBySlug,
  displayValue,
} from '../utils';

describe('getGrade', () => {
  describe('PM2.5 thresholds', () => {
    it('returns good for 0-15', () => {
      expect(getGrade(0, 'pm25')).toBe('good');
      expect(getGrade(10, 'pm25')).toBe('good');
      expect(getGrade(15, 'pm25')).toBe('good');
    });

    it('returns moderate for 16-35', () => {
      expect(getGrade(16, 'pm25')).toBe('moderate');
      expect(getGrade(25, 'pm25')).toBe('moderate');
      expect(getGrade(35, 'pm25')).toBe('moderate');
    });

    it('returns bad for 36-75', () => {
      expect(getGrade(36, 'pm25')).toBe('bad');
      expect(getGrade(50, 'pm25')).toBe('bad');
      expect(getGrade(75, 'pm25')).toBe('bad');
    });

    it('returns veryBad for 76+', () => {
      expect(getGrade(76, 'pm25')).toBe('veryBad');
      expect(getGrade(200, 'pm25')).toBe('veryBad');
    });
  });

  describe('PM10 thresholds', () => {
    it('returns good for 0-30', () => {
      expect(getGrade(0, 'pm10')).toBe('good');
      expect(getGrade(30, 'pm10')).toBe('good');
    });

    it('returns moderate for 31-80', () => {
      expect(getGrade(31, 'pm10')).toBe('moderate');
      expect(getGrade(80, 'pm10')).toBe('moderate');
    });

    it('returns bad for 81-150', () => {
      expect(getGrade(81, 'pm10')).toBe('bad');
      expect(getGrade(150, 'pm10')).toBe('bad');
    });

    it('returns veryBad for 151+', () => {
      expect(getGrade(151, 'pm10')).toBe('veryBad');
    });
  });

  it('returns good for null value', () => {
    expect(getGrade(null, 'pm25')).toBe('good');
  });

  it('returns good for negative value', () => {
    expect(getGrade(-5, 'pm25')).toBe('good');
  });
});

describe('getOverallGrade', () => {
  it('returns worse of the two grades', () => {
    expect(getOverallGrade('good', 'bad')).toBe('bad');
    expect(getOverallGrade('bad', 'good')).toBe('bad');
    expect(getOverallGrade('moderate', 'veryBad')).toBe('veryBad');
  });

  it('returns the same grade when both match', () => {
    expect(getOverallGrade('good', 'good')).toBe('good');
    expect(getOverallGrade('veryBad', 'veryBad')).toBe('veryBad');
  });
});

describe('getGradeLabel', () => {
  it('returns Korean labels for each grade', () => {
    expect(getGradeLabel('good')).toBe('좋음');
    expect(getGradeLabel('moderate')).toBe('보통');
    expect(getGradeLabel('bad')).toBe('나쁨');
    expect(getGradeLabel('veryBad')).toBe('매우나쁨');
  });
});

describe('getGradeColor', () => {
  it('returns hex color for each grade', () => {
    expect(getGradeColor('good')).toBe('#3B82F6');
    expect(getGradeColor('moderate')).toBe('#22C55E');
    expect(getGradeColor('bad')).toBe('#EAB308');
    expect(getGradeColor('veryBad')).toBe('#DC2626');
  });
});

describe('getGradeBgClass', () => {
  it('returns correct CSS class for each grade', () => {
    expect(getGradeBgClass('good')).toBe('bg-grade-good text-white');
    expect(getGradeBgClass('moderate')).toBe('bg-grade-moderate text-white');
    expect(getGradeBgClass('bad')).toBe('bg-grade-bad text-gray-900');
    expect(getGradeBgClass('veryBad')).toBe('bg-grade-very-bad text-white');
  });
});

describe('getGradeBorderClass', () => {
  it('returns correct border class for each grade', () => {
    expect(getGradeBorderClass('good')).toBe('border-l-grade-good');
    expect(getGradeBorderClass('moderate')).toBe('border-l-grade-moderate');
    expect(getGradeBorderClass('bad')).toBe('border-l-grade-bad');
    expect(getGradeBorderClass('veryBad')).toBe('border-l-grade-very-bad');
  });
});

describe('getGradeEmoji', () => {
  it('returns string for each grade', () => {
    const grades: AirQualityGrade[] = ['good', 'moderate', 'bad', 'veryBad'];
    for (const grade of grades) {
      expect(typeof getGradeEmoji(grade)).toBe('string');
    }
  });
});

describe('groupByDate', () => {
  it('groups hourly data by date', () => {
    const hourly: AirQualityHourly[] = [
      { time: '2026-06-30T10:00', pm25: 10, pm10: 20 },
      { time: '2026-06-30T11:00', pm25: 12, pm10: 22 },
      { time: '2026-07-01T10:00', pm25: 15, pm10: 25 },
    ];
    const map = groupByDate(hourly);
    expect(map.size).toBe(2);
    expect(map.get('2026-06-30')).toHaveLength(2);
    expect(map.get('2026-07-01')).toHaveLength(1);
  });

  it('returns empty map for empty input', () => {
    const map = groupByDate([]);
    expect(map.size).toBe(0);
  });
});

describe('calculateDailyStats', () => {
  it('calculates daily averages and max values', () => {
    const map = new Map<string, AirQualityHourly[]>();
    map.set('2026-06-30', [
      { time: '2026-06-30T10:00', pm25: 10, pm10: 20 },
      { time: '2026-06-30T11:00', pm25: 20, pm10: 40 },
      { time: '2026-06-30T12:00', pm25: 30, pm10: 60 },
    ]);
    const stats = calculateDailyStats(map);
    expect(stats).toHaveLength(1);
    expect(stats[0].pm25Avg).toBe(20); // (10+20+30)/3
    expect(stats[0].pm25Max).toBe(30);
    expect(stats[0].pm10Avg).toBe(40); // (20+40+60)/3
    expect(stats[0].pm10Max).toBe(60);
  });

  it('skips days with only null values', () => {
    const map = new Map<string, AirQualityHourly[]>();
    map.set('2026-06-30', [
      { time: '2026-06-30T10:00', pm25: null, pm10: null },
    ]);
    const stats = calculateDailyStats(map);
    expect(stats).toHaveLength(0);
  });

  it('handles mixed null/number values', () => {
    const map = new Map<string, AirQualityHourly[]>();
    map.set('2026-06-30', [
      { time: '2026-06-30T10:00', pm25: 10, pm10: null },
      { time: '2026-06-30T11:00', pm25: null, pm10: 40 },
    ]);
    const stats = calculateDailyStats(map);
    expect(stats).toHaveLength(1);
    expect(stats[0].pm25Avg).toBe(10);
    expect(stats[0].pm10Avg).toBe(40);
  });

  it('sorts results by date descending', () => {
    const map = new Map<string, AirQualityHourly[]>();
    map.set('2026-06-28', [{ time: '2026-06-28T10:00', pm25: 10, pm10: 20 }]);
    map.set('2026-06-30', [{ time: '2026-06-30T10:00', pm25: 15, pm10: 25 }]);
    map.set('2026-06-29', [{ time: '2026-06-29T10:00', pm25: 12, pm10: 22 }]);
    const stats = calculateDailyStats(map);
    expect(stats[0].date).toBe('2026-06-30');
    expect(stats[2].date).toBe('2026-06-28');
  });

  it('assigns correct grades based on averages', () => {
    const map = new Map<string, AirQualityHourly[]>();
    map.set('2026-06-30', [
      { time: '2026-06-30T10:00', pm25: 50, pm10: 100 },
    ]);
    const stats = calculateDailyStats(map);
    expect(stats[0].pm25Grade).toBe('bad');
    expect(stats[0].pm10Grade).toBe('bad');
    expect(stats[0].overallGrade).toBe('bad');
  });
});

describe('formatDateKorean', () => {
  it('formats date in Korean style', () => {
    const result = formatDateKorean('2026-06-30');
    expect(result).toContain('6월');
    expect(result).toContain('30일');
  });

  it('returns input on invalid date', () => {
    expect(formatDateKorean('invalid')).toBe('invalid');
  });
});

describe('formatDateShort', () => {
  it('formats date in short style', () => {
    const result = formatDateShort('2026-06-30');
    expect(result).toContain('6/30');
  });

  it('returns input on invalid date', () => {
    expect(formatDateShort('bad-date')).toBe('bad-date');
  });
});

describe('formatHour', () => {
  it('formats time to HH:mm', () => {
    expect(formatHour('2026-06-30T14:30')).toBe('14:30');
  });

  it('returns input on invalid time', () => {
    expect(formatHour('invalid')).toBe('invalid');
  });
});

describe('formatFullDateTime', () => {
  it('formats full datetime in Korean', () => {
    const result = formatFullDateTime('2026-06-30T14:30');
    expect(result).toContain('2026년');
    expect(result).toContain('6월');
    expect(result).toContain('30일');
    expect(result).toContain('14:30');
    expect(result).toContain('기준');
  });

  it('returns input on invalid time', () => {
    expect(formatFullDateTime('invalid')).toBe('invalid');
  });
});

describe('calculateAccuracy', () => {
  function makeDailyHistory(count: number, basePm25 = 20, basePm10 = 40): DailyAirQuality[] {
    return Array.from({ length: count }, (_, i) => {
      const date = `2026-06-${String(i + 1).padStart(2, '0')}`;
      const pm25Avg = basePm25 + (i % 3) * 5;
      const pm10Avg = basePm10 + (i % 3) * 10;
      return {
        date,
        pm25Avg,
        pm25Max: pm25Avg + 10,
        pm10Avg,
        pm10Max: pm10Avg + 20,
        pm25Grade: getGrade(pm25Avg, 'pm25') as AirQualityGrade,
        pm10Grade: getGrade(pm10Avg, 'pm10') as AirQualityGrade,
        overallGrade: getOverallGrade(
          getGrade(pm25Avg, 'pm25') as AirQualityGrade,
          getGrade(pm10Avg, 'pm10') as AirQualityGrade,
        ),
      };
    });
  }

  it('returns null when history has fewer than 3 days', () => {
    const history = makeDailyHistory(2);
    expect(calculateAccuracy(history, [])).toBeNull();
  });

  it('returns accuracy info for sufficient history', () => {
    const history = makeDailyHistory(10);
    const result = calculateAccuracy(history, []);
    expect(result).not.toBeNull();
    expect(result!.pm25Accuracy).toBeGreaterThanOrEqual(0);
    expect(result!.pm25Accuracy).toBeLessThanOrEqual(100);
    expect(result!.pm10Accuracy).toBeGreaterThanOrEqual(0);
    expect(result!.pm10Accuracy).toBeLessThanOrEqual(100);
    expect(result!.overallAccuracy).toBeGreaterThanOrEqual(0);
    expect(result!.overallAccuracy).toBeLessThanOrEqual(100);
    expect(result!.sampleDays).toBe(10);
  });

  it('returns high accuracy for constant data', () => {
    const history = makeDailyHistory(10, 20, 40);
    // With constant values, WMA predictions should be very close
    const result = calculateAccuracy(history, []);
    expect(result).not.toBeNull();
    expect(result!.overallAccuracy).toBeGreaterThan(70);
  });

  it('returns correct gradeMatchRate', () => {
    const history = makeDailyHistory(7);
    const result = calculateAccuracy(history, []);
    expect(result).not.toBeNull();
    expect(result!.gradeMatchRate).toBeGreaterThanOrEqual(0);
    expect(result!.gradeMatchRate).toBeLessThanOrEqual(100);
  });
});

describe('getCityBySlug', () => {
  it('finds Seoul by slug', () => {
    const city = getCityBySlug('seoul');
    expect(city).toBeDefined();
    expect(city!.name).toBe('서울');
  });

  it('finds Busan by slug', () => {
    const city = getCityBySlug('busan');
    expect(city).toBeDefined();
    expect(city!.name).toBe('부산');
  });

  it('returns undefined for unknown slug', () => {
    expect(getCityBySlug('nonexistent')).toBeUndefined();
  });
});

describe('displayValue', () => {
  it('returns rounded string for number', () => {
    expect(displayValue(25.7)).toBe('26');
    expect(displayValue(0)).toBe('0');
    expect(displayValue(100.2)).toBe('100');
  });

  it('returns -- for null', () => {
    expect(displayValue(null)).toBe('--');
  });
});
