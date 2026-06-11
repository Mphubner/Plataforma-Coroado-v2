import 'dotenv/config';

import express from 'express';
import type { RequestHandler } from 'express';
import admin from 'firebase-admin';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Preference } from 'mercadopago';

type AuthedRequest = express.Request & {
  authUser?: admin.auth.DecodedIdToken;
  userProfile?: admin.firestore.DocumentData;
};

const VALID_ROLES = new Set([
  'member',
  'cellLeader',
  'ministryLeader',
  'supervisor',
  'networkPastor',
  'auxPastor',
  'seniorPastor',
  'admin',
]);

const OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL || 'marcospereirahubner@gmail.com';

function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  return admin.app();
}

function getAdminDb() {
  getAdminApp();
  return admin.firestore();
}

async function loadUserProfile(uid: string) {
  const snapshot = await getAdminDb().collection('users').doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
}

function getRoles(profile?: admin.firestore.DocumentData | null) {
  return Array.isArray(profile?.roles) ? profile.roles.map(String) : [];
}

function hasAnyRole(profile: admin.firestore.DocumentData | null | undefined, roles: string[]) {
  const currentRoles = getRoles(profile);
  return currentRoles.some(role => roles.includes(role));
}

const authenticateFirebase: RequestHandler = async (req: AuthedRequest, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    res.status(401).json({ success: false, error: 'Autenticacao obrigatoria' });
    return;
  }

  try {
    getAdminApp();
    const decoded = await admin.auth().verifyIdToken(token);
    const profile = await loadUserProfile(decoded.uid);

    req.authUser = decoded;
    req.userProfile = profile || undefined;
    next();
  } catch (error) {
    console.error('Firebase auth verification failed:', error);
    res.status(401).json({ success: false, error: 'Sessao invalida ou expirada' });
  }
};

function requireRoles(roles: string[]): RequestHandler {
  return (req: AuthedRequest, res, next) => {
    const isOwner = req.authUser?.email === OWNER_EMAIL;
    if (isOwner || hasAnyRole(req.userProfile, roles)) {
      next();
      return;
    }

    res.status(403).json({ success: false, error: 'Permissao insuficiente' });
  };
}

function sanitizeRoles(input: unknown) {
  if (!Array.isArray(input)) return null;
  const roles = Array.from(new Set(input.map(String).filter(role => VALID_ROLES.has(role))));
  return roles.length > 0 ? roles : null;
}

function normalizeCheckoutItems(items: unknown) {
  if (!Array.isArray(items)) return null;

  return items.map((item: any) => ({
    id: String(item?.product?.id || ''),
    title: String(item?.product?.name || '').slice(0, 120),
    quantity: Number(item?.quantity || 0),
    unit_price: Number(item?.product?.price || 0),
  })).filter(item => item.id && item.title && item.quantity > 0 && item.unit_price > 0);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
  });

  app.post(
    '/api/admin/users/:uid/approve',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor', 'networkPastor', 'auxPastor', 'supervisor']),
    async (req: AuthedRequest, res) => {
      try {
        const { uid } = req.params;
        await getAdminDb().collection('users').doc(uid).set({
          isApproved: true,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: req.authUser?.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        res.json({ success: true });
      } catch (error) {
        console.error('Approve user failed:', error);
        res.status(500).json({ success: false, error: 'Nao foi possivel aprovar o usuario' });
      }
    },
  );

  app.patch(
    '/api/admin/users/:uid/roles',
    authenticateFirebase,
    requireRoles(['admin', 'seniorPastor']),
    async (req: AuthedRequest, res) => {
      const roles = sanitizeRoles(req.body?.roles);
      if (!roles) {
        res.status(400).json({ success: false, error: 'Lista de papeis invalida' });
        return;
      }

      try {
        const { uid } = req.params;
        await getAdminDb().collection('users').doc(uid).set({
          roles,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rolesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rolesUpdatedBy: req.authUser?.uid,
        }, { merge: true });

        res.json({ success: true, roles });
      } catch (error) {
        console.error('Update user roles failed:', error);
        res.status(500).json({ success: false, error: 'Nao foi possivel alterar os papeis' });
      }
    },
  );

  app.post('/api/checkout', authenticateFirebase, async (req: AuthedRequest, res) => {
    try {
      const mpItems = normalizeCheckoutItems(req.body?.items);
      if (!mpItems?.length) {
        res.status(400).json({ success: false, error: 'Carrinho vazio ou invalido' });
        return;
      }

      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        res.status(503).json({ success: false, error: 'Mercado Pago nao configurado no backend' });
        return;
      }

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);
      const origin = String(req.headers.origin || `http://localhost:${PORT}`);

      const response = await preference.create({
        body: {
          items: mpItems,
          metadata: {
            userId: req.authUser?.uid,
            tenantId: req.userProfile?.tenantId,
          },
          back_urls: {
            success: `${origin}/loja?payment=success`,
            failure: `${origin}/loja?payment=failure`,
            pending: `${origin}/loja?payment=pending`,
          },
          auto_return: 'approved',
        },
      });

      const initPoint = response.init_point || response.sandbox_init_point;
      if (!initPoint) {
        res.status(502).json({ success: false, error: 'Mercado Pago nao retornou URL de checkout' });
        return;
      }

      res.json({ success: true, init_point: initPoint });
    } catch (error) {
      console.error('API Checkout error:', error);
      res.status(502).json({ success: false, error: 'Falha ao criar checkout no Mercado Pago' });
    }
  });

  app.post('/api/webhooks/mercadopago', async (req, res) => {
    console.log('Mercado Pago webhook received:', {
      type: req.body?.type,
      action: req.body?.action,
      id: req.body?.data?.id,
    });

    res.status(202).json({ success: true });
  });

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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
