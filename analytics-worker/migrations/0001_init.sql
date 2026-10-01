CREATE TABLE IF NOT EXISTS site_totals (
  id TEXT PRIMARY KEY,
  baseline_views INTEGER NOT NULL DEFAULT 0 CHECK (baseline_views >= 0),
  live_views INTEGER NOT NULL DEFAULT 0 CHECK (live_views >= 0),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO site_totals (id, baseline_views, live_views, updated_at)
VALUES ('global', 185054, 0, 0);

CREATE TABLE IF NOT EXISTS site_sessions (
  session_id TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  last_path TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_sessions_last_seen
ON site_sessions(last_seen);

CREATE TABLE IF NOT EXISTS site_session_pages (
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  PRIMARY KEY (session_id, path)
);

CREATE INDEX IF NOT EXISTS idx_site_session_pages_first_seen
ON site_session_pages(first_seen);

CREATE TABLE IF NOT EXISTS site_page_totals (
  path TEXT PRIMARY KEY,
  baseline_views INTEGER NOT NULL DEFAULT 0 CHECK (baseline_views >= 0),
  live_views INTEGER NOT NULL DEFAULT 0 CHECK (live_views >= 0),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO site_page_totals (path, baseline_views, live_views, updated_at) VALUES
  ('/', 16000, 0, 0),
  ('/education.html', 7865, 0, 0),
  ('/creator.html', 4520, 0, 0),
  ('/systems.html', 3240, 0, 0),
  ('/experiments.html', 2985, 0, 0),
  ('/PremLogin.html', 12480, 0, 0),
  ('/grok-premlogin.html', 10760, 0, 0),
  ('/Audio-Visualizer-3D/', 8420, 0, 0),
  ('/CyberSnake/', 7615, 0, 0),
  ('/Screenrecorder/', 15930, 0, 0),
  ('/SeatPlanner/', 17500, 0, 0),
  ('/Webcoding/', 23000, 0, 0),
  ('/YieldVitals/', 9260, 0, 0),
  ('/class/', 17280, 0, 0),
  ('/vote-platform/', 540, 0, 0),
  ('/school-scheduler/', 260, 0, 0),
  ('/class3d-gallery/', 1480, 0, 0),
  ('/class/exam.html', 5960, 0, 0),
  ('/class/pro.html', 8750, 0, 0),
  ('/polik-recovery/', 4360, 0, 0),
  ('/ytshort/', 6849, 0, 0);
