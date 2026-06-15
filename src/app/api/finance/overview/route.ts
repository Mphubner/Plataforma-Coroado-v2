import { NextResponse } from 'next/server';
import { resolveFirebaseAuthToken } from '../../../../server/context';
import { OperationError } from '../../../../server/operations';
import { getFinanceOverview } from '../../../../server/queries/financeOverview';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const ctx = await resolveFirebaseAuthToken(token);
    const overview = await getFinanceOverview(ctx);
    return NextResponse.json({ success: true, overview });
  } catch (error) {
    if (error instanceof OperationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ success: false, error: 'Nao foi possivel carregar o resumo financeiro' }, { status: 500 });
  }
}
