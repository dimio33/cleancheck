-- Add ambiente criterion to ratings
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS ambiente SMALLINT CHECK(ambiente BETWEEN 1 AND 5);
