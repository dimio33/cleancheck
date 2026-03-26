-- Allow password-less accounts (for social login users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add social login columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Index for fast social login lookup
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(auth_provider, provider_id) WHERE provider_id IS NOT NULL;

-- Allow same email with different providers (but unique per provider)
-- Note: email is already UNIQUE, which is fine -- we link by email across providers
