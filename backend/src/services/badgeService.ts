import { query } from '../utils/db';
import { notifyBadgeEarned } from './pushService';

interface Badge {
  id: string;
  slug: string;
  criteria: {
    type: string;
    threshold: number;
  };
}

interface AwardedBadge {
  slug: string;
  name_de: string;
  name_en: string;
  icon: string;
}

export async function checkAndAwardBadges(userId: string): Promise<AwardedBadge[]> {
  // Get all badges user doesn't have yet
  const badgesResult = await query<Badge>(
    `SELECT b.id, b.slug, b.criteria
     FROM badges b
     WHERE b.id NOT IN (
       SELECT badge_id FROM user_badges WHERE user_id = $1
     )`,
    [userId]
  );

  if (badgesResult.rows.length === 0) return [];

  // Get user stats
  const [ratingCount, photoCount, cityCount, streak] = await Promise.all([
    getUserRatingCount(userId),
    getUserPhotoCount(userId),
    getUserCityCount(userId),
    getUserStreak(userId),
  ]);

  const stats: Record<string, number> = {
    rating_count: ratingCount,
    photo_count: photoCount,
    city_count: cityCount,
    streak: streak,
  };

  const newBadges: AwardedBadge[] = [];

  for (const badge of badgesResult.rows) {
    try {
      if (!badge.criteria || typeof badge.criteria !== 'object') continue;
      const { type, threshold } = badge.criteria;
      if (!type || threshold === undefined) continue;

      const userValue = stats[type] ?? 0;

      if (userValue >= threshold) {
        await query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, badge.id]
        );

        const badgeInfo = await query<AwardedBadge>(
          `SELECT slug, name_de, name_en, icon FROM badges WHERE id = $1`,
          [badge.id]
        );

        if (badgeInfo.rows[0]) {
          newBadges.push(badgeInfo.rows[0]);
          notifyBadgeEarned(userId, badgeInfo.rows[0].name_de || badgeInfo.rows[0].slug).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`Badge check failed for ${badge.slug}:`, err);
    }
  }

  return newBadges;
}

async function getUserRatingCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ratings WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

async function getUserPhotoCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM rating_photos rp
     JOIN ratings r ON rp.rating_id = r.id
     WHERE r.user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

async function getUserCityCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT rest.city) as count
     FROM ratings r
     JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE r.user_id = $1 AND rest.city IS NOT NULL`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

async function getUserStreak(userId: string): Promise<number> {
  const result = await query<{ visited_at: string }>(
    `SELECT DISTINCT visited_at::text FROM ratings
     WHERE user_id = $1
     ORDER BY visited_at DESC
     LIMIT 30`,
    [userId]
  );

  if (result.rows.length === 0) return 0;

  let streak = 1;

  for (let i = 1; i < result.rows.length; i++) {
    // Compare date strings directly (YYYY-MM-DD format from pg)
    const currentDate = result.rows[i - 1].visited_at.split('T')[0];
    const previousDate = result.rows[i].visited_at.split('T')[0];
    const current = new Date(currentDate + 'T00:00:00Z');
    const previous = new Date(previousDate + 'T00:00:00Z');
    const diffMs = current.getTime() - previous.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
