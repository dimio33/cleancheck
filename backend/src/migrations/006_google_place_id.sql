-- Add google_place_id column to restaurants table with UNIQUE constraint
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE restaurants ADD CONSTRAINT uq_restaurants_google_place_id UNIQUE (google_place_id);
