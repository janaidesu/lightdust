'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { AirQualityHourly } from '@/lib/types';
import { formatHour } from '@/lib/utils';

interface HourlyChartProps {
  data: AirQualityHourly[];
}

export default function HourlyChart({ data }: HourlyChartProps) {
  const chartData = data.map((h) => ({
    time: formatHour(h.time),
    'PM2.5': h.pm25 !== null ? Math.round(h.pm25) : null,
    'PM10': h.pm10 !== null ? Math.round(h.pm10) : null,
  }));

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        오늘의 시간별 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">오늘 시간별 추이</h3>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              unit=" "
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '13px',
              }}
              formatter={(value?: number, name?: string) => [`${value ?? 0} ug/m3`, name ?? '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {/* PM2.5 thresholds */}
            <ReferenceLine y={15} stroke="#3B82F6" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={35} stroke="#22C55E" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={75} stroke="#EAB308" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line
              type="monotone"
              dataKey="PM2.5"
              stroke="#6366F1"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="PM10"
              stroke="#F97316"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
