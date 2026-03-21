-- Migration 003: Add NOT NULL constraints on critical columns
-- These columns should never be NULL in practice

-- Ratings must always reference a restaurant
UPDATE ratings SET restaurant_id = (SELECT id FROM restaurants LIMIT 1) WHERE restaurant_id IS NULL;
ALTER TABLE ratings ALTER COLUMN restaurant_id SET NOT NULL;

-- Rating criteria should always have values
UPDATE ratings SET cleanliness = 3 WHERE cleanliness IS NULL;
UPDATE ratings SET smell = 3 WHERE smell IS NULL;
UPDATE ratings SET supplies = 3 WHERE supplies IS NULL;
UPDATE ratings SET condition = 3 WHERE condition IS NULL;
UPDATE ratings SET accessibility = 3 WHERE accessibility IS NULL;
UPDATE ratings SET overall_score = 3.0 WHERE overall_score IS NULL;

ALTER TABLE ratings ALTER COLUMN cleanliness SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN smell SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN supplies SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN condition SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN accessibility SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN overall_score SET NOT NULL;

-- Photos must reference a rating
DELETE FROM rating_photos WHERE rating_id IS NULL;
ALTER TABLE rating_photos ALTER COLUMN rating_id SET NOT NULL;
