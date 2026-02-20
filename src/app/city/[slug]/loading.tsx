import { SkeletonTable } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div>
      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-4" />
      <div className="h-7 bg-gray-200 rounded w-48 animate-pulse mb-4" />

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
        <div className="h-8 bg-gray-200 rounded-full w-16 mb-4" />
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-100 rounded-lg h-24" />
          <div className="bg-gray-100 rounded-lg h-24" />
        </div>
      </div>

      <SkeletonTable />
    </div>
  );
}
