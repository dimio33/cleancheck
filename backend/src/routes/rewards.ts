import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAvailableRewards, claimReward } from '../services/rewardService';

const router = Router();

// GET /api/rewards — list available rewards for authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Auth required' }); return; }
    const rewards = await getAvailableRewards(req.user.id);
    res.json(rewards);
  } catch (err) {
    console.error('Get rewards error:', err);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// POST /api/rewards/:id/claim — claim a reward
router.post('/:id/claim', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Auth required' }); return; }
    const result = await claimReward(req.user.id, req.params.id as string);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Claim reward error:', err);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

export default router;
