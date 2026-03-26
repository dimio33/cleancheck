-- 007_gamification.sql — Gamification: XP, levels, streaks, leaderboards, contests

-- Users table extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_title VARCHAR(50) DEFAULT 'Neuling';
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_rating_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_login DATE;

-- XP events audit trail
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  source VARCHAR(30) NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);

-- Weekly leaderboard
CREATE TABLE IF NOT EXISTS leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  city VARCHAR(100),
  rating_count INT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  UNIQUE(user_id, week_start, city)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON leaderboard_weekly(week_start, city, rating_count DESC);

-- First raters per restaurant
CREATE TABLE IF NOT EXISTS first_raters (
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rated_at TIMESTAMPTZ DEFAULT NOW()
);

-- City champions (monthly)
CREATE TABLE IF NOT EXISTS city_champions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  month DATE NOT NULL,
  rating_count INT DEFAULT 0,
  UNIQUE(city, month)
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(50) PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO feature_flags (key, enabled, config) VALUES
  ('monthly_contest', false, '{"prize_amount": 100, "currency": "EUR"}')
ON CONFLICT DO NOTHING;

-- Contests (hidden)
CREATE TABLE IF NOT EXISTS contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  month DATE NOT NULL,
  prize_amount DECIMAL(10,2),
  prize_currency VARCHAR(3) DEFAULT 'EUR',
  winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city, month)
);

CREATE TABLE IF NOT EXISTS contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating_count INT DEFAULT 0,
  UNIQUE(contest_id, user_id)
);

-- Retroactive XP for existing ratings (only if xp_events is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM xp_events LIMIT 1) THEN
    -- +50 XP per rating
    INSERT INTO xp_events (user_id, xp_amount, source, reference_id)
    SELECT r.user_id, 50, 'retroactive', r.id
    FROM ratings r WHERE r.user_id IS NOT NULL;

    -- +10 XP for ratings with comments
    INSERT INTO xp_events (user_id, xp_amount, source, reference_id)
    SELECT r.user_id, 10, 'retroactive_comment', r.id
    FROM ratings r
    WHERE r.user_id IS NOT NULL AND r.comment IS NOT NULL AND r.comment != '';

    -- Populate first_raters
    INSERT INTO first_raters (restaurant_id, user_id, rated_at)
    SELECT DISTINCT ON (restaurant_id) restaurant_id, user_id, created_at
    FROM ratings WHERE user_id IS NOT NULL
    ORDER BY restaurant_id, created_at ASC
    ON CONFLICT DO NOTHING;

    -- Update user XP totals
    UPDATE users SET xp = COALESCE((
      SELECT SUM(xp_amount) FROM xp_events WHERE xp_events.user_id = users.id
    ), 0);

    -- Update levels based on XP (simplified: level = floor(sqrt(xp / 50)) + 1, capped at 50)
    UPDATE users SET level = LEAST(
      GREATEST(1, FLOOR(SQRT(xp::float / 50)) + 1),
      50
    )::int
    WHERE xp > 0;

    -- Update rank titles
    UPDATE users SET rank_title = CASE
      WHEN level >= 45 THEN 'CleanCheck-Legende'
      WHEN level >= 35 THEN 'Sauberkeits-Experte'
      WHEN level >= 25 THEN 'Hygiene-Meister'
      WHEN level >= 15 THEN 'Hygiene-Inspektor'
      WHEN level >= 5 THEN 'Stammgast'
      ELSE 'Neuling'
    END
    WHERE xp > 0;
  END IF;
END $$;
