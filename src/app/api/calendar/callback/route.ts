import { NextResponse } from 'next/server';
import { getGoogleOAuth2Client, verifyCalendarOAuthState } from '@/src/lib/calendar';
import { adminDb } from '@/src/lib/firebase-admin';

export async function GET(request: Request) {
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return redirectTo('/pastores?error=google_auth_failed');
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state parameters' }, { status: 400 });
  }

  try {
    const oauthState = verifyCalendarOAuthState(state);
    const pastorRef = adminDb.collection('pastors').doc(oauthState.pastorId);
    const pastorDoc = await pastorRef.get();
    if (!pastorDoc.exists || pastorDoc.data()?.tenantId !== oauthState.tenantId) {
      return redirectTo('/pastores?error=google_auth_forbidden');
    }

    const oauth2Client = getGoogleOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    await pastorRef.update({
      googleCalendarTokens: {
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        expiry_date: tokens.expiry_date || null
      },
      googleCalendarConnectedAt: new Date().toISOString(),
      googleCalendarConnectedBy: oauthState.requesterUid
    });

    return redirectTo('/pastores?success=google_connected');
  } catch (err) {
    console.error('Error during Google OAuth callback:', err);
    return redirectTo('/pastores?error=google_auth_exception');
  }
}
