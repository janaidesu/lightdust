import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'LightDust - 미세먼지 예보',
  description: '전국 주요 도시의 미세먼지(PM2.5, PM10) 실시간 현황과 7일 예보를 확인하세요.',
  keywords: ['미세먼지', 'PM2.5', 'PM10', '대기질', '공기질', '예보'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <Header />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
