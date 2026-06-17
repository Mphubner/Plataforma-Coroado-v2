import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleOAuth2Client } from '@/src/lib/calendar';
import { adminDb } from '@/src/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pastorId = searchParams.get('pastorId');
  const date = searchParams.get('date');

  if (!pastorId || !date) {
    return NextResponse.json({ error: 'Missing pastorId or date' }, { status: 400 });
  }

  try {
    const pastorDoc = await adminDb.collection('users').doc(pastorId).get();
    if (!pastorDoc.exists) {
      return NextResponse.json({ error: 'Pastor not found' }, { status: 404 });
    }

    const data = pastorDoc.data() || {};
    const tokens = data.googleCalendarTokens;
    let baseAvailableTimes = Array.isArray(data.availableTimes) ? data.availableTimes : [];
    if (typeof data.availableTimes === 'string') {
      baseAvailableTimes = data.availableTimes.split(',').map((t: string) => t.trim());
    }

    if (!baseAvailableTimes || baseAvailableTimes.length === 0) {
      baseAvailableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    }

    if (!tokens) {
      // If no calendar connected, return all base available times (assuming no bookings sync)
      return NextResponse.json({ availableSlots: baseAvailableTimes });
    }

    const oauth2Client = getGoogleOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Calculate start and end of the requested date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get events for that day
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Filter base available times by removing slots that fall within an event
    const availableSlots = baseAvailableTimes.filter(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotStart = new Date(startDate);
      slotStart.setHours(hours, minutes, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hours + 1, minutes, 0, 0); // Assuming 1 hour slots

      // Check if this slot overlaps with any busy event
      const isBusy = events.some(event => {
        if (!event.start?.dateTime || !event.end?.dateTime) return false; // Ignore all-day events for now, or assume they block the whole day
        const eventStart = new Date(event.start.dateTime).getTime();
        const eventEnd = new Date(event.end.dateTime).getTime();
        const myStart = slotStart.getTime();
        const myEnd = slotEnd.getTime();
        
        return (myStart < eventEnd && myEnd > eventStart);
      });

      return !isBusy;
    });

    return NextResponse.json({ availableSlots });

  } catch (err: any) {
    console.error('Error fetching freebusy data:', err);
    return NextResponse.json({ error: 'Failed to fetch free/busy data', details: err.message }, { status: 500 });
  }
}
