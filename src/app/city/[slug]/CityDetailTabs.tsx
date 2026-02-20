'use client';

import { AirQualityHourly, DailyAirQuality } from '@/lib/types';
import TabGroup from '@/components/ui/TabGroup';
import HourlyChart from '@/components/city-detail/HourlyChart';
import DailyTable from '@/components/city-detail/DailyTable';
import ForecastView from '@/components/city-detail/ForecastView';
import HistoryView from '@/components/city-detail/HistoryView';
import PredictionSummary from '@/components/city-detail/PredictionSummary';

interface CityDetailTabsProps {
  slug: string;
  todayHourly: AirQualityHourly[];
  dailyStats: DailyAirQuality[];
  forecast: DailyAirQuality[];
  history: DailyAirQuality[];
  today: DailyAirQuality | undefined;
  windDirection?: number | null;
}

const TABS = [
  { id: 'hourly', label: '시간별' },
  { id: 'daily', label: '날짜별' },
  { id: 'forecast', label: '7일 예보' },
  { id: 'history', label: '과거 데이터' },
  { id: 'prediction', label: '예측' },
];

export default function CityDetailTabs({
  slug,
  todayHourly,
  dailyStats,
  forecast,
  history,
  today,
  windDirection,
}: CityDetailTabsProps) {
  return (
    <TabGroup tabs={TABS}>
      {(activeTab) => {
        switch (activeTab) {
          case 'hourly':
            return <HourlyChart data={todayHourly} />;
          case 'daily':
            return <DailyTable data={dailyStats} />;
          case 'forecast':
            return <ForecastView data={forecast} />;
          case 'history':
            return <HistoryView slug={slug} initialData={history} />;
          case 'prediction':
            return <PredictionSummary today={today} forecast={forecast} history={history} windDirection={windDirection} />;
          default:
            return null;
        }
      }}
    </TabGroup>
  );
}
