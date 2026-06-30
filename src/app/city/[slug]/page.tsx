import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchCityDetail, fetchCCTVAnalysis } from '@/lib/api';
import { getCityBySlug } from '@/lib/utils';
import { CITIES } from '@/lib/constants';
import { hasCCTVSupport } from '@/lib/cctv-stations';
import CurrentStatus from '@/components/city-detail/CurrentStatus';
import CityDetailTabs from './CityDetailTabs';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CITIES.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return { title: '도시를 찾을 수 없습니다' };
  return {
    title: `${city.name} 미세먼지 - LightDust`,
    description: `${city.name}의 실시간 미세먼지(PM2.5, PM10) 현황과 7일 예보를 확인하세요.`,
  };
}

export default async function CityDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Air Quality + CCTV 분석 병렬 호출
  // CCTV is supplementary — its failure should not take down the page
  const [detailResult, cctvResult] = await Promise.allSettled([
    fetchCityDetail(slug),
    hasCCTVSupport(slug) ? fetchCCTVAnalysis(slug) : Promise.resolve(null),
  ]);

  const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;
  const cctvAnalysis = cctvResult.status === 'fulfilled' ? cctvResult.value : null;
  if (cctvResult.status === 'rejected') {
    console.error('[CCTV] Analysis failed for', slug, cctvResult.reason);
  }

  if (!detail) notFound();

  const today = detail.forecast[0];

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← 전체 도시 목록
      </Link>

      <h1 className="text-2xl font-bold mb-4">{detail.city.name} 미세먼지 현황</h1>

      <CurrentStatus current={detail.current} />

      <CityDetailTabs
        slug={slug}
        todayHourly={detail.todayHourly}
        dailyStats={detail.dailyStats}
        forecast={detail.forecast}
        history={detail.history}
        today={today}
        weather={detail.weather}
        visualAnalysis={cctvAnalysis}
      />
    </div>
  );
}
