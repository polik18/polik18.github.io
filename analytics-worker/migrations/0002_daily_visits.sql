CREATE TABLE IF NOT EXISTS site_daily_visits (
  visit_day TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  PRIMARY KEY (visit_day, visitor_id, path)
);

CREATE INDEX IF NOT EXISTS idx_site_daily_visits_day
ON site_daily_visits(visit_day);

CREATE TABLE IF NOT EXISTS site_daily_totals (
  visit_day TEXT PRIMARY KEY,
  total_visits INTEGER NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS site_daily_page_totals (
  visit_day TEXT NOT NULL,
  path TEXT NOT NULL,
  total_visits INTEGER NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (visit_day, path)
);
