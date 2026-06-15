import { NextResponse } from 'next/server';
import { eventEnrollmentRequestSchema } from '../../../../../lib/domain';
import { resolveFirebaseAuthToken } from '../../../../../server/context';
import { createEventEnrollment, OperationError } from '../../../../../server/operations';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const body = await request.json().catch(() => ({}));
  const parsed = eventEnrollmentRequestSchema.safeParse({
    ...body,
    eventId,
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Dados de inscricao invalidos' }, { status: 400 });
  }

  try {
    const ctx = await resolveFirebaseAuthToken(token);
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const result = await createEventEnrollment(ctx, parsed.data, origin);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof OperationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ success: false, error: 'Nao foi possivel realizar a inscricao' }, { status: 500 });
  }
}
