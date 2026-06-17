import { google } from 'googleapis';

export const getGoogleOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback` : 'http://localhost:3000/api/calendar/callback'
  );
  return oauth2Client;
};

export const getAuthUrl = (pastorId: string) => {
  const oauth2Client = getGoogleOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Ensures we get a refresh token
    scope: scopes,
    state: pastorId // Pass pastorId in state to know which pastor to link
  });
};
