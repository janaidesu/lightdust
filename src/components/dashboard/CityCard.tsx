import Link from 'next/link';
import { CityAirQualitySummary } from '@/lib/types';
import { getGradeBorderClass, displayValue } from '@/lib/utils';
import GradeBadge from '@/components/ui/GradeBadge';

interface CityCardProps {
  data: CityAirQualitySummary;
}

export default function CityCard({ data }: CityCardProps) {
  return (
    <Link href={`/city/${data.city.slug}`}>
      <div
        className={`bg-white rounded-xl border border-gray-200 border-l-4 ${getGradeBorderClass(data.overallGrade)} p-5 hover:shadow-md transition-shadow cursor-pointer`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">{data.city.name}</h3>
          <span className="text-xs text-gray-400">{data.city.region}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">초미세먼지 PM2.5</p>
            <p className="text-2xl font-bold">
              {displayValue(data.currentPm25)}
              <span className="text-xs text-gray-400 ml-1 font-normal">ug/m3</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">미세먼지 PM10</p>
            <p className="text-2xl font-bold">
              {displayValue(data.currentPm10)}
              <span className="text-xs text-gray-400 ml-1 font-normal">ug/m3</span>
            </p>
          </div>
        </div>

        <GradeBadge grade={data.overallGrade} />
      </div>
    </Link>
  );
}
