import { SkeletonCard } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 bg-gray-200 rounded w-48 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
