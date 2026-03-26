-- Rewards catalog
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(30) NOT NULL, -- 'digital' or 'voucher'
  name_de VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_de TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  unlock_level INT,
  unlock_type VARCHAR(30) DEFAULT 'level',
  unlock_threshold INT,
  voucher_value DECIMAL(10,2),
  voucher_currency VARCHAR(3) DEFAULT 'EUR',
  partner_name VARCHAR(200),
  max_claims INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User claimed rewards
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  redeem_code VARCHAR(50),
  UNIQUE(user_id, reward_id)
);

-- Seed digital rewards (active by default)
INSERT INTO rewards (type, name_de, name_en, description_de, description_en, icon, unlock_level, unlock_type, unlock_threshold, active) VALUES
  ('digital', 'Bronze-Rahmen', 'Bronze Frame', 'Bronzener Avatar-Rahmen', 'Bronze avatar frame', '🥉', 5, 'level', 5, true),
  ('digital', 'Silber-Rahmen', 'Silver Frame', 'Silberner Avatar-Rahmen', 'Silver avatar frame', '🥈', 10, 'level', 10, true),
  ('digital', 'Gold-Rahmen', 'Gold Frame', 'Goldener Avatar-Rahmen', 'Gold avatar frame', '🥇', 15, 'level', 15, true),
  ('digital', 'Custom Titel', 'Custom Title', 'Wähle deinen eigenen Titel', 'Choose your own title', '✏️', 20, 'level', 20, true),
  ('digital', 'Diamant-Rahmen', 'Diamond Frame', 'Diamantener Avatar-Rahmen mit Glitzer', 'Diamond avatar frame with sparkle', '💎', 25, 'level', 25, true),
  ('digital', 'Animiertes Profil', 'Animated Profile', 'Animierter Profil-Hintergrund', 'Animated profile background', '✨', 30, 'level', 30, true),
  ('digital', 'Legendärer Rahmen', 'Legendary Frame', 'Legendärer Avatar-Rahmen mit Flammen', 'Legendary avatar frame with flames', '🔥', 40, 'level', 40, true)
ON CONFLICT DO NOTHING;

-- Voucher rewards (inactive by default — activated when partners are ready)
INSERT INTO rewards (type, name_de, name_en, description_de, description_en, icon, unlock_level, unlock_type, unlock_threshold, voucher_value, voucher_currency, active) VALUES
  ('voucher', '5€ Restaurant-Gutschein', '€5 Restaurant Voucher', 'Einlösbar bei Partner-Restaurants', 'Redeemable at partner restaurants', '🎫', 15, 'level', 15, 5.00, 'EUR', false),
  ('voucher', '10€ Restaurant-Gutschein', '€10 Restaurant Voucher', 'Einlösbar bei Partner-Restaurants', 'Redeemable at partner restaurants', '🎟️', 25, 'level', 25, 10.00, 'EUR', false),
  ('voucher', '25€ Restaurant-Gutschein', '€25 Restaurant Voucher', 'Einlösbar bei Partner-Restaurants', 'Redeemable at partner restaurants', '🏆', 40, 'level', 40, 25.00, 'EUR', false)
ON CONFLICT DO NOTHING;
