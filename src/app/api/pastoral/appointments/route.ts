import { NextResponse } from 'next/server';
import { adminDb } from '@/src/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { pastorId, pastorName, userId, userName, tenantId, date, time } = payload;

    if (!pastorId || !userId || !tenantId || !date || !time) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Optionally check if a pastor has an email linked
    let pastorEmail = '';
    try {
      const pastorDoc = await adminDb.collection('users').doc(pastorId).get();
      if (pastorDoc.exists) {
        pastorEmail = pastorDoc.data()?.linkedEmail || '';
      }
    } catch(e) {}

    const newAppointment = {
      pastorId,
      pastorName,
      pastorEmail,
      userId,
      userName,
      tenantId,
      date,
      time,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection('pastoral_appointments').add(newAppointment);

    // Generate Google Calendar Add URL
    const dateStr = date.replace(/-/g, '');
    const timeStr = time.replace(':', '') + '00';
    const text = encodeURIComponent(`Aconselhamento: ${pastorName}`);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateStr}T${timeStr}/${dateStr}T${timeStr}&details=Aconselhamento+Pastoral`;

    return NextResponse.json({ 
      success: true, 
      appointment: { id: docRef.id, ...newAppointment }, 
      googleCalendarUrl 
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create appointment' }, { status: 500 });
  }
}
