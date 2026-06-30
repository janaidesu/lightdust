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
import {
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_STYLE,
  CHART_LEGEND_STYLE,
  CHART_MARGIN,
  PM25_CHART_COLOR,
  PM10_CHART_COLOR,
  formatChartTooltip,
} from '@/lib/chart-config';
import EmptyState from '@/components/ui/EmptyState';

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
    return <EmptyState message="오늘의 시간별 데이터가 없습니다." />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">오늘 시간별 추이</h3>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="time"
              tick={CHART_AXIS_TICK}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              unit=" "
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={formatChartTooltip}
            />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            {/* PM2.5 thresholds */}
            <ReferenceLine y={15} stroke="#3B82F6" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={35} stroke="#22C55E" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={75} stroke="#EAB308" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line
              type="monotone"
              dataKey="PM2.5"
              stroke={PM25_CHART_COLOR}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="PM10"
              stroke={PM10_CHART_COLOR}
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
