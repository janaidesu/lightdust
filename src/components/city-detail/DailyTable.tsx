import { DailyAirQuality } from '@/lib/types';
import { formatDateKorean } from '@/lib/utils';
import GradeBadge from '@/components/ui/GradeBadge';

interface DailyTableProps {
  data: DailyAirQuality[];
}

export default function DailyTable({ data }: DailyTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        날짜별 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">날짜</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">PM2.5 평균</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">PM2.5 최고</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">PM10 평균</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">PM10 최고</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">등급</th>
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{formatDateKorean(day.date)}</td>
                <td className="px-4 py-3 text-right">{day.pm25Avg}</td>
                <td className="px-4 py-3 text-right text-gray-500">{day.pm25Max}</td>
                <td className="px-4 py-3 text-right">{day.pm10Avg}</td>
                <td className="px-4 py-3 text-right text-gray-500">{day.pm10Max}</td>
                <td className="px-4 py-3 text-center">
                  <GradeBadge grade={day.overallGrade} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-gray-100">
        {data.map((day) => (
          <div key={day.date} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{formatDateKorean(day.date)}</span>
              <GradeBadge grade={day.overallGrade} size="sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>PM2.5: {day.pm25Avg} (최고 {day.pm25Max})</div>
              <div>PM10: {day.pm10Avg} (최고 {day.pm10Max})</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
