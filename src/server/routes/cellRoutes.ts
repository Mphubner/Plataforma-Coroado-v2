import type express from 'express';
import {
  authenticateFirebase,
  type AuthedRequest,
} from '../context';
import { OperationError } from '../operations';
import { getCellOverview } from '../queries/cellOverview';

export function registerCellRoutes(app: express.Express) {
  app.get('/api/cells/:cellId/overview', authenticateFirebase, async (req: AuthedRequest, res) => {
    try {
      const overview = await getCellOverview(req, req.params.cellId);
      res.json({ success: true, overview });
    } catch (error) {
      if (error instanceof OperationError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }

      console.error('Cell overview failed:', error);
      res.status(500).json({ success: false, error: 'Nao foi possivel carregar a celula' });
    }
  });
}
