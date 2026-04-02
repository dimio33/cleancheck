import { query } from '../utils/db';
import { sendPushToUser } from './pushService';

/**
 * Automated push notifications — runs daily via cron.
 * Max 1 push per user per day.
 */

interface UserRow {
  id: string;
  username: string;
}

interface NotifiableUser extends UserRow {
  last_rating_at: string | null;
  rating_count: number;
  streak: number;
}

/** Check if user already received a push today */
async function alreadyNotifiedToday(userId: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM push_notification_log
     WHERE user_id = $1 AND sent_at > NOW() - INTERVAL '24 hours'`,
    [userId],
  );
  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

/** Log that we sent a notification */
async function logNotification(userId: string, type: string): Promise<void> {
  await query(
    `INSERT INTO push_notification_log (user_id, notification_type) VALUES ($1, $2)`,
    [userId, type],
  );
}

/** Check if this specific type was sent recently (avoid repeating same message) */
async function wasRecentlySent(userId: string, type: string, days: number): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM push_notification_log
     WHERE user_id = $1 AND notification_type = $2 AND sent_at > NOW() - INTERVAL '${days} days'`,
    [userId, type],
  );
  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

// ─── Notification Types ───────────────────────────────────────────────

async function checkReEngagement(user: NotifiableUser): Promise<boolean> {
  if (!user.last_rating_at) return false;

  const lastRating = new Date(user.last_rating_at);
  const daysSince = Math.floor((Date.now() - lastRating.getTime()) / (1000 * 60 * 60 * 24));

  // 7 days inactive
  if (daysSince >= 7 && daysSince < 14) {
    if (await wasRecentlySent(user.id, 're-engagement-7', 7)) return false;
    await sendPushToUser(user.id, {
      title: 'Warst du in letzter Zeit essen? 🍽️',
      body: 'Bewerte dein letztes Restaurant und hilf anderen!',
      url: '/',
    });
    await logNotification(user.id, 're-engagement-7');
    return true;
  }

  // 30 days inactive
  if (daysSince >= 30) {
    if (await wasRecentlySent(user.id, 're-engagement-30', 30)) return false;
    await sendPushToUser(user.id, {
      title: 'Wir vermissen dich!',
      body: 'Dein nächstes Restaurant wartet auf deine Bewertung.',
      url: '/',
    });
    await logNotification(user.id, 're-engagement-30');
    return true;
  }

  return false;
}

async function checkStreakReminder(user: NotifiableUser): Promise<boolean> {
  if (user.streak < 2) return false;

  // Check if last rating was yesterday (streak would break today if no rating)
  if (!user.last_rating_at) return false;
  const lastRating = new Date(user.last_rating_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = new Date(lastRating);
  lastDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Last rating was yesterday → streak breaks today if they don't rate
  if (diffDays === 1) {
    if (await wasRecentlySent(user.id, 'streak-reminder', 1)) return false;
    await sendPushToUser(user.id, {
      title: `Dein ${user.streak}-Tage-Streak läuft ab!`,
      body: 'Bewerte heute noch ein Restaurant um deinen Streak zu halten.',
      url: '/',
    });
    await logNotification(user.id, 'streak-reminder');
    return true;
  }

  return false;
}

async function checkBadgeProgress(user: NotifiableUser): Promise<boolean> {
  if (await wasRecentlySent(user.id, 'badge-progress', 3)) return false;

  // Find next unearned badge based on rating count
  const ratingBadges = [
    { threshold: 1, name: 'Erstinspektor' },
    { threshold: 10, name: 'Stammgast' },
    { threshold: 50, name: 'Inspektor' },
    { threshold: 100, name: 'Hygienefanatiker' },
  ];

  for (const badge of ratingBadges) {
    if (user.rating_count < badge.threshold) {
      const remaining = badge.threshold - user.rating_count;
      // Only notify if close (within 3 or 50% done)
      if (remaining <= 3 || user.rating_count >= badge.threshold * 0.5) {
        await sendPushToUser(user.id, {
          title: `Nur noch ${remaining} Bewertung${remaining === 1 ? '' : 'en'}!`,
          body: `Noch ${remaining} bis zum "${badge.name}" Badge.`,
          url: '/profile',
        });
        await logNotification(user.id, 'badge-progress');
        return true;
      }
      break;
    }
  }

  return false;
}

// ─── Score Update (triggered per rating, not cron) ────────────────────

/**
 * Notify users who previously rated a restaurant when its score changes significantly.
 * Call this after a new rating is submitted.
 */
export async function notifyScoreChange(restaurantId: string, restaurantName: string, newScore: number, oldScore: number): Promise<void> {
  const scoreDiff = Math.abs(newScore - oldScore);
  if (scoreDiff < 0.3) return; // Only notify on significant changes

  try {
    // Find users who rated this restaurant (exclude the user who just rated)
    const result = await query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM ratings WHERE restaurant_id = $1`,
      [restaurantId],
    );

    const direction = newScore > oldScore ? 'gestiegen' : 'gesunken';
    const arrow = newScore > oldScore ? '📈' : '📉';

    for (const row of result.rows) {
      if (await alreadyNotifiedToday(row.user_id)) continue;

      await sendPushToUser(row.user_id, {
        title: `${restaurantName} ${arrow}`,
        body: `CleanScore ist auf ${newScore.toFixed(1)} ${direction}.`,
        url: '/',
      });
      await logNotification(row.user_id, 'score-change');
    }
  } catch (err) {
    console.error('notifyScoreChange error (non-fatal):', err);
  }
}

// ─── Main Cron Job ────────────────────────────────────────────────────

export async function runScheduledPushNotifications(): Promise<void> {
  console.log('[ScheduledPush] Starting automated push notifications...');

  try {
    // Get all users who have push subscriptions or device tokens
    const users = await query<NotifiableUser>(
      `SELECT DISTINCT u.id, u.username,
        (SELECT MAX(r.created_at) FROM ratings r WHERE r.user_id = u.id) as last_rating_at,
        (SELECT COUNT(*) FROM ratings r WHERE r.user_id = u.id)::int as rating_count,
        0 as streak
       FROM users u
       WHERE u.id IN (
         SELECT user_id FROM push_subscriptions
         UNION
         SELECT user_id FROM device_tokens
       )`,
    );

    if (users.rows.length === 0) {
      console.log('[ScheduledPush] No users with push enabled.');
      return;
    }

    // Calculate streaks for each user
    for (const user of users.rows) {
      const streakResult = await query<{ visited_at: string }>(
        `SELECT DISTINCT visited_at::text FROM ratings
         WHERE user_id = $1
         ORDER BY visited_at DESC
         LIMIT 30`,
        [user.id],
      );

      if (streakResult.rows.length > 0) {
        let streak = 1;
        for (let i = 1; i < streakResult.rows.length; i++) {
          const currentDate = streakResult.rows[i - 1].visited_at.split('T')[0];
          const previousDate = streakResult.rows[i].visited_at.split('T')[0];
          const current = new Date(currentDate + 'T00:00:00Z');
          const previous = new Date(previousDate + 'T00:00:00Z');
          const diffDays = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) streak++;
          else break;
        }
        user.streak = streak;
      }
    }

    let sent = 0;

    for (const user of users.rows) {
      if (await alreadyNotifiedToday(user.id)) continue;

      // Priority order: streak > re-engagement > badge progress
      if (await checkStreakReminder(user)) { sent++; continue; }
      if (await checkReEngagement(user)) { sent++; continue; }
      if (await checkBadgeProgress(user)) { sent++; continue; }
    }

    console.log(`[ScheduledPush] Done. Sent ${sent} notifications to ${users.rows.length} eligible users.`);
  } catch (err) {
    console.error('[ScheduledPush] Error:', err);
  }
}
