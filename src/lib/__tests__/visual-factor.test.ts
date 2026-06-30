import { describe, it, expect } from 'vitest';
import type { VisualAnalysisResult, VisualMetrics } from '../types';
import { calculateVisualFactor } from '../visual-factor';

function makeAnalysis(overrides: Partial<VisualAnalysisResult> = {}): VisualAnalysisResult {
  const metrics: VisualMetrics = {
    contrast: 0.5,
    edgeDensity: 0.4,
    colorShift: 0.1,
    brightness: 120,
    brightnessUniformity: 0.5,
    haziness: 0.3,
  };
  return {
    cctvId: 'test-01',
    cctvName: 'Test Camera',
    timestamp: '2026-06-30T12:00:00Z',
    snapshotUrl: '/test.jpg',
    metrics: overrides.metrics ?? metrics,
    visibilityGrade: overrides.visibilityGrade ?? 'moderate',
    estimatedPm25Range: overrides.estimatedPm25Range ?? { min: 15, max: 35 },
    confidence: overrides.confidence ?? 0.8,
    ...overrides,
  };
}

describe('calculateVisualFactor', () => {
  it('returns factor 1.0 and empty data message when no analyses provided', () => {
    const result = calculateVisualFactor([]);
    expect(result.combinedFactor).toBe(1.0);
    expect(result.cameraCount).toBe(0);
    expect(result.summary).toBe('CCTV 분석 데이터 없음');
  });

  it('filters out low-confidence analyses (< 0.4)', () => {
    const lowConfidence = makeAnalysis({ confidence: 0.3 });
    const result = calculateVisualFactor([lowConfidence]);
    expect(result.combinedFactor).toBe(1.0);
    expect(result.cameraCount).toBe(0);
  });

  it('calculates weighted average haziness for reliable cameras', () => {
    const a1 = makeAnalysis({
      confidence: 0.8,
      metrics: { contrast: 0.5, edgeDensity: 0.4, colorShift: 0.1, brightness: 120, brightnessUniformity: 0.5, haziness: 0.2 },
    });
    const a2 = makeAnalysis({
      confidence: 0.6,
      metrics: { contrast: 0.3, edgeDensity: 0.2, colorShift: 0.3, brightness: 150, brightnessUniformity: 0.7, haziness: 0.6 },
    });
    const result = calculateVisualFactor([a1, a2]);
    // weighted avg = (0.2*0.8 + 0.6*0.6) / (0.8+0.6) = (0.16+0.36)/1.4 ≈ 0.371
    expect(result.haziness).toBeCloseTo(0.37, 1);
    expect(result.cameraCount).toBe(2);
  });

  it('returns factor in range [0.9, 1.15]', () => {
    // Clear air
    const clearAnalysis = makeAnalysis({
      confidence: 0.9,
      metrics: { contrast: 0.8, edgeDensity: 0.7, colorShift: 0.0, brightness: 130, brightnessUniformity: 0.2, haziness: 0.05 },
    });
    const clearResult = calculateVisualFactor([clearAnalysis]);
    expect(clearResult.combinedFactor).toBeGreaterThanOrEqual(0.9);

    // Hazy air
    const hazyAnalysis = makeAnalysis({
      confidence: 0.9,
      metrics: { contrast: 0.2, edgeDensity: 0.1, colorShift: 0.5, brightness: 180, brightnessUniformity: 0.8, haziness: 0.9 },
    });
    const hazyResult = calculateVisualFactor([hazyAnalysis]);
    expect(hazyResult.combinedFactor).toBeLessThanOrEqual(1.15);
  });

  it('returns clear summary for low haziness', () => {
    const a = makeAnalysis({
      confidence: 0.8,
      metrics: { contrast: 0.8, edgeDensity: 0.7, colorShift: 0.0, brightness: 130, brightnessUniformity: 0.2, haziness: 0.1 },
    });
    const result = calculateVisualFactor([a]);
    expect(result.summary).toContain('시야 양호');
  });

  it('returns hazy summary for high haziness', () => {
    const a = makeAnalysis({
      confidence: 0.8,
      metrics: { contrast: 0.2, edgeDensity: 0.1, colorShift: 0.5, brightness: 180, brightnessUniformity: 0.8, haziness: 0.75 },
    });
    const result = calculateVisualFactor([a]);
    expect(result.summary).toContain('심한');
  });

  it('returns moderate haze summary for mid-range haziness', () => {
    const a = makeAnalysis({
      confidence: 0.8,
      metrics: { contrast: 0.4, edgeDensity: 0.3, colorShift: 0.2, brightness: 140, brightnessUniformity: 0.6, haziness: 0.4 },
    });
    const result = calculateVisualFactor([a]);
    expect(result.summary).toContain('약간 흐림');
  });

  it('includes all analyses in result even when filtered', () => {
    const reliable = makeAnalysis({ confidence: 0.8 });
    const unreliable = makeAnalysis({ confidence: 0.2, cctvId: 'low' });
    const result = calculateVisualFactor([reliable, unreliable]);
    expect(result.analyses).toHaveLength(2);
    expect(result.cameraCount).toBe(1);
  });
});
