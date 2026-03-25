-- Add google_place_id column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants (google_place_id) WHERE google_place_id IS NOT NULL;
