import webPush from 'web-push';
import { query } from '../utils/db';

const VAPID_PUBLIC_KEY = 'BBlRxqegdm7V_XIZ7tOFTg62pw2sPH1IhD9Cblg-xcEh10u3ENdxb_DIOLNNZrnMnuR_HuYCdzxXrffOdwheQfo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:info@e-findo.de',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  auth_key: string;
  p256dh_key: string;
}

/**
 * Send a push notification to all subscriptions for a given user.
 * Non-critical: catches all errors so it never breaks the main flow.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PRIVATE_KEY) {
    return; // Push not configured
  }

  try {
    const result = await query<PushSubscriptionRow>(
      `SELECT id, endpoint, auth_key, p256dh_key FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) return;

    const payloadStr = JSON.stringify(payload);

    await Promise.allSettled(
      result.rows.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.auth_key,
                p256dh: sub.p256dh_key,
              },
            },
            payloadStr,
          );
        } catch (err: any) {
          // 404 or 410 means the subscription is expired/invalid — remove it
          if (err.statusCode === 404 || err.statusCode === 410) {
            await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
          } else {
            console.error(`Push send failed for subscription ${sub.id}:`, err.message || err);
          }
        }
      }),
    );
  } catch (err) {
    console.error('sendPushToUser error (non-fatal):', err);
  }
}

/**
 * Notify the rating author that the restaurant owner replied.
 */
export async function notifyOwnerReply(ratingUserId: string, restaurantName: string): Promise<void> {
  await sendPushToUser(ratingUserId, {
    title: 'Antwort erhalten',
    body: `Der Inhaber von ${restaurantName} hat auf Ihre Bewertung geantwortet`,
    url: '/profile',
  });
}

/**
 * Notify a user when their rating reaches an upvote milestone.
 */
export async function notifyUpvoteMilestone(ratingUserId: string, count: number): Promise<void> {
  await sendPushToUser(ratingUserId, {
    title: 'Deine Bewertung ist beliebt!',
    body: `Deine Bewertung hat ${count} Hilfreich-Stimmen erreicht`,
    url: '/profile',
  });
}

/**
 * Notify a user when they earn a new badge.
 */
export async function notifyBadgeEarned(userId: string, badgeName: string): Promise<void> {
  await sendPushToUser(userId, {
    title: 'Neues Abzeichen!',
    body: `Neues Abzeichen: ${badgeName}`,
    url: '/profile',
  });
}
