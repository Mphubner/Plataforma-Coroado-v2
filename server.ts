import 'dotenv/config';

import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { registerAdminRoutes } from './src/server/routes/adminRoutes';
import { registerCellRoutes } from './src/server/routes/cellRoutes';
import { registerCheckoutRoutes } from './src/server/routes/checkoutRoutes';
import { registerEventRoutes } from './src/server/routes/eventRoutes';
import { registerFinanceRoutes } from './src/server/routes/financeRoutes';
import { registerMercadoPagoRoutes } from './src/server/routes/mercadoPagoRoutes';
import { registerNotificationRoutes } from './src/server/routes/notificationRoutes';
import { registerPastoralRoutes } from './src/server/routes/pastoralRoutes';
import { registerPublicRoutes } from './src/server/routes/publicRoutes';
import { registerSchoolRoutes } from './src/server/routes/schoolRoutes';
import { appRouter, createTrpcContext } from './src/server/trpc';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
  });

  registerPublicRoutes(app);
  registerAdminRoutes(app);
  registerCellRoutes(app);
  registerCheckoutRoutes(app, PORT);
  registerEventRoutes(app, PORT);
  registerFinanceRoutes(app);
  registerSchoolRoutes(app, PORT);
  registerMercadoPagoRoutes(app);
  registerNotificationRoutes(app);
  registerPastoralRoutes(app);
  app.use('/api/trpc', createExpressMiddleware({
    router: appRouter,
    createContext: createTrpcContext,
  }));

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
