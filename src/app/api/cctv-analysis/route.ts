import { NextResponse } from 'next/server';
import { getCityBySlug } from '@/lib/utils';
import { fetchCCTVAnalysis } from '@/lib/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug 파라미터가 필요합니다.' }, { status: 400 });
  }

  const city = getCityBySlug(slug);
  if (!city) {
    return NextResponse.json({ error: '존재하지 않는 도시입니다.' }, { status: 404 });
  }

  const currentPm25Str = searchParams.get('pm25');
  const currentPm25 = currentPm25Str ? parseFloat(currentPm25Str) : null;

  if (currentPm25 !== null && (isNaN(currentPm25) || currentPm25 < 0 || currentPm25 > 1000)) {
    return NextResponse.json({ error: 'pm25 must be a number between 0 and 1000' }, { status: 400 });
  }

  try {
    const result = await fetchCCTVAnalysis(slug, currentPm25);

    if (!result) {
      return NextResponse.json({ error: '해당 도시는 CCTV 분석을 지원하지 않습니다.' }, { status: 404 });
    }

    return NextResponse.json(
      { city, ...result },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, s-maxage=600',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch CCTV analysis data' },
      { status: 500 }
    );
  }
}
