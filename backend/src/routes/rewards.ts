import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAvailableRewards, claimReward } from '../services/rewardService';
import { query } from '../utils/db';

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

// POST /api/rewards/:id/activate — set a claimed reward as active frame
router.post('/:id/activate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Auth required' }); return; }

    // Check user has claimed this reward
    const claim = await query(
      'SELECT ur.*, r.type, r.name_en FROM user_rewards ur JOIN rewards r ON ur.reward_id = r.id WHERE ur.reward_id = $1 AND ur.user_id = $2',
      [req.params.id, req.user.id]
    );
    if (claim.rows.length === 0) {
      res.status(400).json({ error: 'Reward not claimed' });
      return;
    }

    const reward = claim.rows[0];

    // Only frame-type rewards can be activated
    if (reward.type !== 'digital' || !reward.name_en.includes('Frame')) {
      res.status(400).json({ error: 'This reward cannot be activated as a frame' });
      return;
    }

    // Determine frame slug from reward name
    const frameMap: Record<string, string> = {
      'Bronze Frame': 'bronze',
      'Silver Frame': 'silver',
      'Gold Frame': 'gold',
      'Diamond Frame': 'diamond',
      'Legendary Frame': 'legendary',
    };
    const frameSlug = frameMap[reward.name_en] || null;

    await query('UPDATE users SET active_frame = $2 WHERE id = $1', [req.user.id, frameSlug]);

    res.json({ success: true, active_frame: frameSlug });
  } catch (err) {
    console.error('Activate reward error:', err);
    res.status(500).json({ error: 'Failed to activate reward' });
  }
});

// DELETE /api/rewards/frame — remove active frame
router.delete('/frame', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Auth required' }); return; }
    await query('UPDATE users SET active_frame = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Deactivate frame error:', err);
    res.status(500).json({ error: 'Failed to deactivate frame' });
  }
});

export default router;
