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

// PATCH /api/users/username — change username (1x pro Monat)
router.patch('/username', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const sanitized = username.replace(/<[^>]*>/g, '').trim();
    if (sanitized.length < 3 || sanitized.length > 30) {
      res.status(400).json({ error: 'Username muss zwischen 3 und 30 Zeichen lang sein' });
      return;
    }

    // Check cooldown (30 days) — skip if needs_nickname is true (first-time social login)
    const userResult = await query<{ last_username_change: Date | null; needs_nickname: boolean }>(
      'SELECT last_username_change, needs_nickname FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { last_username_change, needs_nickname } = userResult.rows[0];

    if (!needs_nickname && last_username_change) {
      const daysSince = (Date.now() - new Date(last_username_change).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        const daysLeft = Math.ceil(30 - daysSince);
        res.status(429).json({ error: `Du kannst deinen Namen erst in ${daysLeft} Tagen wieder ändern` });
        return;
      }
    }

    // Check uniqueness
    const existing = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [sanitized, req.user.id]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Dieser Name ist bereits vergeben' });
      return;
    }

    await query(
      'UPDATE users SET username = $1, last_username_change = NOW(), needs_nickname = false WHERE id = $2',
      [sanitized, req.user.id]
    );

    res.json({ username: sanitized });
  } catch (err) {
    console.error('Update username error:', err);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// DELETE /api/users/:id — delete own account (DSGVO Art. 17)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id as string)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    // Only allow deleting own account
    if (!req.user || req.user.id !== id) {
      res.status(403).json({ error: 'Du kannst nur deinen eigenen Account löschen' });
      return;
    }

    // Delete all related data in correct order (foreign key dependencies)
    await query('DELETE FROM user_rewards WHERE user_id = $1', [id]);
    await query(
      `DELETE FROM rating_photos WHERE rating_id IN (SELECT id FROM ratings WHERE user_id = $1)`,
      [id]
    );
    await query('DELETE FROM ratings WHERE user_id = $1', [id]);
    await query('DELETE FROM xp_events WHERE user_id = $1', [id]);
    await query('DELETE FROM user_badges WHERE user_id = $1', [id]);
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    await query('DELETE FROM first_raters WHERE user_id = $1', [id]);
    await query('DELETE FROM leaderboard_weekly WHERE user_id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);

    console.log(JSON.stringify({
      action: 'account_deleted',
      user_id: id,
      timestamp: new Date().toISOString(),
    }));

    res.json({ message: 'Account gelöscht' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/users/:id/data-export — export all user data (DSGVO Art. 20)
router.get('/:id/data-export', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id as string)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    // Only allow exporting own data
    if (!req.user || req.user.id !== id) {
      res.status(403).json({ error: 'Du kannst nur deine eigenen Daten exportieren' });
      return;
    }

    const userResult = await query(
      `SELECT username, email, locale, created_at, xp, level, current_streak, longest_streak
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const ratingsResult = await query(
      `SELECT r.cleanliness, r.smell, r.supplies, r.condition, r.ambiente, r.accessibility,
              r.overall_score, r.comment, r.visited_at, r.created_at,
              rest.name as restaurant_name
       FROM ratings r
       LEFT JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const badgesResult = await query(
      `SELECT b.slug, b.name_de, b.name_en, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [id]
    );

    const xpEventsResult = await query(
      `SELECT xp_amount, event_type, created_at
       FROM xp_events WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: userResult.rows[0],
      ratings: ratingsResult.rows,
      badges: badgesResult.rows,
      xp_events: xpEventsResult.rows,
    };

    res.setHeader('Content-Disposition', 'attachment; filename="meine-daten.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    console.error('Data export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
