import { query } from '../utils/db';

const MAX_LEVEL = 50;

// XP needed to go FROM level to level+1
function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5) / 10) * 10;
}

export function calculateLevel(xp: number): { level: number; xpInCurrentLevel: number; xpForNextLevel: number; progress: number } {
  let level = 1;
  let xpUsed = 0;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (xpUsed + needed > xp) {
      return {
        level,
        xpInCurrentLevel: xp - xpUsed,
        xpForNextLevel: needed,
        progress: (xp - xpUsed) / needed,
      };
    }
    xpUsed += needed;
    level++;
  }
  return { level: MAX_LEVEL, xpInCurrentLevel: 0, xpForNextLevel: 0, progress: 1 };
}

export function getRankTitle(level: number): { de: string; en: string } {
  if (level >= 45) return { de: 'WC-CleanCheck-Legende', en: 'WC-CleanCheck Legend' };
  if (level >= 35) return { de: 'Sauberkeits-Experte', en: 'Cleanliness Expert' };
  if (level >= 25) return { de: 'Hygiene-Meister', en: 'Hygiene Master' };
  if (level >= 15) return { de: 'Hygiene-Inspektor', en: 'Hygiene Inspector' };
  if (level >= 5) return { de: 'Stammgast', en: 'Regular' };
  return { de: 'Neuling', en: 'Newbie' };
}

export async function awardXp(
  userId: string,
  amount: number,
  source: string,
  referenceId?: string
): Promise<{ xp_gained: number; total_xp: number; level: number; rank: { de: string; en: string }; level_up: boolean; xpProgress: number; xpForNextLevel: number }> {
  // Insert XP event
  await query(
    `INSERT INTO xp_events (user_id, xp_amount, source, reference_id) VALUES ($1, $2, $3, $4)`,
    [userId, amount, source, referenceId || null]
  );

  // Update user XP
  const result = await query<{ xp: number; level: number }>(
    `UPDATE users SET xp = xp + $2 WHERE id = $1 RETURNING xp, level`,
    [userId, amount]
  );

  const newXp = result.rows[0]?.xp || 0;
  const oldLevel = result.rows[0]?.level || 1;
  const levelInfo = calculateLevel(newXp);
  const rank = getRankTitle(levelInfo.level);
  const levelUp = levelInfo.level > oldLevel;

  // Update level and rank if changed
  if (levelUp) {
    await query(
      `UPDATE users SET level = $2, rank_title = $3 WHERE id = $1`,
      [userId, levelInfo.level, rank.de]
    );
  }

  return {
    xp_gained: amount,
    total_xp: newXp,
    level: levelInfo.level,
    rank,
    level_up: levelUp,
    xpProgress: levelInfo.progress,
    xpForNextLevel: levelInfo.xpForNextLevel,
  };
}

export async function updateStreak(userId: string): Promise<number> {
  const userResult = await query<{ last_rating_date: string | null; current_streak: number; longest_streak: number }>(
    `SELECT last_rating_date, current_streak, longest_streak FROM users WHERE id = $1`,
    [userId]
  );

  const user = userResult.rows[0];
  if (!user) return 0;

  const today = new Date().toISOString().split('T')[0];
  const lastDate = user.last_rating_date ? new Date(user.last_rating_date).toISOString().split('T')[0] : null;

  let newStreak = user.current_streak;

  if (lastDate === today) {
    // Already rated today, no change
    return newStreak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDate === yesterdayStr) {
    newStreak = user.current_streak + 1;
  } else {
    newStreak = 1; // Reset streak
  }

  const longestStreak = Math.max(newStreak, user.longest_streak);

  await query(
    `UPDATE users SET current_streak = $2, longest_streak = $3, last_rating_date = $4 WHERE id = $1`,
    [userId, newStreak, longestStreak, today]
  );

  return newStreak;
}

export async function getDailyLoginBonus(userId: string): Promise<{ awarded: boolean; xp_gained: number; total_xp: number; streak: number }> {
  const today = new Date().toISOString().split('T')[0];

  const userResult = await query<{ last_daily_login: string | null; current_streak: number }>(
    `SELECT last_daily_login, current_streak FROM users WHERE id = $1`,
    [userId]
  );

  const user = userResult.rows[0];
  if (!user) return { awarded: false, xp_gained: 0, total_xp: 0, streak: 0 };

  const lastLogin = user.last_daily_login ? new Date(user.last_daily_login).toISOString().split('T')[0] : null;

  if (lastLogin === today) {
    // Already claimed today
    return { awarded: false, xp_gained: 0, total_xp: 0, streak: user.current_streak };
  }

  // Update last_daily_login
  await query(`UPDATE users SET last_daily_login = $2 WHERE id = $1`, [userId, today]);

  // Award 15 XP
  const result = await awardXp(userId, 15, 'daily_login');

  return {
    awarded: true,
    xp_gained: 15,
    total_xp: result.total_xp,
    streak: user.current_streak,
  };
}

export function getStreakBonus(streak: number): number {
  if (streak >= 7) return 5;
  return 0;
}
