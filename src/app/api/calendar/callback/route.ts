import { NextResponse } from 'next/server';
import { getGoogleOAuth2Client } from '@/src/lib/calendar';
import { adminDb } from '@/src/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This contains our pastorId
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/pastores?error=google_auth_failed');
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state parameters' }, { status: 400 });
  }

  const pastorId = state;

  try {
    const oauth2Client = getGoogleOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save the tokens to Firestore
    await adminDb.collection('users').doc(pastorId).update({
       googleCalendarTokens: {
         access_token: tokens.access_token || null,
         refresh_token: tokens.refresh_token || null,
         expiry_date: tokens.expiry_date || null
       }
    });
    
    // For now, redirect back to pastors view
    return NextResponse.redirect('/pastores?success=google_connected');
    
  } catch (err) {
    console.error('Error during Google OAuth callback:', err);
    return NextResponse.redirect('/pastores?error=google_auth_exception');
  }
}
