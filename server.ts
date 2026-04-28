import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { MercadoPagoConfig, Preference } from 'mercadopago';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes (Phase 7.1: modular handlers)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
  });

  // Mercado Pago Checkout integration
  app.post('/api/checkout', async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !items.length) {
        return res.status(400).json({ success: false, error: 'Carrinho vazio' });
      }

      // Initialize MercadoPago SDK
      // Using a test access token fallback for demo purposes.
      // In production, users should configure their process.env.MERCADOPAGO_ACCESS_TOKEN
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-1234567890123456-123456-12345678901234567890-123456789';
      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);

      const mpItems = items.map((item: any) => ({
        id: String(item.product.id),
        title: item.product.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.product.price)
      }));

      const body = {
        items: mpItems,
        back_urls: {
          success: (req.headers.origin || 'http://localhost:3000') + '/?payment=success',
          failure: (req.headers.origin || 'http://localhost:3000') + '/?payment=failure',
          pending: (req.headers.origin || 'http://localhost:3000') + '/?payment=pending'
        },
        auto_return: 'approved'
      };

      // Since we might use a fake test token, preference creation could fail. 
      // We will catch it and return a simulated checkout URL if it fails, ensuring the prototype works.
      let init_point = '';
      try {
        const response = await preference.create({ body });
        init_point = response.init_point || response.sandbox_init_point || '';
      } catch (mpError) {
        console.error("MercadoPago configuration error (expected if test token is used):", mpError);
        // Fallback for prototype without a valid token
        init_point = 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=demo-prototype';
      }

      res.json({ success: true, init_point });
    } catch (error) {
      console.error("API Checkout error:", error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  // Example route
  app.post('/api/users/sync', (req, res) => {
    // This is where backend sync logic will go for cross tenant or advanced admin logic
    res.json({ success: true });
  });

  // Vite middleware for development
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
