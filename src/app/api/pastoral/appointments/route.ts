import { NextResponse } from 'next/server';
import { adminDb } from '@/src/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireApiAuth } from '../../_utils/auth';

function cleanText(value: unknown, fallback = '') {
  return String(value || fallback).trim().slice(0, 180);
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request);
    if ('response' in auth) return auth.response;

    const payload = await request.json();
    const { pastorId, pastorName, date, time } = payload;
    const appointmentDate = String(date || '');
    const appointmentTime = String(time || '');

    if (!pastorId || !appointmentDate || !appointmentTime || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || !/^\d{2}:\d{2}$/.test(appointmentTime)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const tenantId = auth.ctx.auth!.tenantId!;
    const userId = auth.ctx.auth!.uid;
    const userName = cleanText(auth.ctx.userProfile?.name || auth.ctx.auth?.email, 'Membro');

    const pastorDoc = await adminDb.collection('pastors').doc(String(pastorId)).get();
    if (!pastorDoc.exists) {
      return NextResponse.json({ success: false, error: 'Pastor not found' }, { status: 404 });
    }

    const pastor = pastorDoc.data() || {};
    if (pastor.tenantId !== tenantId) {
      return NextResponse.json({ success: false, error: 'Permissao insuficiente' }, { status: 403 });
    }

    let pastorEmail = '';
    if (typeof pastor.linkedEmail === 'string') pastorEmail = pastor.linkedEmail;
    if (!pastorEmail && typeof pastor.email === 'string') pastorEmail = pastor.email;

    const newAppointment = {
      pastorId: String(pastorId),
      pastorName: cleanText(pastor.name || pastorName, 'Pastor Plantonista'),
      pastorEmail,
      userId,
      userName,
      tenantId,
      date: appointmentDate,
      time: appointmentTime,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await adminDb.collection('pastoral_appointments').add(newAppointment);

    // Generate Google Calendar Add URL
    const dateStr = appointmentDate.replace(/-/g, '');
    const timeStr = appointmentTime.replace(':', '') + '00';
    const text = encodeURIComponent(`Aconselhamento: ${pastorName}`);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateStr}T${timeStr}/${dateStr}T${timeStr}&details=Aconselhamento+Pastoral`;

    return NextResponse.json({ 
      success: true, 
      appointment: { id: docRef.id, ...newAppointment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      googleCalendarUrl 
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create appointment' }, { status: 500 });
  }
}
