import { google } from 'googleapis';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type CalendarOAuthState = {
  pastorId: string;
  tenantId: string;
  requesterUid: string;
  exp: number;
  nonce: string;
};

function getOAuthStateSecret() {
  const secret = process.env.CALENDAR_OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!secret) {
    throw new Error('CALENDAR_OAUTH_STATE_SECRET ou NEXTAUTH_SECRET deve estar configurado.');
  }
  return secret;
}

function signState(payload: string) {
  return createHmac('sha256', getOAuthStateSecret()).update(payload).digest('base64url');
}

export function createCalendarOAuthState(input: Omit<CalendarOAuthState, 'exp' | 'nonce'>) {
  const payload = Buffer.from(JSON.stringify({
    ...input,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID(),
  }), 'utf8').toString('base64url');

  return `${payload}.${signState(payload)}`;
}

export function verifyCalendarOAuthState(state: string): CalendarOAuthState {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) {
    throw new Error('Estado OAuth invalido.');
  }

  const expected = signState(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    throw new Error('Assinatura OAuth invalida.');
  }

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CalendarOAuthState;
  if (!parsed.pastorId || !parsed.tenantId || !parsed.requesterUid || parsed.exp < Date.now()) {
    throw new Error('Estado OAuth expirado ou incompleto.');
  }

  return parsed;
}

export const getGoogleOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback` : 'http://localhost:3000/api/calendar/callback'
  );
  return oauth2Client;
};

export const getAuthUrl = (state: string) => {
  const oauth2Client = getGoogleOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Ensures we get a refresh token
    scope: scopes,
    state
  });
};
