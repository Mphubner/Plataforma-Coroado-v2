import type express from 'express';
import admin from 'firebase-admin';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { checkoutRequestSchema, COLLECTIONS } from '../../lib/domain';
import {
  authenticateFirebase,
  cleanString,
  DEFAULT_TENANT_ID,
  getAdminDb,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
  type AuthedRequest,
} from '../context';

function normalizeCartItems(items: unknown) {
  const parsed = checkoutRequestSchema.safeParse({ items });
  return parsed.success ? parsed.data.items : null;
}

async function buildCheckoutItems(items: unknown) {
  const normalized = normalizeCartItems(items);
  if (!normalized?.length) return null;

  const db = getAdminDb();
  const resolved = [];

  for (const item of normalized) {
    const productDoc = await db.collection(COLLECTIONS.products).doc(item.productId).get();
    if (!productDoc.exists) {
      throw new Error(`Produto indisponivel: ${item.productId}`);
    }

    const product = productDoc.data() || {};
    if (product.active === false) {
      throw new Error(`Produto inativo: ${item.productId}`);
    }

    const unitPrice = Number(product.price || 0);
    const title = cleanString(product.name, 120);
    if (!title || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`Produto invalido: ${item.productId}`);
    }

    resolved.push({
      productId: item.productId,
      name: title,
      quantity: item.quantity,
      unitPrice,
      size: item.size,
      color: item.color,
    });
  }

  return resolved;
}

export function registerCheckoutRoutes(app: express.Express, port: number) {
  app.post('/api/checkout', authenticateFirebase, async (req: AuthedRequest, res) => {
    try {
      const checkoutItems = await buildCheckoutItems(req.body?.items);
      if (!checkoutItems?.length) {
        res.status(400).json({ success: false, error: 'Carrinho vazio ou invalido' });
        return;
      }

      const accessToken = getMercadoPagoAccessToken();
      if (!accessToken) {
        res.status(503).json({ success: false, error: 'Mercado Pago nao configurado no backend' });
        return;
      }

      const tenantId = cleanString(req.userProfile?.tenantId, 128) || DEFAULT_TENANT_ID;
      const total = checkoutItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const orderRef = await getAdminDb().collection(COLLECTIONS.orders).add({
        userId: req.authUser?.uid,
        userName: cleanString(req.userProfile?.name || req.authUser?.name || req.authUser?.email, 200) || 'Membro',
        tenantId,
        items: checkoutItems.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
          size: item.size,
          color: item.color,
        })),
        total,
        status: 'pending_payment',
        paymentStatus: 'created',
        paymentMethod: 'mercadopago',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);
      const origin = String(req.headers.origin || `http://localhost:${port}`);
      const notificationUrl = getMercadoPagoWebhookUrl();

      const response = await preference.create({
        body: {
          items: checkoutItems.map(item => ({
            id: item.productId,
            title: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            currency_id: 'BRL',
          })),
          external_reference: orderRef.id,
          metadata: {
            orderId: orderRef.id,
            userId: req.authUser?.uid,
            tenantId,
          },
          back_urls: {
            success: `${origin}/loja?payment=success`,
            failure: `${origin}/loja?payment=failure`,
            pending: `${origin}/loja?payment=pending`,
          },
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
          auto_return: 'approved',
        },
      });

      const initPoint = response.init_point || response.sandbox_init_point;
      if (!initPoint) {
        res.status(502).json({ success: false, error: 'Mercado Pago nao retornou URL de checkout' });
        return;
      }

      await orderRef.set({
        paymentPreferenceId: response.id || '',
        paymentStatus: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ success: true, init_point: initPoint, orderId: orderRef.id });
    } catch (error) {
      console.error('API Checkout error:', error);
      res.status(502).json({ success: false, error: 'Falha ao criar checkout no Mercado Pago' });
    }
  });
}
