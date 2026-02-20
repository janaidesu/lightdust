export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-20 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-28" />
      </div>
      <div className="mt-4 h-7 bg-gray-200 rounded-full w-16" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded" />
      ))}
    </div>
  );
}
