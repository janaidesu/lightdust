import { describe, it, expect } from 'vitest';
import { getCCTVStationsForCity, hasCCTVSupport } from '../cctv-stations';

describe('getCCTVStationsForCity', () => {
  it('returns Seoul CCTV stations', () => {
    const stations = getCCTVStationsForCity('seoul');
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0]).toHaveProperty('id');
    expect(stations[0]).toHaveProperty('name');
    expect(stations[0]).toHaveProperty('lat');
    expect(stations[0]).toHaveProperty('lon');
    expect(stations[0]).toHaveProperty('source');
  });

  it('returns empty array for cities without CCTV support', () => {
    expect(getCCTVStationsForCity('busan')).toEqual([]);
    expect(getCCTVStationsForCity('nonexistent')).toEqual([]);
  });

  it('all Seoul stations have mock source', () => {
    const stations = getCCTVStationsForCity('seoul');
    for (const station of stations) {
      expect(station.source).toBe('mock');
    }
  });

  it('returns 6 Seoul stations', () => {
    const stations = getCCTVStationsForCity('seoul');
    expect(stations).toHaveLength(6);
  });
});

describe('hasCCTVSupport', () => {
  it('returns true for Seoul', () => {
    expect(hasCCTVSupport('seoul')).toBe(true);
  });

  it('returns false for cities without CCTV', () => {
    expect(hasCCTVSupport('busan')).toBe(false);
    expect(hasCCTVSupport('daegu')).toBe(false);
    expect(hasCCTVSupport('nonexistent')).toBe(false);
  });
});
