'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-bold mb-2">데이터를 불러올 수 없습니다</h2>
      <p className="text-gray-500 mb-6 text-sm">
        잠시 후 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
      >
        다시 시도
      </button>
    </div>
  );
}
