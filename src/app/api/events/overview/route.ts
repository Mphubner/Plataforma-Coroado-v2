import { NextResponse } from 'next/server';
import { resolveFirebaseAuthToken } from '../../../../server/context';
import { getEventsOverview } from '../../../../server/queries/eventsOverview';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const ctx = token ? await resolveFirebaseAuthToken(token).catch(() => ({})) : {};
    const overview = await getEventsOverview(ctx);
    return NextResponse.json({ success: true, overview });
  } catch {
    return NextResponse.json({ success: false, error: 'Nao foi possivel carregar os eventos' }, { status: 500 });
  }
}
