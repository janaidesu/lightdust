import { fetchAllCitiesCurrent } from '@/lib/api';
import { formatFullDateTime } from '@/lib/utils';
import CityGrid from '@/components/dashboard/CityGrid';

export default async function HomePage() {
  const cities = await fetchAllCitiesCurrent();

  const updatedAt = cities[0]?.updatedAt
    ? formatFullDateTime(cities[0].updatedAt)
    : '';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">전국 미세먼지 현황</h1>
        {updatedAt && (
          <p className="text-sm text-gray-500">{updatedAt}</p>
        )}
      </div>
      <CityGrid cities={cities} />
    </div>
  );
}
