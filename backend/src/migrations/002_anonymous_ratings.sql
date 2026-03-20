-- Allow anonymous ratings by making user_id nullable
ALTER TABLE ratings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;
ALTER TABLE ratings ADD CONSTRAINT ratings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add anonymous_id column for device fingerprint
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS anonymous_id VARCHAR(30);

-- Index for anonymous duplicate check
CREATE INDEX IF NOT EXISTS idx_ratings_anonymous ON ratings(anonymous_id, restaurant_id, visited_at);
