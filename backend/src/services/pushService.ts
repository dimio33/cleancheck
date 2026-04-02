import webPush from 'web-push';
import * as http2 from 'http2';
import * as crypto from 'crypto';
import { query } from '../utils/db';

const VAPID_PUBLIC_KEY = 'BAVq87Syx1MA7oIpSoxEG29kSz5No_kxWeryd7C4N8MYGZnzlBoj8H_7HdSS_JhEyzyq0T7Ay5EzeHNaSTk2cnM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:info@e-findo.de',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

// APNs configuration
const APNS_KEY_ID = process.env.APNS_KEY_ID || '';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || '';
const APNS_KEY = process.env.APNS_KEY || ''; // PEM key content (base64 or raw)
const APNS_TOPIC = 'com.efindo.cleancheck';
const APNS_HOST = 'api.push.apple.com'; // production

let apnsJwtToken: string | null = null;
let apnsJwtIssuedAt = 0;

function getApnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  // APNs tokens are valid for 1 hour, refresh after 50 minutes
  if (apnsJwtToken && now - apnsJwtIssuedAt < 3000) {
    return apnsJwtToken;
  }

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })).toString('base64url');
  const signingInput = `${header}.${claims}`;

  // Decode PEM key
  let keyData = APNS_KEY;
  // Handle base64-encoded key content
  if (!keyData.includes('BEGIN PRIVATE KEY')) {
    keyData = `-----BEGIN PRIVATE KEY-----\n${keyData}\n-----END PRIVATE KEY-----`;
  }

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const signature = sign.sign(keyData, 'base64url');

  apnsJwtToken = `${signingInput}.${signature}`;
  apnsJwtIssuedAt = now;
  return apnsJwtToken;
}

function sendApnsPush(deviceToken: string, payload: PushPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${APNS_HOST}`);

    client.on('error', (err) => {
      client.close();
      reject(err);
    });

    const apnsPayload = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: 'default',
        badge: 1,
      },
      url: payload.url || '/',
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${getApnsJwt()}`,
      'apns-topic': APNS_TOPIC,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });

    req.setEncoding('utf8');
    let responseData = '';
    let statusCode = 0;

    req.on('response', (headers) => {
      statusCode = headers[':status'] as number;
    });

    req.on('data', (chunk) => { responseData += chunk; });

    req.on('end', () => {
      client.close();
      if (statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`APNs ${statusCode}: ${responseData}`));
      }
    });

    req.write(apnsPayload);
    req.end();
  });
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

interface DeviceTokenRow {
  id: string;
  token: string;
  platform: string;
}

const apnsConfigured = !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_KEY);

/**
 * Send push notification to native devices via APNs.
 */
async function sendNativePushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!apnsConfigured) return;

  try {
    const result = await query<DeviceTokenRow>(
      `SELECT id, token, platform FROM device_tokens WHERE user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) return;

    await Promise.allSettled(
      result.rows.map(async (device) => {
        try {
          await sendApnsPush(device.token, payload);
        } catch (err: any) {
          const msg = err.message || '';
          // BadDeviceToken or Unregistered — remove stale token
          if (msg.includes('BadDeviceToken') || msg.includes('Unregistered') || msg.includes('410')) {
            await query(`DELETE FROM device_tokens WHERE id = $1`, [device.id]);
          } else {
            console.error(`APNs send failed for device ${device.id}:`, msg);
          }
        }
      }),
    );
  } catch (err) {
    console.error('sendNativePushToUser error (non-fatal):', err);
  }
}

/**
 * Send a push notification to all subscriptions for a given user.
 * Non-critical: catches all errors so it never breaks the main flow.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  // Send to web push subscriptions (if VAPID configured)
  if (VAPID_PRIVATE_KEY) {
    try {
      const result = await query<PushSubscriptionRow>(
        `SELECT id, endpoint, auth_key, p256dh_key FROM push_subscriptions WHERE user_id = $1`,
        [userId],
      );

      if (result.rows.length > 0) {
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
      }
    } catch (err) {
      console.error('sendPushToUser web-push error (non-fatal):', err);
    }
  }

  // Also send to native devices (APNs/FCM)
  await sendNativePushToUser(userId, payload);
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
