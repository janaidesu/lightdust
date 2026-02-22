import { DailyAirQuality, WeatherData, AirQualityHourly, VisualFactorResult } from '@/lib/types';
import { generatePrediction, calculateAccuracy } from '@/lib/utils';
import GradeBadge from '@/components/ui/GradeBadge';
import HazinessMeter from './HazinessMeter';

interface PredictionSummaryProps {
  today: DailyAirQuality | undefined;
  forecast: DailyAirQuality[];
  history: DailyAirQuality[];
  weather: WeatherData;
  todayHourly: AirQualityHourly[];
  visualAnalysis?: VisualFactorResult | null;
}

function AccuracyRing({ value, label, size = 80 }: { value: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  let color: string;
  if (value >= 80) color = '#22C55E';
  else if (value >= 60) color = '#EAB308';
  else color = '#DC2626';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={6}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{value}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function PredictionSummary({ today, forecast, history, weather, todayHourly, visualAnalysis }: PredictionSummaryProps) {
  const tomorrow = forecast[1];
  const dayAfter = forecast[2];

  // visual analyses를 generatePrediction에 전달
  const visualAnalyses = visualAnalysis?.analyses;
  const prediction = generatePrediction(today, tomorrow, history, weather, todayHourly, visualAnalyses);
  const accuracy = calculateAccuracy(history, forecast);

  if (!prediction) {
    return (
      <div className="text-center text-gray-400 py-12">
        예측 데이터가 충분하지 않습니다.
      </div>
    );
  }

  const trendArrow = prediction.trend === 'worsening' ? '↑' : prediction.trend === 'improving' ? '↓' : '→';
  const trendColor = prediction.trend === 'worsening' ? 'text-red-500' : prediction.trend === 'improving' ? 'text-blue-500' : 'text-gray-500';

  return (
    <div className="space-y-4">
      {/* Accuracy section */}
      {accuracy && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">예측 정확도</h3>
          <div className="flex items-center justify-around mb-4">
            <AccuracyRing value={accuracy.overallAccuracy} label="종합 정확도" size={90} />
            <AccuracyRing value={accuracy.pm25Accuracy} label="PM2.5" />
            <AccuracyRing value={accuracy.pm10Accuracy} label="PM10" />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <div>
              <span className="text-gray-500">등급 일치율</span>
              <span className="ml-2 font-bold">{accuracy.gradeMatchRate}%</span>
            </div>
            <div className="text-xs text-gray-400">
              최근 {accuracy.sampleDays}일 데이터 기반
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400 leading-relaxed">
            최근 {accuracy.sampleDays}일 데이터를 가중이동평균(WMA) 모델로 백테스팅하여 산출한 정확도입니다.
            최근 데이터에 높은 가중치를 부여하고 추세를 반영하여 예측합니다.
          </p>
        </div>
      )}

      {/* Tomorrow forecast */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">내일 예보</h3>
        <div className="flex items-center gap-4 mb-3">
          <GradeBadge grade={prediction.tomorrowGrade} size="lg" />
          <span className={`text-2xl font-bold ${trendColor}`}>{trendArrow}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-500">PM2.5 예상</span>
            <p className="text-xl font-bold">{prediction.tomorrowPm25Avg} <span className="text-xs text-gray-400 font-normal">ug/m3</span></p>
          </div>
          <div>
            <span className="text-gray-500">PM10 예상</span>
            <p className="text-xl font-bold">{prediction.tomorrowPm10Avg} <span className="text-xs text-gray-400 font-normal">ug/m3</span></p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
          {prediction.message}
        </p>
      </div>

      {/* China factor */}
      {prediction.chinaFactor && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">중국발 영향 분석</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">종합 보정 계수</span>
              <span className={`text-lg font-bold ${
                prediction.chinaFactor.combinedFactor > 1.1 ? 'text-red-500' :
                prediction.chinaFactor.combinedFactor < 0.9 ? 'text-blue-500' : 'text-gray-700'
              }`}>
                {prediction.chinaFactor.combinedFactor > 1 ? '+' : ''}{Math.round((prediction.chinaFactor.combinedFactor - 1) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs block mb-1">풍향</span>
                <span className="font-medium">{prediction.chinaFactor.windDescription}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs block mb-1">계절 계수</span>
                <span className="font-medium">
                  {prediction.chinaFactor.seasonalFactor > 1.1 ? '난방 시즌 (배출 증가)' :
                   prediction.chinaFactor.seasonalFactor < 0.8 ? '여름 (청정 기류)' : '보통'}
                </span>
              </div>
              {prediction.chinaFactor.holidayName && (
                <div className="col-span-2 bg-blue-50 rounded-lg p-3">
                  <span className="text-blue-500 text-xs block mb-1">중국 명절</span>
                  <span className="font-medium text-blue-700">{prediction.chinaFactor.holidayName} 연휴 - 공장 가동 감소</span>
                </div>
              )}
            </div>
            {prediction.chinaFactor.summary !== '특별한 보정 요인 없음' && (
              <p className="text-xs text-gray-400 leading-relaxed">
                보정 요인: {prediction.chinaFactor.summary}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Weather factors */}
      {prediction.weatherFactors && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">기상 보정 요인</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">강수 효과</span>
              <span className="font-medium">
                {prediction.weatherFactors.precipitationFactor < 1
                  ? `세정 효과 (-${Math.round((1 - prediction.weatherFactors.precipitationFactor) * 100)}%)`
                  : '강수 없음'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">대기 안정도</span>
              <span className={`font-medium ${
                prediction.weatherFactors.stabilityFactor > 1.15 ? 'text-red-500' :
                prediction.weatherFactors.stabilityFactor < 0.85 ? 'text-blue-500' : ''
              }`}>
                {prediction.weatherFactors.stabilityFactor > 1.15 ? '정체 우려' :
                 prediction.weatherFactors.stabilityFactor < 0.85 ? '분산 양호' : '보통'}
                {' '}(x{prediction.weatherFactors.stabilityFactor})
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">습도 영향</span>
              <span className="font-medium">
                {prediction.weatherFactors.humidityFactor > 1.1
                  ? `입자 팽창 (+${Math.round((prediction.weatherFactors.humidityFactor - 1) * 100)}%)`
                  : '보통'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">오염물질 추세</span>
              <span className={`font-medium ${
                prediction.weatherFactors.leadingIndicatorFactor > 1.05 ? 'text-red-500' :
                prediction.weatherFactors.leadingIndicatorFactor < 0.95 ? 'text-blue-500' : ''
              }`}>
                {prediction.weatherFactors.leadingIndicatorFactor > 1.1 ? '급증 신호' :
                 prediction.weatherFactors.leadingIndicatorFactor > 1.05 ? '증가 추세' :
                 prediction.weatherFactors.leadingIndicatorFactor < 0.95 ? '감소 추세' : '안정'}
              </span>
            </div>
          </div>
          {prediction.weatherFactors.summary !== '특별한 기상 보정 없음' && (
            <p className="mt-3 text-xs text-gray-400 leading-relaxed">
              기상 보정: {prediction.weatherFactors.summary}
            </p>
          )}
        </div>
      )}

      {/* CCTV Visual factor */}
      {prediction.visualFactor && prediction.visualFactor.cameraCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">CCTV 시각 분석</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">시야 흐림도</span>
              <HazinessMeter value={prediction.visualFactor.haziness} />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">보정 계수</span>
              <span className={`text-lg font-bold ${
                prediction.visualFactor.combinedFactor > 1.05 ? 'text-red-500' :
                prediction.visualFactor.combinedFactor < 0.95 ? 'text-blue-500' : 'text-gray-700'
              }`}>
                {prediction.visualFactor.combinedFactor > 1 ? '+' : ''}{Math.round((prediction.visualFactor.combinedFactor - 1) * 100)}%
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {prediction.visualFactor.cameraCount}개 카메라 분석 기반 - {prediction.visualFactor.summary}
          </p>
        </div>
      )}

      {/* Day after tomorrow */}
      {dayAfter && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">모레 예보</h3>
          <div className="flex items-center gap-4">
            <GradeBadge grade={dayAfter.overallGrade} />
            <div className="flex gap-4 text-sm">
              <span>PM2.5: <strong>{dayAfter.pm25Avg}</strong></span>
              <span>PM10: <strong>{dayAfter.pm10Avg}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
