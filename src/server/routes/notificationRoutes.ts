import type express from 'express';
import { authenticateFirebase, requireRoles } from '../context';

export function registerNotificationRoutes(app: express.Express) {
  app.post(
    '/api/notifications/whatsapp',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor', 'networkPastor', 'auxPastor']),
    async (req, res) => {
      if (!process.env.WHATSAPP_PROVIDER_URL || !process.env.WHATSAPP_PROVIDER_TOKEN) {
        res.status(503).json({ success: false, error: 'Integracao WhatsApp nao configurada' });
        return;
      }

      res.status(501).json({ success: false, error: 'Disparo WhatsApp pendente de implementacao do provedor' });
    },
  );
}
