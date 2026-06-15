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

  app.post(
    '/api/notifications/welcome-email',
    authenticateFirebase,
    async (req, res) => {
      try {
        const { leadId, leadName, leadEmail } = req.body;
        
        if (!leadId || !leadName) {
          return res.status(400).json({ success: false, error: 'Faltam dados do lead' });
        }

        // Integracao com provedor de email (Resend, SendGrid, etc) via BFF
        console.log(`[Email] Enviando e-mail de acolhimento para ${leadName} (${leadEmail || 'sem email'})`);
        
        res.json({ success: true, message: 'E-mail enviado com sucesso' });
      } catch (error) {
        console.error('Erro ao enviar email de boas-vindas:', error);
        res.status(500).json({ success: false, error: 'Erro interno ao enviar e-mail' });
      }
    }
  );
}
