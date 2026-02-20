/**
 * China Industrial Activity Factor Module
 *
 * 중국 산업 활동이 한국 미세먼지에 미치는 영향을 보정 계수로 반영합니다.
 *
 * 보정 요인:
 * 1. 요일 패턴: 중국 공장 주중 가동 → 1~2일 후 한국 영향
 * 2. 중국 명절: 춘절, 국경절 등 장기 연휴 → 공장 가동 중단
 * 3. 계절 패턴: 겨울철 난방 석탄 사용 증가
 * 4. 풍향+풍속: 서풍/북서풍 + 풍속에 따른 이송 효과
 */

// --- 1. 요일 기반 공장 가동 패턴 ---

const WEEKDAY_FACTORY_RATE: Record<number, number> = {
  0: 0.4,  // 일요일: 최소 가동
  1: 1.0,  // 월요일: 풀가동
  2: 1.0,  // 화요일
  3: 1.0,  // 수요일
  4: 1.0,  // 목요일
  5: 0.9,  // 금요일: 약간 감소
  6: 0.6,  // 토요일: 감소
};

export function getWeekdayFactor(targetDate: Date): number {
  const todayDow = targetDate.getDay();
  const yesterdayDow = todayDow === 0 ? 6 : todayDow - 1;
  const todayRate = WEEKDAY_FACTORY_RATE[todayDow];
  const yesterdayRate = WEEKDAY_FACTORY_RATE[yesterdayDow];
  return yesterdayRate * 0.6 + todayRate * 0.4;
}

// --- 2. 중국 명절 패턴 (연도별 정확한 양력 날짜) ---

interface HolidayEntry {
  name: string;
  start: string;  // MM-DD
  end: string;     // MM-DD
  factoryRate: number;
}

// 연도별 춘절 (음력 1/1) 양력 날짜 + 전후 7일 연휴
const SPRING_FESTIVAL: Record<number, { start: string; end: string }> = {
  2024: { start: '02-03', end: '02-17' },
  2025: { start: '01-22', end: '02-05' },
  2026: { start: '02-10', end: '02-24' },
  2027: { start: '01-30', end: '02-13' },
  2028: { start: '01-19', end: '02-02' },
  2029: { start: '02-06', end: '02-20' },
  2030: { start: '01-26', end: '02-09' },
};

// 연도별 단오절 (음력 5/5) 양력 날짜
const DRAGON_BOAT: Record<number, { start: string; end: string }> = {
  2024: { start: '06-08', end: '06-10' },
  2025: { start: '05-29', end: '05-31' },
  2026: { start: '06-17', end: '06-19' },
  2027: { start: '06-06', end: '06-08' },
  2028: { start: '05-26', end: '05-28' },
  2029: { start: '06-13', end: '06-15' },
  2030: { start: '06-03', end: '06-05' },
};

// 연도별 중추절 (음력 8/15) 양력 날짜
const MID_AUTUMN: Record<number, { start: string; end: string }> = {
  2024: { start: '09-15', end: '09-17' },
  2025: { start: '10-04', end: '10-06' },
  2026: { start: '09-23', end: '09-25' },
  2027: { start: '09-12', end: '09-14' },
  2028: { start: '10-01', end: '10-03' },
  2029: { start: '09-21', end: '09-23' },
  2030: { start: '09-11', end: '09-13' },
};

function getYearlyHolidays(year: number): HolidayEntry[] {
  const holidays: HolidayEntry[] = [];

  // 춘절 (연도별 정확 날짜)
  const spring = SPRING_FESTIVAL[year];
  if (spring) {
    holidays.push({ name: '춘절', start: spring.start, end: spring.end, factoryRate: 0.2 });
  }

  // 국경절 (고정: 10/1~10/7)
  holidays.push({ name: '국경절', start: '10-01', end: '10-07', factoryRate: 0.3 });

  // 노동절 (고정: 5/1~5/5)
  holidays.push({ name: '노동절', start: '05-01', end: '05-05', factoryRate: 0.5 });

  // 청명절 (고정: 4/4~4/6)
  holidays.push({ name: '청명절', start: '04-04', end: '04-06', factoryRate: 0.6 });

  // 단오절 (연도별)
  const dragon = DRAGON_BOAT[year];
  if (dragon) {
    holidays.push({ name: '단오절', start: dragon.start, end: dragon.end, factoryRate: 0.6 });
  }

  // 중추절 (연도별)
  const midAutumn = MID_AUTUMN[year];
  if (midAutumn) {
    holidays.push({ name: '중추절', start: midAutumn.start, end: midAutumn.end, factoryRate: 0.5 });
  }

  return holidays;
}

export function getHolidayFactor(date: Date): { factor: number; holidayName: string | null } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const mmdd = `${month}-${day}`;

  const holidays = getYearlyHolidays(year);

  for (const h of holidays) {
    if (mmdd >= h.start && mmdd <= h.end) {
      return { factor: h.factoryRate, holidayName: h.name };
    }
  }

  return { factor: 1.0, holidayName: null };
}

// --- 3. 계절 패턴 ---

const SEASONAL_FACTOR: Record<number, number> = {
  1: 1.3,   // 1월: 한겨울, 석탄 난방 최대
  2: 1.25,  // 2월: 겨울
  3: 1.15,  // 3월: 황사 + 겨울 잔여
  4: 1.0,   // 4월: 봄
  5: 0.85,  // 5월: 봄~여름
  6: 0.75,  // 6월: 여름 시작
  7: 0.7,   // 7월: 한여름
  8: 0.7,   // 8월: 한여름
  9: 0.8,   // 9월: 가을 시작
  10: 0.95, // 10월: 가을
  11: 1.1,  // 11월: 난방 시작
  12: 1.25, // 12월: 겨울
};

export function getSeasonalFactor(date: Date): number {
  return SEASONAL_FACTOR[date.getMonth() + 1] ?? 1.0;
}

// --- 4. 풍향+풍속 기반 보정 ---

export function getWindFactor(
  windDirection: number | null,
  windSpeed: number | null
): { factor: number; description: string } {
  if (windDirection === null) {
    return { factor: 1.0, description: '풍향 데이터 없음' };
  }

  const dir = ((windDirection % 360) + 360) % 360;
  const speed = windSpeed ?? 3; // 기본값 3 m/s

  // 풍향 기본 계수
  let dirFactor: number;
  let dirDesc: string;

  if (dir >= 240 && dir <= 300) {
    dirFactor = 1.3;
    dirDesc = '서풍 (중국발 영향 높음)';
  } else if ((dir > 300 && dir <= 340) || (dir >= 210 && dir < 240)) {
    dirFactor = 1.15;
    dirDesc = dir > 300 ? '북서풍 (중국발 영향 보통)' : '남서풍 (중국발 영향 보통)';
  } else if (dir > 340 || dir < 30) {
    dirFactor = 1.05;
    dirDesc = '북풍 (중국발 영향 낮음)';
  } else {
    dirFactor = 0.85;
    dirDesc = dir >= 30 && dir < 150 ? '동풍 (해양성 공기)' : '남풍 (해양성 공기)';
  }

  // 풍속에 따른 보정
  let speedMultiplier: number;

  if (dirFactor > 1.1) {
    // 서풍/북서풍일 때: 풍속이 중간(3-7 m/s)이면 이송 최적
    if (speed >= 3 && speed <= 7) {
      speedMultiplier = 1.15; // 이송 최적 조건
    } else if (speed < 2) {
      speedMultiplier = 0.9;  // 약풍: 이송 느림 (하지만 정체로 현지 오염 축적)
    } else if (speed > 10) {
      speedMultiplier = 0.7;  // 강풍: 분산 효과 우세
    } else {
      speedMultiplier = 1.0;
    }
  } else {
    // 동풍/남풍일 때: 풍속이 강할수록 분산 효과 큼
    if (speed < 2) {
      speedMultiplier = 1.2; // 약풍: 정체 → 현지 오염 축적
    } else if (speed > 7) {
      speedMultiplier = 0.8; // 강풍: 분산
    } else {
      speedMultiplier = 1.0;
    }
  }

  const factor = Math.round(dirFactor * speedMultiplier * 100) / 100;

  // 풍속 정보를 설명에 추가
  let speedDesc = '';
  if (speed < 2) speedDesc = ', 약풍';
  else if (speed > 7) speedDesc = ', 강풍';

  return { factor, description: dirDesc + speedDesc };
}

// --- 종합 보정 계수 ---

export interface ChinaFactorResult {
  combinedFactor: number;
  weekdayRate: number;
  seasonalFactor: number;
  windFactor: number;
  windDescription: string;
  holidayName: string | null;
  holidayFactor: number;
  summary: string;
}

export function calculateChinaFactor(
  targetDate: Date,
  windDirection: number | null,
  windSpeed: number | null = null
): ChinaFactorResult {
  const weekdayRate = getWeekdayFactor(targetDate);
  const seasonal = getSeasonalFactor(targetDate);
  const { factor: holiday, holidayName } = getHolidayFactor(targetDate);
  const { factor: wind, description: windDesc } = getWindFactor(windDirection, windSpeed);

  const weekdayComponent = 0.85 + weekdayRate * 0.15;
  const combined = seasonal * wind * holiday * weekdayComponent;

  const factors: string[] = [];
  if (seasonal > 1.1) factors.push('겨울철 난방 영향');
  else if (seasonal < 0.8) factors.push('여름철 청정 기류');
  if (wind > 1.1) factors.push(windDesc);
  else if (wind < 0.9) factors.push(windDesc);
  if (holidayName) factors.push(`${holidayName} 연휴 (공장 감소)`);
  if (weekdayRate < 0.5) factors.push('주말 공장 가동 감소');

  const summary = factors.length > 0
    ? factors.join(', ')
    : '특별한 보정 요인 없음';

  return {
    combinedFactor: Math.round(combined * 100) / 100,
    weekdayRate: Math.round(weekdayRate * 100) / 100,
    seasonalFactor: seasonal,
    windFactor: wind,
    windDescription: windDesc,
    holidayName,
    holidayFactor: holiday,
    summary,
  };
}
