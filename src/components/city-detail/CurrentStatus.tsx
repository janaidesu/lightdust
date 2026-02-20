import { AirQualityHourly } from '@/lib/types';
import { getGrade, getOverallGrade, displayValue, formatFullDateTime } from '@/lib/utils';
import GradeBadge from '@/components/ui/GradeBadge';

interface CurrentStatusProps {
  current: AirQualityHourly;
}

export default function CurrentStatus({ current }: CurrentStatusProps) {
  const pm25Grade = getGrade(current.pm25, 'pm25');
  const pm10Grade = getGrade(current.pm10, 'pm10');
  const overallGrade = getOverallGrade(pm25Grade, pm10Grade);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">현재 대기질</h2>
        <p className="text-xs text-gray-400">{formatFullDateTime(current.time)}</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <GradeBadge grade={overallGrade} size="lg" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">초미세먼지 (PM2.5)</p>
            <GradeBadge grade={pm25Grade} size="sm" />
          </div>
          <p className="text-3xl font-bold">
            {displayValue(current.pm25)}
            <span className="text-sm text-gray-400 ml-1 font-normal">ug/m3</span>
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">미세먼지 (PM10)</p>
            <GradeBadge grade={pm10Grade} size="sm" />
          </div>
          <p className="text-3xl font-bold">
            {displayValue(current.pm10)}
            <span className="text-sm text-gray-400 ml-1 font-normal">ug/m3</span>
          </p>
        </div>
      </div>
    </div>
  );
}
