import { query } from '../utils/db';

const WEIGHTS = {
  cleanliness: 0.35,
  smell: 0.25,
  supplies: 0.20,
  condition: 0.15,
  accessibility: 0.05,
};

export function calculateOverallScore(rating: {
  cleanliness: number;
  smell: number;
  supplies: number;
  condition: number;
  accessibility: number;
}): number {
  const score =
    rating.cleanliness * WEIGHTS.cleanliness +
    rating.smell * WEIGHTS.smell +
    rating.supplies * WEIGHTS.supplies +
    rating.condition * WEIGHTS.condition +
    rating.accessibility * WEIGHTS.accessibility;

  return Math.round(score * 10) / 10;
}

export async function recalculateRestaurantScore(restaurantId: string): Promise<number> {
  const result = await query<{
    overall_score: string;
    created_at: Date;
  }>(
    `SELECT overall_score, created_at FROM ratings WHERE restaurant_id = $1`,
    [restaurantId]
  );

  if (result.rows.length === 0) {
    await query(
      `UPDATE restaurants SET clean_score = 0, total_ratings = 0, updated_at = NOW() WHERE id = $1`,
      [restaurantId]
    );
    return 0;
  }

  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const row of result.rows) {
    const ageMs = now - new Date(row.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    let recencyWeight: number;
    if (ageDays <= 30) {
      recencyWeight = 1.0;
    } else if (ageDays <= 90) {
      recencyWeight = 0.8;
    } else {
      recencyWeight = 0.5;
    }

    const score = parseFloat(row.overall_score);
    weightedSum += score * recencyWeight;
    totalWeight += recencyWeight;
  }

  const cleanScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 10) / 10
    : 0;

  await query(
    `UPDATE restaurants SET clean_score = $1, total_ratings = $2, updated_at = NOW() WHERE id = $3`,
    [cleanScore, result.rows.length, restaurantId]
  );

  return cleanScore;
}
