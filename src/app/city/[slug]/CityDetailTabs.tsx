'use client';

import { useMemo } from 'react';
import { AirQualityHourly, DailyAirQuality, WeatherData, VisualFactorResult } from '@/lib/types';
import { hasCCTVSupport } from '@/lib/cctv-stations';
import TabGroup from '@/components/ui/TabGroup';
import HourlyChart from '@/components/city-detail/HourlyChart';
import DailyTable from '@/components/city-detail/DailyTable';
import ForecastView from '@/components/city-detail/ForecastView';
import HistoryView from '@/components/city-detail/HistoryView';
import PredictionSummary from '@/components/city-detail/PredictionSummary';
import CCTVAnalysisView from '@/components/city-detail/CCTVAnalysisView';

interface CityDetailTabsProps {
  slug: string;
  todayHourly: AirQualityHourly[];
  dailyStats: DailyAirQuality[];
  forecast: DailyAirQuality[];
  history: DailyAirQuality[];
  today: DailyAirQuality | undefined;
  weather: WeatherData;
  visualAnalysis?: VisualFactorResult | null;
}

const BASE_TABS = [
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
  weather,
  visualAnalysis,
}: CityDetailTabsProps) {
  const tabs = useMemo(() => {
    if (hasCCTVSupport(slug)) {
      return [...BASE_TABS, { id: 'cctv', label: 'CCTV 분석' }];
    }
    return BASE_TABS;
  }, [slug]);

  return (
    <TabGroup tabs={tabs}>
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
            return (
              <PredictionSummary
                today={today}
                forecast={forecast}
                history={history}
                weather={weather}
                todayHourly={todayHourly}
                visualAnalysis={visualAnalysis}
              />
            );
          case 'cctv':
            return (
              <CCTVAnalysisView
                slug={slug}
                visualAnalysis={visualAnalysis ?? null}
              />
            );
          default:
            return null;
        }
      }}
    </TabGroup>
  );
}
