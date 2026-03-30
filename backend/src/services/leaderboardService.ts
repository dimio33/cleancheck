import { query } from '../utils/db';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return monday.toISOString().split('T')[0];
}

export async function updateLeaderboard(userId: string, city: string | null): Promise<void> {
  const weekStart = getWeekStart();
  const effectiveCity = city || 'unknown';

  await query(
    `INSERT INTO leaderboard_weekly (user_id, week_start, city, rating_count, xp_earned)
     VALUES ($1, $2, $3, 1, 50)
     ON CONFLICT (user_id, week_start, city)
     DO UPDATE SET rating_count = leaderboard_weekly.rating_count + 1, xp_earned = leaderboard_weekly.xp_earned + 50`,
    [userId, weekStart, effectiveCity]
  );
}

export async function getWeeklyLeaderboard(city?: string, limit = 10): Promise<any[]> {
  const weekStart = getWeekStart();

  let result;

  if (city) {
    result = await query(
      `SELECT lw.user_id, u.username, u.level, u.rank_title, lw.rating_count, lw.xp_earned
       FROM leaderboard_weekly lw
       JOIN users u ON lw.user_id = u.id
       WHERE lw.week_start = $1 AND lw.city = $2
       ORDER BY lw.rating_count DESC
       LIMIT $3`,
      [weekStart, city, limit]
    );
  } else {
    // Aggregate across all cities
    result = await query(
      `SELECT lw.user_id, u.username, u.level, u.rank_title,
              SUM(lw.rating_count)::int as rating_count, SUM(lw.xp_earned)::int as xp_earned
       FROM leaderboard_weekly lw
       JOIN users u ON lw.user_id = u.id
       WHERE lw.week_start = $1
       GROUP BY lw.user_id, u.username, u.level, u.rank_title
       ORDER BY rating_count DESC
       LIMIT $2`,
      [weekStart, limit]
    );
  }

  // Fallback: if leaderboard_weekly is empty, compute on-the-fly from ratings table
  if (result.rows.length === 0) {
    return getLeaderboardFromRatings(city, weekStart, limit);
  }

  return result.rows;
}

async function getLeaderboardFromRatings(city: string | undefined, weekStart: string, limit: number): Promise<any[]> {
  if (city) {
    const result = await query(
      `SELECT r.user_id, u.username, u.level, u.rank_title,
              COUNT(*)::int as rating_count, (COUNT(*) * 50)::int as xp_earned
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.user_id IS NOT NULL
         AND r.created_at >= $1::date
         AND rest.city = $2
       GROUP BY r.user_id, u.username, u.level, u.rank_title
       ORDER BY rating_count DESC
       LIMIT $3`,
      [weekStart, city, limit]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT r.user_id, u.username, u.level, u.rank_title,
            COUNT(*)::int as rating_count, (COUNT(*) * 50)::int as xp_earned
     FROM ratings r
     JOIN users u ON r.user_id = u.id
     WHERE r.user_id IS NOT NULL
       AND r.created_at >= $1::date
     GROUP BY r.user_id, u.username, u.level, u.rank_title
     ORDER BY rating_count DESC
     LIMIT $2`,
    [weekStart, limit]
  );
  return result.rows;
}

export async function getLeaderboardCities(): Promise<string[]> {
  const weekStart = getWeekStart();
  const result = await query<{ city: string }>(
    `SELECT DISTINCT city FROM leaderboard_weekly WHERE week_start = $1 AND city != 'unknown' ORDER BY city`,
    [weekStart]
  );

  // Fallback: if leaderboard_weekly has no cities, get from ratings + restaurants
  if (result.rows.length === 0) {
    const fallback = await query<{ city: string }>(
      `SELECT DISTINCT rest.city
       FROM ratings r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.user_id IS NOT NULL
         AND r.created_at >= $1::date
         AND rest.city IS NOT NULL AND rest.city != ''
       ORDER BY rest.city`,
      [weekStart]
    );
    return fallback.rows.map(r => r.city);
  }

  return result.rows.map(r => r.city);
}

export async function getUserRank(userId: string, city?: string): Promise<number | null> {
  const weekStart = getWeekStart();

  if (city) {
    let result = await query<{ rank: string }>(
      `SELECT rank FROM (
        SELECT user_id, RANK() OVER (ORDER BY rating_count DESC) as rank
        FROM leaderboard_weekly
        WHERE week_start = $1 AND city = $2
      ) ranked WHERE user_id = $3`,
      [weekStart, city, userId]
    );

    // Fallback: compute from ratings table
    if (!result.rows[0]) {
      result = await query<{ rank: string }>(
        `SELECT rank FROM (
          SELECT r.user_id, RANK() OVER (ORDER BY COUNT(*) DESC) as rank
          FROM ratings r
          JOIN restaurants rest ON r.restaurant_id = rest.id
          WHERE r.user_id IS NOT NULL
            AND r.created_at >= $1::date
            AND rest.city = $2
          GROUP BY r.user_id
        ) ranked WHERE user_id = $3`,
        [weekStart, city, userId]
      );
    }

    return result.rows[0] ? parseInt(result.rows[0].rank) : null;
  }

  let result = await query<{ rank: string }>(
    `SELECT rank FROM (
      SELECT user_id, RANK() OVER (ORDER BY SUM(rating_count) DESC) as rank
      FROM leaderboard_weekly
      WHERE week_start = $1
      GROUP BY user_id
    ) ranked WHERE user_id = $2`,
    [weekStart, userId]
  );

  // Fallback: compute from ratings table
  if (!result.rows[0]) {
    result = await query<{ rank: string }>(
      `SELECT rank FROM (
        SELECT r.user_id, RANK() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM ratings r
        WHERE r.user_id IS NOT NULL
          AND r.created_at >= $1::date
        GROUP BY r.user_id
      ) ranked WHERE user_id = $2`,
      [weekStart, userId]
    );
  }

  return result.rows[0] ? parseInt(result.rows[0].rank) : null;
}
