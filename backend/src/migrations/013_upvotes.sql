CREATE TABLE IF NOT EXISTS rating_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rating_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_rating_upvotes_rating ON rating_upvotes(rating_id);
CREATE INDEX IF NOT EXISTS idx_rating_upvotes_user ON rating_upvotes(user_id);
