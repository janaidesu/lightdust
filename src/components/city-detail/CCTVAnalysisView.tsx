'use client';

import { useState } from 'react';
import { VisualFactorResult, VisualAnalysisResult } from '@/lib/types';
import GradeBadge from '@/components/ui/GradeBadge';
import HazinessMeter from './HazinessMeter';

interface CCTVAnalysisViewProps {
  slug: string;
  visualAnalysis: VisualFactorResult | null;
}

function CameraCard({
  analysis,
  isSelected,
  onClick,
}: {
  analysis: VisualAnalysisResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white rounded-xl border p-4 transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium">{analysis.cctvName}</h4>
          <span className="text-xs text-gray-400">
            신뢰도 {Math.round(analysis.confidence * 100)}%
          </span>
        </div>
        <GradeBadge grade={analysis.visibilityGrade} size="sm" />
      </div>
      <HazinessMeter value={analysis.metrics.haziness} showLabel={false} />
      <div className="mt-2 text-xs text-gray-500">
        추정 PM2.5: {analysis.estimatedPm25Range.min}~{analysis.estimatedPm25Range.max} ug/m3
      </div>
    </button>
  );
}

function MetricItem({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <span className="text-gray-500 text-xs block mb-1">{label}</span>
      <span className="font-medium text-sm">
        {value}{unit && <span className="text-xs text-gray-400 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

export default function CCTVAnalysisView({ slug, visualAnalysis }: CCTVAnalysisViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!visualAnalysis || visualAnalysis.analyses.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        CCTV 분석 데이터가 없습니다.
      </div>
    );
  }

  const { analyses } = visualAnalysis;
  const selected = analyses[selectedIdx];

  return (
    <div className="space-y-4">
      {/* 종합 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">CCTV 시각 분석 종합</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(visualAnalysis.haziness * 100)}%</div>
            <div className="text-xs text-gray-500">평균 흐림도</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{visualAnalysis.cameraCount}</div>
            <div className="text-xs text-gray-500">분석 카메라</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              visualAnalysis.combinedFactor > 1.05 ? 'text-red-500' :
              visualAnalysis.combinedFactor < 0.95 ? 'text-blue-500' : 'text-gray-700'
            }`}>
              {visualAnalysis.combinedFactor > 1 ? '+' : ''}{Math.round((visualAnalysis.combinedFactor - 1) * 100)}%
            </div>
            <div className="text-xs text-gray-500">보정 계수</div>
          </div>
        </div>
        <div className="mb-3">
          <HazinessMeter value={visualAnalysis.haziness} />
        </div>
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          {visualAnalysis.summary}
        </p>
      </div>

      {/* 선택된 카메라 상세 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">
          카메라 상세 - {selected.cctvName}
        </h3>

        {/* 스냅샷 이미지 */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4 aspect-video flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.snapshotUrl.replace('.jpg', '.svg')}
            alt={`${selected.cctvName} CCTV`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
              MOCK
            </span>
            <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded">
              {selected.cctvName}
            </span>
          </div>
          <div className="absolute bottom-3 right-3">
            <GradeBadge grade={selected.visibilityGrade} size="sm" />
          </div>
        </div>

        {/* 분석 메트릭 그리드 */}
        <div className="grid grid-cols-3 gap-3">
          <MetricItem label="대비도" value={selected.metrics.contrast} />
          <MetricItem label="에지 밀도" value={selected.metrics.edgeDensity} />
          <MetricItem label="색상 편이" value={selected.metrics.colorShift} />
          <MetricItem label="평균 휘도" value={selected.metrics.brightness} />
          <MetricItem label="균일도" value={selected.metrics.brightnessUniformity} />
          <MetricItem label="흐림도" value={selected.metrics.haziness} />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>추정 PM2.5: {selected.estimatedPm25Range.min}~{selected.estimatedPm25Range.max} ug/m3</span>
          <span>신뢰도: {Math.round(selected.confidence * 100)}%</span>
        </div>
      </div>

      {/* 카메라 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">서울 CCTV 카메라 ({analyses.length}개)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analyses.map((a, idx) => (
            <CameraCard
              key={a.cctvId}
              analysis={a}
              isSelected={idx === selectedIdx}
              onClick={() => setSelectedIdx(idx)}
            />
          ))}
        </div>
      </div>

      {/* 안내 메시지 */}
      <p className="text-xs text-gray-400 text-center leading-relaxed">
        현재 Mock 모드로 동작 중입니다. ITS/TOPIS API 키 설정 시 실제 CCTV 스냅샷 분석이 활성화됩니다.
        <br />
        시각 분석은 보조적 보정 수단으로, 기존 예측 모델에 최대 ±15% 범위의 미세 보정을 적용합니다.
      </p>
    </div>
  );
}
