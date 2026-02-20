import { City } from './types';

export const CITIES: City[] = [
  { name: '서울', slug: 'seoul', lat: 37.5665, lon: 126.978, region: '수도권' },
  { name: '부산', slug: 'busan', lat: 35.1796, lon: 129.0756, region: '영남권' },
  { name: '대구', slug: 'daegu', lat: 35.8714, lon: 128.6014, region: '영남권' },
  { name: '인천', slug: 'incheon', lat: 37.4563, lon: 126.7052, region: '수도권' },
  { name: '광주', slug: 'gwangju', lat: 35.1595, lon: 126.8526, region: '호남권' },
  { name: '대전', slug: 'daejeon', lat: 36.3504, lon: 127.3845, region: '충청권' },
  { name: '울산', slug: 'ulsan', lat: 35.5384, lon: 129.3114, region: '영남권' },
  { name: '세종', slug: 'sejong', lat: 36.48, lon: 127.289, region: '충청권' },
  { name: '수원', slug: 'suwon', lat: 37.2636, lon: 127.0286, region: '수도권' },
  { name: '제주', slug: 'jeju', lat: 33.4996, lon: 126.5312, region: '제주' },
];

export const PM25_THRESHOLDS = [
  { grade: 'good' as const, min: 0, max: 15, label: '좋음' as const, color: '#3B82F6' },
  { grade: 'moderate' as const, min: 16, max: 35, label: '보통' as const, color: '#22C55E' },
  { grade: 'bad' as const, min: 36, max: 75, label: '나쁨' as const, color: '#EAB308' },
  { grade: 'veryBad' as const, min: 76, max: Infinity, label: '매우나쁨' as const, color: '#DC2626' },
];

export const PM10_THRESHOLDS = [
  { grade: 'good' as const, min: 0, max: 30, label: '좋음' as const, color: '#3B82F6' },
  { grade: 'moderate' as const, min: 31, max: 80, label: '보통' as const, color: '#22C55E' },
  { grade: 'bad' as const, min: 81, max: 150, label: '나쁨' as const, color: '#EAB308' },
  { grade: 'veryBad' as const, min: 151, max: Infinity, label: '매우나쁨' as const, color: '#DC2626' },
];

export const GRADE_ORDER: Record<string, number> = {
  good: 0,
  moderate: 1,
  bad: 2,
  veryBad: 3,
};

export const REGIONS = ['전체', '수도권', '영남권', '호남권', '충청권', '제주'];
