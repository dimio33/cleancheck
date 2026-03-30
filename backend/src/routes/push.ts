import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../utils/db';

const router = Router();

// POST /api/push/subscribe — register a push subscription
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      res.status(400).json({ error: 'endpoint, keys.auth, and keys.p256dh are required' });
      return;
    }

    if (typeof endpoint !== 'string' || typeof keys.auth !== 'string' || typeof keys.p256dh !== 'string') {
      res.status(400).json({ error: 'Invalid subscription data' });
      return;
    }

    // UPSERT — update keys if endpoint already exists
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = $1,
         auth_key = $3,
         p256dh_key = $4`,
      [req.user.id, endpoint, keys.auth, keys.p256dh],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// DELETE /api/push/unsubscribe — remove a push subscription
router.delete('/unsubscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      res.status(400).json({ error: 'endpoint is required' });
      return;
    }

    await query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
      [endpoint, req.user.id],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;
