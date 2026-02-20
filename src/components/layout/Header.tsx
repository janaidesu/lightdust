import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">LightDust</span>
          <span className="text-sm text-gray-500">미세먼지 예보</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900">전체 도시</Link>
        </nav>
      </div>
    </header>
  );
}
