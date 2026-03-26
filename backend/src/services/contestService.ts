import { query } from '../utils/db';

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const result = await query<{ enabled: boolean }>(
    'SELECT enabled FROM feature_flags WHERE key = $1',
    [key]
  );
  return result.rows[0]?.enabled === true;
}

export async function getActiveContests(): Promise<any[]> {
  if (!await isFeatureEnabled('monthly_contest')) return [];
  const result = await query(
    `SELECT * FROM contests WHERE status = 'active' ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function updateContestEntry(userId: string, city: string): Promise<void> {
  if (!await isFeatureEnabled('monthly_contest')) return;
  const month = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

  const contest = await query<{ id: string }>(
    `SELECT id FROM contests WHERE city = $1 AND month = $2 AND status = 'active'`,
    [city, month]
  );

  if (contest.rows.length === 0) return;

  await query(
    `INSERT INTO contest_entries (contest_id, user_id, rating_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (contest_id, user_id)
     DO UPDATE SET rating_count = contest_entries.rating_count + 1`,
    [contest.rows[0].id, userId]
  );
}
