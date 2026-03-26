import { Router, Request, Response } from 'express';
import { getWeeklyLeaderboard, getLeaderboardCities, getUserRank } from '../services/leaderboardService';
import { optionalAuth } from '../middleware/optionalAuth';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/leaderboard/weekly — weekly leaderboard, optionally filtered by city
router.get('/weekly', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.query.city as string | undefined;
    const leaderboard = await getWeeklyLeaderboard(city);

    let userRank: number | null = null;
    if (req.user?.id) {
      userRank = await getUserRank(req.user.id, city);
    }

    res.json({ leaderboard, userRank });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// GET /api/leaderboard/cities — list cities with leaderboard data this week
router.get('/cities', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cities = await getLeaderboardCities();
    res.json({ cities });
  } catch (err) {
    console.error('Get cities error:', err);
    res.status(500).json({ error: 'Failed to get cities' });
  }
});

export default router;
