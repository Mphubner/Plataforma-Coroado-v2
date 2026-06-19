import { NextResponse } from 'next/server';
import { createCalendarOAuthState, getAuthUrl } from '@/src/lib/calendar';
import { adminDb } from '@/src/lib/firebase-admin';
import { hasApiRole, PASTORAL_ADMIN_ROLES, requireApiAuth } from '../../_utils/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pastorId = searchParams.get('pastorId');

  if (!pastorId) {
    return NextResponse.json({ error: 'Missing pastorId parameter' }, { status: 400 });
  }

  const auth = await requireApiAuth(request);
  if ('response' in auth) return auth.response;

  if (!hasApiRole(auth.ctx, PASTORAL_ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
  }

  const pastorDoc = await adminDb.collection('pastors').doc(pastorId).get();
  if (!pastorDoc.exists) {
    return NextResponse.json({ error: 'Pastor not found' }, { status: 404 });
  }

  const pastor = pastorDoc.data() || {};
  if (pastor.tenantId !== auth.ctx.auth?.tenantId) {
    return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
  }

  try {
    const state = createCalendarOAuthState({
      pastorId,
      tenantId: auth.ctx.auth.tenantId,
      requesterUid: auth.ctx.auth.uid,
    });
    const url = getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Integracao de calendario nao configurada' }, { status: 503 });
  }
}
