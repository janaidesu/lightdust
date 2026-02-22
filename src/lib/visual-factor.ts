/**
 * Visual Correction Factor Module
 *
 * CCTV 이미지 분석 결과를 종합하여 예측 보정 계수를 산출합니다.
 * china-factor.ts, weather-factor.ts와 동일한 패턴을 따릅니다.
 *
 * 보정 범위: 0.9 ~ 1.15 (최대 ±10~15%)
 * → 시각 분석은 보조적 보정 수단으로, 기존 예측을 해치지 않음
 */

import type { VisualAnalysisResult, VisualFactorResult } from './types';

export function calculateVisualFactor(
  analyses: VisualAnalysisResult[]
): VisualFactorResult {
  // confidence 0.4 이상만 신뢰
  const reliable = analyses.filter(a => a.confidence >= 0.4);

  if (reliable.length === 0) {
    return {
      combinedFactor: 1.0,
      haziness: 0,
      cameraCount: 0,
      summary: 'CCTV 분석 데이터 없음',
      analyses,
    };
  }

  // 신뢰도 가중 평균 haziness
  let weightedHaze = 0;
  let totalWeight = 0;
  for (const a of reliable) {
    weightedHaze += a.metrics.haziness * a.confidence;
    totalWeight += a.confidence;
  }
  const avgHaziness = weightedHaze / totalWeight;

  // haziness → 보정 계수 변환
  // 0.0 → 0.85 (공기 맑음, 모델 예측보다 좋음)
  // 0.3 → 1.0  (모델 예측과 일치)
  // 0.5 → 1.1  (약간 흐림)
  // 0.7 → 1.25 (뚜렷한 흐림)
  // 1.0 → 1.4  (심한 흐림)
  let factor: number;
  if (avgHaziness < 0.3) {
    factor = 0.85 + (avgHaziness / 0.3) * 0.15;
  } else {
    factor = 1.0 + ((avgHaziness - 0.3) / 0.7) * 0.4;
  }

  // 영향력 감쇠 (0.3): 시각 분석은 보조적 역할
  const influence = 0.3;
  factor = 1.0 + (factor - 1.0) * influence;
  factor = Math.max(0.9, Math.min(1.15, factor));

  let summary: string;
  if (avgHaziness < 0.3) summary = 'CCTV 시야 양호 (맑은 대기)';
  else if (avgHaziness < 0.5) summary = 'CCTV 약간 흐림 감지';
  else if (avgHaziness < 0.7) summary = 'CCTV 뚜렷한 미세먼지 감지';
  else summary = 'CCTV 심한 미세먼지/안개 감지';

  return {
    combinedFactor: Math.round(factor * 100) / 100,
    haziness: Math.round(avgHaziness * 100) / 100,
    cameraCount: reliable.length,
    summary,
    analyses,
  };
}
