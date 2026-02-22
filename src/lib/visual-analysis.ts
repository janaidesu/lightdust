/**
 * CCTV Image Visual Analysis Module
 *
 * CCTV 스냅샷 이미지의 픽셀 데이터를 분석하여
 * 시야 흐림도(haziness)를 추정합니다.
 *
 * 분석 메트릭:
 * 1. Contrast: RMS 대비 (표준편차 / 평균 휘도)
 * 2. Edge Density: Sobel 에지 검출
 * 3. Color Shift: 블루-그레이 편향도
 * 4. Brightness Uniformity: 휘도 균일도
 * 5. Haziness: 가중 합성 점수
 */

import type { AirQualityGrade, VisualMetrics, VisualAnalysisResult, CCTVStation } from './types';

export interface AnalysisInput {
  pixels: Uint8Array;  // RGBA 픽셀 버퍼
  width: number;
  height: number;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 픽셀 데이터에서 5가지 시각 메트릭을 추출 */
export function analyzeImageMetrics(input: AnalysisInput): VisualMetrics {
  const { pixels, width, height } = input;
  const totalPixels = width * height;

  // 1. 휘도 계산 (BT.601 공식)
  const luminances = new Float32Array(totalPixels);
  let brightnessSum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const lum = 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2];
    luminances[i] = lum;
    brightnessSum += lum;
  }
  const brightness = brightnessSum / totalPixels;

  // 2. Contrast: RMS (표준편차 / 128)
  let varianceSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    varianceSum += (luminances[i] - brightness) ** 2;
  }
  const contrast = Math.min(1, Math.sqrt(varianceSum / totalPixels) / 128);

  // 3. Brightness Uniformity: 1 - contrast
  const brightnessUniformity = 1 - contrast;

  // 4. Color Shift: 블루 채널 우세도
  let blueShiftSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
    const rgAvg = (r + g) / 2;
    if (rgAvg > 10) {
      blueShiftSum += Math.max(0, (b - rgAvg)) / rgAvg;
    }
  }
  const colorShift = Math.min(1, blueShiftSum / totalPixels * 5);

  // 5. Edge Density: 간략 Sobel (성능을 위해 2픽셀 단위 샘플링)
  let edgeCount = 0;
  const step = 2;
  const threshold = 15;
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = y * width + x;
      const gx = Math.abs(luminances[idx + 1] - luminances[idx - 1]);
      const gy = Math.abs(luminances[idx + width] - luminances[idx - width]);
      if (gx + gy > threshold) edgeCount++;
    }
  }
  const sampledPixels = Math.ceil((height - 2) / step) * Math.ceil((width - 2) / step);
  const edgeDensity = Math.min(1, edgeCount / (sampledPixels || 1));

  // 6. 종합 흐림도: 가중 합성
  const haziness = Math.min(1, Math.max(0,
    (1 - contrast) * 0.30 +
    (1 - edgeDensity) * 0.30 +
    colorShift * 0.20 +
    brightnessUniformity * 0.20
  ));

  return {
    contrast: round2(contrast),
    edgeDensity: round2(edgeDensity),
    colorShift: round2(colorShift),
    brightness: Math.round(brightness),
    brightnessUniformity: round2(brightnessUniformity),
    haziness: round2(haziness),
  };
}

/** 흐림도 → 공기질 등급 매핑 */
export function hazeToVisibilityGrade(haziness: number): AirQualityGrade {
  if (haziness < 0.3) return 'good';
  if (haziness < 0.5) return 'moderate';
  if (haziness < 0.7) return 'bad';
  return 'veryBad';
}

/** 흐림도 → 추정 PM2.5 범위 */
export function hazeToEstimatedPm25(haziness: number): { min: number; max: number } {
  if (haziness < 0.3) return { min: 0, max: 15 };
  if (haziness < 0.5) return { min: 15, max: 35 };
  if (haziness < 0.7) return { min: 35, max: 75 };
  return { min: 75, max: 150 };
}

/** 이미지 신뢰도 계산 (야간, 과노출 등 감안) */
export function calculateConfidence(metrics: VisualMetrics): number {
  let confidence = 1.0;
  if (metrics.brightness < 40) confidence = 0.2;        // 야간
  else if (metrics.brightness < 70) confidence = 0.5;    // 새벽/저녁
  else if (metrics.brightness > 230) confidence = 0.3;   // 과노출
  if (metrics.edgeDensity < 0.05) confidence *= 0.5;     // 카메라 가림/고장
  return round2(confidence);
}

/**
 * Mock 분석 생성: 현재 PM2.5 기반으로 그럴듯한 CCTV 분석 결과를 만듦
 */
export function generateMockAnalysis(
  station: CCTVStation,
  currentPm25: number | null,
): VisualAnalysisResult {
  const basePm = currentPm25 ?? 25;
  const jitter = (Math.random() - 0.5) * 0.1;

  let mockHaziness: number;
  if (basePm < 15) mockHaziness = 0.15 + jitter;
  else if (basePm < 35) mockHaziness = 0.35 + jitter;
  else if (basePm < 75) mockHaziness = 0.55 + jitter;
  else mockHaziness = 0.75 + jitter;
  mockHaziness = Math.max(0, Math.min(1, mockHaziness));

  const imageMap = ['clear', 'moderate', 'hazy', 'very-hazy'];
  const imageIndex = mockHaziness < 0.3 ? 0 : mockHaziness < 0.5 ? 1 : mockHaziness < 0.7 ? 2 : 3;

  const metrics: VisualMetrics = {
    contrast: round2((1 - mockHaziness) * 0.8),
    edgeDensity: round2((1 - mockHaziness) * 0.6),
    colorShift: round2(mockHaziness * 0.5),
    brightness: Math.round(120 + mockHaziness * 60),
    brightnessUniformity: round2(mockHaziness * 0.7),
    haziness: round2(mockHaziness),
  };

  return {
    cctvId: station.id,
    cctvName: station.name,
    timestamp: new Date().toISOString(),
    snapshotUrl: `/mock-cctv/${imageMap[imageIndex]}.jpg`,
    metrics,
    visibilityGrade: hazeToVisibilityGrade(mockHaziness),
    estimatedPm25Range: hazeToEstimatedPm25(mockHaziness),
    confidence: 0.75,
  };
}
