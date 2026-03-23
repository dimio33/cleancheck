CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  total_ratings INT DEFAULT 0,
  locale VARCHAR(5) DEFAULT 'de',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  osm_id BIGINT UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  city VARCHAR(100),
  cuisine_type VARCHAR(100),
  clean_score DECIMAL(3,1) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  cleanliness SMALLINT CHECK(cleanliness BETWEEN 1 AND 5),
  smell SMALLINT CHECK(smell BETWEEN 1 AND 5),
  supplies SMALLINT CHECK(supplies BETWEEN 1 AND 5),
  condition SMALLINT CHECK(condition BETWEEN 1 AND 5),
  accessibility SMALLINT CHECK(accessibility BETWEEN 1 AND 5),
  overall_score DECIMAL(3,1),
  comment TEXT,
  visited_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rating_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating_id UUID REFERENCES ratings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name_de VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_de TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  criteria JSONB
);

CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, badge_id)
);

-- Indexes
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);
CREATE INDEX idx_ratings_restaurant ON ratings(restaurant_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_created ON ratings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_visited_at ON ratings(visited_at);
CREATE INDEX IF NOT EXISTS idx_rating_photos_rating ON rating_photos(rating_id);

-- Seed badges
INSERT INTO badges (slug, name_de, name_en, description_de, description_en, icon, criteria) VALUES
('first-flush', 'First Flush', 'First Flush', 'Erste Bewertung abgegeben', 'Submitted first rating', '🚽', '{"type": "rating_count", "threshold": 1}'),
('regular', 'Stammgast', 'Regular', '10 Bewertungen abgegeben', 'Submitted 10 ratings', '🧻', '{"type": "rating_count", "threshold": 10}'),
('inspector', 'Inspektor', 'Inspector', '50 Bewertungen abgegeben', 'Submitted 50 ratings', '🔍', '{"type": "rating_count", "threshold": 50}'),
('germophobe', 'Germophob', 'Germophobe', '100 Bewertungen abgegeben', 'Submitted 100 ratings', '🦠', '{"type": "rating_count", "threshold": 100}'),
('photographer', 'Fotograf', 'Photographer', '10 Fotos hochgeladen', 'Uploaded 10 photos', '📸', '{"type": "photo_count", "threshold": 10}'),
('city-scout', 'Stadtkundschafter', 'City Scout', 'In 5+ Städten bewertet', 'Rated in 5+ cities', '🗺️', '{"type": "city_count", "threshold": 5}'),
('streak-master', 'Streak Master', 'Streak Master', '7 Tage in Folge bewertet', 'Rated 7 days in a row', '🔥', '{"type": "streak", "threshold": 7}');
