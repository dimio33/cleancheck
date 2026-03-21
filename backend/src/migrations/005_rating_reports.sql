-- Migration 005: Rating reports for spam/abuse flagging
CREATE TABLE IF NOT EXISTS rating_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating_id UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  reporter_ip VARCHAR(64),
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('spam', 'offensive', 'incorrect', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rating_reports_rating ON rating_reports(rating_id);
CREATE INDEX idx_rating_reports_ip ON rating_reports(reporter_ip, created_at);
