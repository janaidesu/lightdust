import { DailyAirQuality } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';
import GradeBadge from '@/components/ui/GradeBadge';
import { format } from 'date-fns';

interface ForecastViewProps {
  data: DailyAirQuality[];
}

export default function ForecastView({ data }: ForecastViewProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        예보 데이터가 없습니다.
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {data.map((day) => {
        const isToday = day.date === today;
        return (
          <div
            key={day.date}
            className={`shrink-0 w-32 bg-white rounded-xl border p-4 text-center ${
              isToday ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">
              {isToday ? '오늘' : formatDateShort(day.date)}
            </p>
            <div className="mb-3">
              <GradeBadge grade={day.overallGrade} size="sm" />
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-gray-400">PM2.5</span>{' '}
                <span className="font-bold">{day.pm25Avg}</span>
              </div>
              <div>
                <span className="text-gray-400">PM10</span>{' '}
                <span className="font-bold">{day.pm10Avg}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
