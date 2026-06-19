import type express from 'express';
import { eventCheckInRequestSchema, eventEnrollmentRequestSchema } from '../../lib/domain';
import {
  authenticateFirebase,
  resolveOptionalFirebaseAuth,
  type AuthedRequest,
} from '../context';
import { checkInEventEnrollment, createEventEnrollment, getEventCheckInPreview, OperationError } from '../operations';
import { getEventsOverview } from '../queries/eventsOverview';

export function registerEventRoutes(app: express.Express, port: number) {
  app.get('/api/events/overview', async (req, res) => {
    try {
      const ctx = await resolveOptionalFirebaseAuth(req);
      const overview = await getEventsOverview(ctx);
      res.json({ success: true, overview });
    } catch (error) {
      console.error('Events overview failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel carregar os eventos' });
    }
  });

  app.post('/api/event-enrollments/:enrollmentId/check-in', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = eventCheckInRequestSchema.safeParse({
      ...req.body,
      enrollmentId: req.params.enrollmentId,
    });

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Ingresso invalido' });
      return;
    }

    try {
      const result = await checkInEventEnrollment(req, parsed.data.enrollmentId);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Event check-in failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel confirmar o check-in' });
    }
  });

  app.get('/api/event-enrollments/:enrollmentId/check-in-preview', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = eventCheckInRequestSchema.safeParse({
      enrollmentId: req.params.enrollmentId,
    });

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Ingresso invalido' });
      return;
    }

    try {
      const result = await getEventCheckInPreview(req, parsed.data.enrollmentId);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Event check-in preview failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel validar o ingresso' });
    }
  });

  app.post('/api/events/:eventId/enroll', authenticateFirebase, async (req: AuthedRequest, res) => {
    const parsed = eventEnrollmentRequestSchema.safeParse({
      ...req.body,
      eventId: req.params.eventId,
    });

    if (!parsed.success || !req.authUser?.uid) {
      res.status(400).json({ success: false, error: 'Dados de inscricao invalidos' });
      return;
    }

    try {
      const origin = String(req.headers.origin || `http://localhost:${port}`);
      const result = await createEventEnrollment(req, parsed.data, origin);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Create event enrollment failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel realizar a inscricao' });
    }
  });
}
