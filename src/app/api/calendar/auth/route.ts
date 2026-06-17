import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/src/lib/calendar';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pastorId = searchParams.get('pastorId');

  if (!pastorId) {
    return NextResponse.json({ error: 'Missing pastorId parameter' }, { status: 400 });
  }

  const url = getAuthUrl(pastorId);
  return NextResponse.redirect(url);
}
