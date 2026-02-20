import { CityAirQualitySummary } from '@/lib/types';
import CityCard from './CityCard';

interface CityGridProps {
  cities: CityAirQualitySummary[];
}

export default function CityGrid({ cities }: CityGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cities.map((data) => (
        <CityCard key={data.city.slug} data={data} />
      ))}
    </div>
  );
}
