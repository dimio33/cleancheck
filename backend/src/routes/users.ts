import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { isValidUuid } from '../utils/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDailyLoginBonus, calculateLevel, getRankTitle } from '../services/xpService';

const router = Router();

// GET /api/users/:id/profile — user profile with stats and badges
router.get('/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id as string)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    const userResult = await query(
      `SELECT id, username, avatar_url, total_ratings, locale, created_at,
              xp, level, rank_title, current_streak, longest_streak,
              active_frame, custom_title
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const badgesResult = await query(
      `SELECT b.slug, b.name_de, b.name_en, b.description_de, b.description_en, b.icon, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [id]
    );

    const statsResult = await query<{
      total_ratings: string;
      avg_score: string;
      unique_restaurants: string;
    }>(
      `SELECT
        COUNT(*) as total_ratings,
        COALESCE(AVG(r.overall_score), 0) as avg_score,
        COUNT(DISTINCT r.restaurant_id) as unique_restaurants
       FROM ratings r
       WHERE r.user_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0] || { total_ratings: '0', avg_score: '0', unique_restaurants: '0' };

    const user = userResult.rows[0];
    const levelInfo = calculateLevel(user.xp || 0);
    const rank = getRankTitle(levelInfo.level);

    res.json({
      user,
      badges: badgesResult.rows,
      stats: {
        total_ratings: parseInt(stats.total_ratings || '0', 10),
        avg_score: Math.round(parseFloat(stats.avg_score || '0') * 10) / 10,
        unique_restaurants: parseInt(stats.unique_restaurants || '0', 10),
      },
      gamification: {
        xp: user.xp || 0,
        level: levelInfo.level,
        rank,
        xpInCurrentLevel: levelInfo.xpInCurrentLevel,
        xpForNextLevel: levelInfo.xpForNextLevel,
        progress: levelInfo.progress,
        current_streak: user.current_streak || 0,
        longest_streak: user.longest_streak || 0,
      },
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// GET /api/users/badges — list all available badges
router.get('/badges', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT slug, name_de, name_en, description_de, description_en, icon, criteria
       FROM badges ORDER BY slug`
    );

    res.json({ badges: result.rows });
  } catch (err) {
    console.error('Get badges error:', err);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

// POST /api/users/:id/daily-login — claim daily login XP bonus
router.post('/:id/daily-login', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id as string)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    // Only allow claiming own bonus
    if (!req.user || req.user.id !== id) {
      res.status(403).json({ error: 'You can only claim your own daily login bonus' });
      return;
    }

    const result = await getDailyLoginBonus(id);
    res.json(result);
  } catch (err) {
    console.error('Daily login error:', err);
    res.status(500).json({ error: 'Failed to process daily login' });
  }
});

export default router;
