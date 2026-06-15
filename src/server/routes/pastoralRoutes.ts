import type express from 'express';
import { authenticateFirebase, type AuthedRequest } from '../context';
import { getAdminDb } from '../context';
import { COLLECTIONS } from '../../lib/domain';
import { google } from 'googleapis';

export function registerPastoralRoutes(app: express.Express) {
  app.post('/api/pastoral/appointments', authenticateFirebase, async (req: AuthedRequest, res) => {
    try {
      const { pastorId, pastorName, userId, date, time } = req.body;
      const tenantId = req.userProfile?.tenantId || 'default';

      if (!pastorId || !userId || !date || !time) {
        return res.status(400).json({ success: false, error: 'Faltam campos obrigatórios' });
      }

      const db = getAdminDb();
      const appointmentRef = db.collection(COLLECTIONS.pastoralAppointments).doc();

      const newAppointment = {
        pastorId,
        pastorName,
        userId,
        date,
        time,
        tenantId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await appointmentRef.set(newAppointment);

      // Integracao com Google Calendar API (Mock setup via BFF / googleapis)
      // O admin precisaria de um token de servico (GOOGLE_APPLICATION_CREDENTIALS) configurado
      let googleCalendarUrl = '';
      try {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/calendar.events'],
            });
            const calendar = google.calendar({ version: 'v3', auth });
            
            // Format datetime: 
            const startDateTime = new Date(`${date}T${time}:00-03:00`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour

            const event = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `Aconselhamento Pastoral: ${pastorName}`,
                    description: `Agendamento via Plataforma Coroado`,
                    start: { dateTime: startDateTime.toISOString() },
                    end: { dateTime: endDateTime.toISOString() },
                }
            });
            googleCalendarUrl = event.data.htmlLink || '';
        } else {
            console.warn('[Google Calendar] Credenciais nao configuradas. Simulando integracao.');
            googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit?text=Aconselhamento+Pastoral:+${encodeURIComponent(pastorName)}&dates=${date.replace(/-/g, '')}T${time.replace(':', '')}00Z/${date.replace(/-/g, '')}T${time.replace(':', '')}00Z&details=Agendamento+via+Plataforma`;
        }
      } catch(gcalError) {
          console.error('[Google Calendar] Erro:', gcalError);
          // Fallback manual URL
          googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit?text=Aconselhamento+Pastoral:+${encodeURIComponent(pastorName)}`;
      }

      res.json({
        success: true,
        appointment: { id: appointmentRef.id, ...newAppointment },
        googleCalendarUrl
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ success: false, error: 'Erro interno ao criar agendamento' });
    }
  });
}
