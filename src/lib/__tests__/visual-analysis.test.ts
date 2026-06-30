import { describe, it, expect } from 'vitest';
import {
  analyzeImageMetrics,
  hazeToVisibilityGrade,
  hazeToEstimatedPm25,
  calculateConfidence,
} from '../visual-analysis';
import type { AnalysisInput } from '../visual-analysis';
import type { VisualMetrics } from '../types';

function makeUniformImage(r: number, g: number, b: number, width = 10, height = 10): AnalysisInput {
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = 255;
  }
  return { pixels, width, height };
}

describe('analyzeImageMetrics', () => {
  it('returns low contrast and high uniformity for a uniform image', () => {
    const input = makeUniformImage(128, 128, 128);
    const metrics = analyzeImageMetrics(input);
    expect(metrics.contrast).toBe(0);
    expect(metrics.brightnessUniformity).toBe(1);
    expect(metrics.brightness).toBeCloseTo(128, 0);
  });

  it('detects blue color shift when blue channel is dominant', () => {
    const input = makeUniformImage(50, 50, 150);
    const metrics = analyzeImageMetrics(input);
    expect(metrics.colorShift).toBeGreaterThan(0);
  });

  it('has zero color shift when no blue dominance', () => {
    const input = makeUniformImage(150, 150, 50);
    const metrics = analyzeImageMetrics(input);
    expect(metrics.colorShift).toBe(0);
  });

  it('returns zero edge density for a uniform image', () => {
    const input = makeUniformImage(100, 100, 100, 20, 20);
    const metrics = analyzeImageMetrics(input);
    expect(metrics.edgeDensity).toBe(0);
  });

  it('returns high haziness for a uniform, low-contrast image', () => {
    const input = makeUniformImage(180, 180, 200, 20, 20);
    const metrics = analyzeImageMetrics(input);
    // Uniform → contrast≈0, edgeDensity≈0 → haziness should be high
    expect(metrics.haziness).toBeGreaterThan(0.5);
  });

  it('returns all metric keys', () => {
    const input = makeUniformImage(100, 100, 100);
    const metrics = analyzeImageMetrics(input);
    expect(metrics).toHaveProperty('contrast');
    expect(metrics).toHaveProperty('edgeDensity');
    expect(metrics).toHaveProperty('colorShift');
    expect(metrics).toHaveProperty('brightness');
    expect(metrics).toHaveProperty('brightnessUniformity');
    expect(metrics).toHaveProperty('haziness');
  });

  it('detects edges in a high-contrast image', () => {
    const width = 20;
    const height = 20;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Wide vertical stripes (4px): left half black, right half white
        const val = x < 10 ? 0 : 255;
        pixels[idx] = val;
        pixels[idx + 1] = val;
        pixels[idx + 2] = val;
        pixels[idx + 3] = 255;
      }
    }
    const metrics = analyzeImageMetrics({ pixels, width, height });
    expect(metrics.contrast).toBeGreaterThan(0.5);
    expect(metrics.edgeDensity).toBeGreaterThan(0);
  });
});

describe('hazeToVisibilityGrade', () => {
  it('returns good for low haziness', () => {
    expect(hazeToVisibilityGrade(0.1)).toBe('good');
    expect(hazeToVisibilityGrade(0.29)).toBe('good');
  });

  it('returns moderate for medium haziness', () => {
    expect(hazeToVisibilityGrade(0.3)).toBe('moderate');
    expect(hazeToVisibilityGrade(0.49)).toBe('moderate');
  });

  it('returns bad for high haziness', () => {
    expect(hazeToVisibilityGrade(0.5)).toBe('bad');
    expect(hazeToVisibilityGrade(0.69)).toBe('bad');
  });

  it('returns veryBad for very high haziness', () => {
    expect(hazeToVisibilityGrade(0.7)).toBe('veryBad');
    expect(hazeToVisibilityGrade(1.0)).toBe('veryBad');
  });
});

describe('hazeToEstimatedPm25', () => {
  it('maps haziness ranges to PM2.5 ranges', () => {
    expect(hazeToEstimatedPm25(0.1)).toEqual({ min: 0, max: 15 });
    expect(hazeToEstimatedPm25(0.4)).toEqual({ min: 15, max: 35 });
    expect(hazeToEstimatedPm25(0.6)).toEqual({ min: 35, max: 75 });
    expect(hazeToEstimatedPm25(0.8)).toEqual({ min: 75, max: 150 });
  });

  it('handles boundary values', () => {
    expect(hazeToEstimatedPm25(0.0)).toEqual({ min: 0, max: 15 });
    expect(hazeToEstimatedPm25(0.3)).toEqual({ min: 15, max: 35 });
    expect(hazeToEstimatedPm25(0.5)).toEqual({ min: 35, max: 75 });
    expect(hazeToEstimatedPm25(0.7)).toEqual({ min: 75, max: 150 });
  });
});

describe('calculateConfidence', () => {
  it('returns 0.2 for very dark images (nighttime)', () => {
    const metrics: VisualMetrics = {
      contrast: 0.3, edgeDensity: 0.2, colorShift: 0.1,
      brightness: 30, brightnessUniformity: 0.7, haziness: 0.5,
    };
    expect(calculateConfidence(metrics)).toBe(0.2);
  });

  it('returns 0.5 for dim images (dawn/dusk)', () => {
    const metrics: VisualMetrics = {
      contrast: 0.4, edgeDensity: 0.3, colorShift: 0.1,
      brightness: 60, brightnessUniformity: 0.6, haziness: 0.4,
    };
    expect(calculateConfidence(metrics)).toBe(0.5);
  });

  it('returns 0.3 for overexposed images', () => {
    const metrics: VisualMetrics = {
      contrast: 0.2, edgeDensity: 0.3, colorShift: 0.1,
      brightness: 240, brightnessUniformity: 0.8, haziness: 0.4,
    };
    expect(calculateConfidence(metrics)).toBe(0.3);
  });

  it('returns 1.0 for normal daytime conditions', () => {
    const metrics: VisualMetrics = {
      contrast: 0.5, edgeDensity: 0.4, colorShift: 0.1,
      brightness: 120, brightnessUniformity: 0.5, haziness: 0.3,
    };
    expect(calculateConfidence(metrics)).toBe(1.0);
  });

  it('halves confidence for very low edge density (camera obstruction)', () => {
    const metrics: VisualMetrics = {
      contrast: 0.5, edgeDensity: 0.03, colorShift: 0.1,
      brightness: 120, brightnessUniformity: 0.5, haziness: 0.3,
    };
    expect(calculateConfidence(metrics)).toBe(0.5);
  });

  it('compounds nighttime + low edge penalties', () => {
    const metrics: VisualMetrics = {
      contrast: 0.1, edgeDensity: 0.02, colorShift: 0.1,
      brightness: 20, brightnessUniformity: 0.9, haziness: 0.8,
    };
    expect(calculateConfidence(metrics)).toBe(0.1);
  });
});
