import { NextRequest, NextResponse } from 'next/server';
import { fetchCityHistory } from '@/lib/api';
import { getCityBySlug } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const pastDaysParam = searchParams.get('past_days');

  if (!slug) {
    return NextResponse.json({ error: 'slug parameter is required' }, { status: 400 });
  }

  const city = getCityBySlug(slug);
  if (!city) {
    return NextResponse.json({ error: 'Unknown city' }, { status: 404 });
  }

  const pastDays = pastDaysParam ? parseInt(pastDaysParam, 10) : 7;
  if (isNaN(pastDays) || pastDays < 1 || pastDays > 92) {
    return NextResponse.json({ error: 'past_days must be between 1 and 92' }, { status: 400 });
  }

  try {
    const daily = await fetchCityHistory(slug, pastDays);
    return NextResponse.json(
      { city, daily },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
}
