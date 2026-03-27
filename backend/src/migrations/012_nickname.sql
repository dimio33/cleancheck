-- Nickname feature: track username changes + flag social login users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_nickname BOOLEAN DEFAULT false;
