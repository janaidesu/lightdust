/**
 * CCTV Station Registry
 *
 * 서울시 주요 대기질 측정소 인근 도로 CCTV 카메라 목록.
 * 현재 mock 모드만 지원하며, API 키 설정 시 ITS/TOPIS 실시간 연동 가능.
 */

import type { CCTVStation } from './types';

const SEOUL_CCTV_STATIONS: CCTVStation[] = [
  {
    id: 'seoul-gangnam-01',
    name: '강남대로 (신논현역)',
    lat: 37.5045,
    lon: 127.025,
    streamUrl: '',
    source: 'mock',
    roadName: '강남대로',
  },
  {
    id: 'seoul-jongno-01',
    name: '종로 (광화문)',
    lat: 37.5717,
    lon: 126.9768,
    streamUrl: '',
    source: 'mock',
    roadName: '세종대로',
  },
  {
    id: 'seoul-yeongdeungpo-01',
    name: '영등포 (여의대로)',
    lat: 37.5219,
    lon: 126.9245,
    streamUrl: '',
    source: 'mock',
    roadName: '여의대로',
  },
  {
    id: 'seoul-songpa-01',
    name: '송파 (올림픽대로)',
    lat: 37.5145,
    lon: 127.1059,
    streamUrl: '',
    source: 'mock',
    roadName: '올림픽대로',
  },
  {
    id: 'seoul-mapo-01',
    name: '마포 (마포대로)',
    lat: 37.5397,
    lon: 126.9458,
    streamUrl: '',
    source: 'mock',
    roadName: '마포대로',
  },
  {
    id: 'seoul-nowon-01',
    name: '노원 (동일로)',
    lat: 37.6543,
    lon: 127.0568,
    streamUrl: '',
    source: 'mock',
    roadName: '동일로',
  },
];

/** 도시별 CCTV 목록 (확장 가능 구조) */
const CCTV_STATIONS: Record<string, CCTVStation[]> = {
  seoul: SEOUL_CCTV_STATIONS,
};

export function getCCTVStationsForCity(slug: string): CCTVStation[] {
  return CCTV_STATIONS[slug] ?? [];
}

export function hasCCTVSupport(slug: string): boolean {
  return (CCTV_STATIONS[slug]?.length ?? 0) > 0;
}
