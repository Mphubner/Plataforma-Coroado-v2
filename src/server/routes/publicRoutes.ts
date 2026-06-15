import type express from 'express';
import admin from 'firebase-admin';
import { COLLECTIONS, visitorLeadRequestSchema } from '../../lib/domain';
import { cleanString, DEFAULT_TENANT_ID, getAdminDb } from '../context';

export function registerPublicRoutes(app: express.Express) {
  app.post('/api/visitor-leads', async (req, res) => {
    const parsed = visitorLeadRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Nome e WhatsApp sao obrigatorios' });
      return;
    }

    const lead = parsed.data;

    try {
      await getAdminDb().collection(COLLECTIONS.visitorLeads).add({
        name: lead.name,
        phone: lead.phone,
        neighborhood: lead.neighborhood,
        dateVisited: new Date().toISOString().slice(0, 10),
        source: lead.source,
        status: 'pending',
        tenantId: cleanString(lead.tenantId, 128) || DEFAULT_TENANT_ID,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Create visitor lead failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel registrar o visitante' });
    }
  });
}
