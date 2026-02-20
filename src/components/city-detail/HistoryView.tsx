'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DailyAirQuality } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';

interface HistoryViewProps {
  slug: string;
  initialData: DailyAirQuality[];
}

const PERIOD_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '14일', value: 14 },
  { label: '30일', value: 30 },
];

export default function HistoryView({ slug, initialData }: HistoryViewProps) {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<DailyAirQuality[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (period === 7) {
      setData(initialData);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/air-quality?slug=${slug}&past_days=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.daily);
        }
      } catch {
        // Keep existing data on error
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [period, slug, initialData]);

  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: formatDateShort(d.date),
      'PM2.5': d.pm25Avg,
      'PM10': d.pm10Avg,
    }));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              period === opt.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center text-gray-400">
          데이터를 불러오는 중...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-gray-400">
          과거 데이터가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '13px',
                  }}
                  formatter={(value?: number, name?: string) => [`${value ?? 0} ug/m3`, name ?? '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="PM2.5"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="PM10"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
