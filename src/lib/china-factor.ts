/**
 * China Industrial Activity Factor Module
 *
 * 중국 산업 활동이 한국 미세먼지에 미치는 영향을 보정 계수로 반영합니다.
 *
 * 보정 요인:
 * 1. 요일 패턴: 중국 공장 주중 가동 → 1~2일 후 한국 영향
 * 2. 중국 명절: 춘절, 국경절 등 장기 연휴 → 공장 가동 중단
 * 3. 계절 패턴: 겨울철 난방 석탄 사용 증가
 * 4. 풍향: 서풍/북서풍일 때 중국발 영향 극대화
 */

// --- 1. 요일 기반 공장 가동 패턴 ---
// 중국 공장은 주중 풀가동, 토요일 감소, 일요일 최소
// 한국에는 1~2일 후 영향 → 내일 예측 시 오늘~어제의 중국 가동률 반영
// 0=일, 1=월, ..., 6=토

/** 중국 공장 가동률 (0~1), 요일별 */
const WEEKDAY_FACTORY_RATE: Record<number, number> = {
  0: 0.4,  // 일요일: 최소 가동
  1: 1.0,  // 월요일: 풀가동
  2: 1.0,  // 화요일
  3: 1.0,  // 수요일
  4: 1.0,  // 목요일
  5: 0.9,  // 금요일: 약간 감소
  6: 0.6,  // 토요일: 감소
};

/**
 * 내일의 미세먼지에 영향을 주는 중국 가동률 계산
 * (오늘과 어제의 가동률 가중 평균, 이송 시간 1~2일 반영)
 */
export function getWeekdayFactor(targetDate: Date): number {
  // 내일에 도착하는 오염물질은 오늘~어제 배출분
  const todayDow = targetDate.getDay();
  // 어제 요일
  const yesterdayDow = todayDow === 0 ? 6 : todayDow - 1;

  const todayRate = WEEKDAY_FACTORY_RATE[todayDow];
  const yesterdayRate = WEEKDAY_FACTORY_RATE[yesterdayDow];

  // 어제 배출 60%, 오늘 배출 40% (이송 시간 가중)
  return yesterdayRate * 0.6 + todayRate * 0.4;
}

// --- 2. 중국 명절 패턴 ---
// 주요 명절 기간에는 공장 가동률 대폭 감소

interface HolidayPeriod {
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  factoryRate: number; // 가동률 (0~1)
}

// 음력 명절은 매년 날짜가 변하므로, 대략적 양력 기간으로 설정
const CHINA_HOLIDAYS: HolidayPeriod[] = [
  // 춘절 (음력 1/1, 보통 1월 말~2월 중순, 약 2주)
  { name: '춘절', startMonth: 1, startDay: 20, endMonth: 2, endDay: 10, factoryRate: 0.2 },
  // 국경절 황금주간 (10/1~10/7)
  { name: '국경절', startMonth: 10, startDay: 1, endMonth: 10, endDay: 7, factoryRate: 0.3 },
  // 노동절 (5/1~5/5)
  { name: '노동절', startMonth: 5, startDay: 1, endMonth: 5, endDay: 5, factoryRate: 0.5 },
  // 청명절 (4/4~4/6)
  { name: '청명절', startMonth: 4, startDay: 4, endMonth: 4, endDay: 6, factoryRate: 0.6 },
  // 단오절 (음력 5/5, 대략 6월 중순)
  { name: '단오절', startMonth: 6, startDay: 8, endMonth: 6, endDay: 10, factoryRate: 0.6 },
  // 중추절 (음력 8/15, 대략 9월 중순)
  { name: '중추절', startMonth: 9, startDay: 15, endMonth: 9, endDay: 17, factoryRate: 0.5 },
];

export function getHolidayFactor(date: Date): { factor: number; holidayName: string | null } {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const h of CHINA_HOLIDAYS) {
    const afterStart = month > h.startMonth || (month === h.startMonth && day >= h.startDay);
    const beforeEnd = month < h.endMonth || (month === h.endMonth && day <= h.endDay);

    if (afterStart && beforeEnd) {
      return { factor: h.factoryRate, holidayName: h.name };
    }
  }

  return { factor: 1.0, holidayName: null };
}

// --- 3. 계절 패턴 ---
// 겨울: 난방 석탄 사용 → 배출 증가
// 여름: 상대적으로 깨끗

const SEASONAL_FACTOR: Record<number, number> = {
  1: 1.3,   // 1월: 한겨울, 석탄 난방 최대
  2: 1.25,  // 2월: 겨울 (춘절은 별도 계산)
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

// --- 4. 풍향 기반 보정 ---
// 풍향에 따른 중국발 미세먼지 영향도
// 풍향은 "바람이 불어오는 방향" (270도 = 서풍 = 서쪽에서 불어옴)

/**
 * 풍향(도)에 따른 중국 영향 계수
 * 서풍(240~300도): 중국 직접 영향 → 높은 계수
 * 북서풍(300~340도): 중국 동북부 영향 → 중간 계수
 * 동풍/남풍: 중국 영향 적음 → 낮은 계수
 */
export function getWindFactor(windDirection: number | null): { factor: number; description: string } {
  if (windDirection === null) {
    return { factor: 1.0, description: '풍향 데이터 없음' };
  }

  // 정규화 (0~360)
  const dir = ((windDirection % 360) + 360) % 360;

  if (dir >= 240 && dir <= 300) {
    // 서풍: 중국 직접 영향 최대
    return { factor: 1.3, description: '서풍 (중국발 영향 높음)' };
  } else if ((dir > 300 && dir <= 340) || (dir >= 210 && dir < 240)) {
    // 북서풍 / 남서풍: 중간 영향
    return { factor: 1.15, description: dir > 300 ? '북서풍 (중국발 영향 보통)' : '남서풍 (중국발 영향 보통)' };
  } else if (dir > 340 || dir < 30) {
    // 북풍: 약간 영향 (시베리아/몽골 경유)
    return { factor: 1.05, description: '북풍 (중국발 영향 낮음)' };
  } else {
    // 동풍/남풍: 해양성, 중국 영향 미미
    return { factor: 0.85, description: dir >= 30 && dir < 150 ? '동풍 (해양성 공기)' : '남풍 (해양성 공기)' };
  }
}

// --- 종합 보정 계수 ---

export interface ChinaFactorResult {
  /** 최종 보정 계수 (1.0 = 보정 없음, >1 = 악화, <1 = 개선) */
  combinedFactor: number;
  /** 요일 가동률 (0~1) */
  weekdayRate: number;
  /** 계절 계수 */
  seasonalFactor: number;
  /** 풍향 계수 + 설명 */
  windFactor: number;
  windDescription: string;
  /** 명절 여부 */
  holidayName: string | null;
  holidayFactor: number;
  /** 보정 적용 여부 설명 */
  summary: string;
}

/**
 * 내일 예측에 적용할 종합 중국 보정 계수를 계산합니다.
 * @param targetDate 예측 대상 날짜 (내일)
 * @param windDirection 풍향 (도, null이면 풍향 보정 제외)
 */
export function calculateChinaFactor(
  targetDate: Date,
  windDirection: number | null
): ChinaFactorResult {
  const weekdayRate = getWeekdayFactor(targetDate);
  const seasonal = getSeasonalFactor(targetDate);
  const { factor: holiday, holidayName } = getHolidayFactor(targetDate);
  const { factor: wind, description: windDesc } = getWindFactor(windDirection);

  // 종합 계수 계산:
  // - 기본 = 1.0
  // - 공장 가동률 영향: (weekdayRate - 0.7) * 0.3 → 가동률 높으면 +, 낮으면 -
  // - 명절: holiday가 1 미만이면 개선
  // - 계절: seasonal 그대로
  // - 풍향: wind 그대로
  //
  // 최종 = seasonal * wind * holiday * (0.85 + weekdayRate * 0.15)
  // weekdayRate가 1.0이면 1.0, 0.4면 0.91로 약간 감소

  const weekdayComponent = 0.85 + weekdayRate * 0.15;
  const combined = seasonal * wind * holiday * weekdayComponent;

  // 요약 생성
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
