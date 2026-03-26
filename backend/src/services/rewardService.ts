import { query } from '../utils/db';
import { calculateLevel } from './xpService';
import crypto from 'crypto';

interface Reward {
  id: string;
  type: string;
  name_de: string;
  name_en: string;
  description_de: string;
  description_en: string;
  icon: string;
  unlock_level: number;
  unlock_type: string;
  unlock_threshold: number;
  voucher_value: number | null;
  voucher_currency: string;
  partner_name: string | null;
  max_claims: number | null;
  active: boolean;
}

export async function getAvailableRewards(userId: string): Promise<{ unlocked: any[]; locked: any[]; claimed: any[] }> {
  // Get user stats
  const userResult = await query<{ xp: number; level: number }>(
    'SELECT xp, level FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return { unlocked: [], locked: [], claimed: [] };

  const levelInfo = calculateLevel(user.xp || 0);

  // Get all active rewards
  const rewardsResult = await query<Reward>(
    'SELECT * FROM rewards WHERE active = true ORDER BY unlock_threshold ASC'
  );

  // Get user's claimed rewards
  const claimedResult = await query<{ reward_id: string; claimed_at: string; redeemed_at: string | null; redeem_code: string | null }>(
    'SELECT reward_id, claimed_at, redeemed_at, redeem_code FROM user_rewards WHERE user_id = $1',
    [userId]
  );
  const claimedMap = new Map(claimedResult.rows.map(r => [r.reward_id, r]));

  const unlocked: any[] = [];
  const locked: any[] = [];
  const claimed: any[] = [];

  for (const reward of rewardsResult.rows) {
    const claimInfo = claimedMap.get(reward.id);

    if (claimInfo) {
      claimed.push({ ...reward, ...claimInfo });
    } else if (levelInfo.level >= reward.unlock_threshold) {
      unlocked.push(reward);
    } else {
      locked.push({ ...reward, levels_remaining: reward.unlock_threshold - levelInfo.level });
    }
  }

  return { unlocked, locked, claimed };
}

export async function claimReward(userId: string, rewardId: string): Promise<{ success: boolean; error?: string; redeem_code?: string }> {
  // Check reward exists and is active
  const rewardResult = await query<Reward>(
    'SELECT * FROM rewards WHERE id = $1 AND active = true',
    [rewardId]
  );
  if (rewardResult.rows.length === 0) return { success: false, error: 'Reward not found' };
  const reward = rewardResult.rows[0];

  // Check not already claimed
  const existingClaim = await query(
    'SELECT id FROM user_rewards WHERE user_id = $1 AND reward_id = $2',
    [userId, rewardId]
  );
  if (existingClaim.rows.length > 0) return { success: false, error: 'Already claimed' };

  // Check max claims
  if (reward.max_claims) {
    const claimCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM user_rewards WHERE reward_id = $1',
      [rewardId]
    );
    if (parseInt(claimCount.rows[0].count) >= reward.max_claims) {
      return { success: false, error: 'Reward fully claimed' };
    }
  }

  // Check user meets unlock criteria
  const userResult = await query<{ xp: number }>(
    'SELECT xp FROM users WHERE id = $1',
    [userId]
  );
  const levelInfo = calculateLevel(userResult.rows[0]?.xp || 0);
  if (levelInfo.level < reward.unlock_threshold) {
    return { success: false, error: 'Level too low' };
  }

  // Generate redeem code for vouchers
  const redeemCode = reward.type === 'voucher'
    ? `CC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    : null;

  await query(
    'INSERT INTO user_rewards (user_id, reward_id, redeem_code) VALUES ($1, $2, $3)',
    [userId, rewardId, redeemCode]
  );

  return { success: true, redeem_code: redeemCode || undefined };
}
