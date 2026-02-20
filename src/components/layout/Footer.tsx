export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
        <p>데이터 제공: Open-Meteo Air Quality API</p>
        <p className="mt-1">
          본 서비스는 참고용이며, 정확한 정보는{' '}
          <a
            href="https://www.airkorea.or.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            에어코리아
          </a>
          를 확인해 주세요.
        </p>
      </div>
    </footer>
  );
}
