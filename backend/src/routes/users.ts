import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { isValidUuid } from '../utils/validate';

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
      `SELECT id, username, avatar_url, total_ratings, locale, created_at
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
      cities_visited: string;
    }>(
      `SELECT
        COUNT(*) as total_ratings,
        COALESCE(AVG(r.overall_score), 0) as avg_score,
        COUNT(DISTINCT rest.city) as cities_visited
       FROM ratings r
       LEFT JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.user_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0] || { total_ratings: '0', avg_score: '0', cities_visited: '0' };

    res.json({
      user: userResult.rows[0],
      badges: badgesResult.rows,
      stats: {
        total_ratings: parseInt(stats.total_ratings || '0', 10),
        avg_score: Math.round(parseFloat(stats.avg_score || '0') * 10) / 10,
        cities_visited: parseInt(stats.cities_visited || '0', 10),
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

export default router;
