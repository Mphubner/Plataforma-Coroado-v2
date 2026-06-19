import { NextResponse } from 'next/server';
import { resolveFirebaseAuthToken, type ServerAuthContext } from '@/src/server/context';

export const PASTORAL_ADMIN_ROLES = ['admin', 'seniorPastor', 'networkPastor', 'auxPastor'];

export async function requireApiAuth(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const ctx = await resolveFirebaseAuthToken(token);
    if (!ctx.auth?.uid || !ctx.auth.tenantId) {
      return { response: NextResponse.json({ success: false, error: 'Sessao incompleta' }, { status: 401 }) };
    }

    return { ctx };
  } catch {
    return { response: NextResponse.json({ success: false, error: 'Sessao invalida ou expirada' }, { status: 401 }) };
  }
}

export function hasApiRole(ctx: ServerAuthContext, roles: string[]) {
  return Boolean(ctx.auth?.roles?.some(role => roles.includes(role)));
}
