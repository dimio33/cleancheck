import { Router, Request, Response } from 'express';
import { getActiveContests, isFeatureEnabled } from '../services/contestService';

const router = Router();

// GET /api/contests — list active contests (empty if feature flag is off)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const contests = await getActiveContests();
    res.json({ contests });
  } catch (err) {
    console.error('Get contests error:', err);
    res.status(500).json({ error: 'Failed to get contests' });
  }
});

// GET /api/contests/status — check if monthly contest feature is enabled
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const enabled = await isFeatureEnabled('monthly_contest');
    res.json({ enabled });
  } catch (err) {
    console.error('Get contest status error:', err);
    res.status(500).json({ error: 'Failed to get contest status' });
  }
});

export default router;
