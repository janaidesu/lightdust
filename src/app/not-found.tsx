import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-bold mb-2">페이지를 찾을 수 없습니다</h2>
      <p className="text-gray-500 mb-6 text-sm">
        요청하신 도시 또는 페이지가 존재하지 않습니다.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
      >
        전체 도시 목록으로
      </Link>
    </div>
  );
}
