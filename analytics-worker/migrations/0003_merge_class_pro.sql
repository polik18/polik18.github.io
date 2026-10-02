-- pro.html 已由正式入口 /class/ 取代；保留並合併既有歷史與真實統計。
INSERT OR IGNORE INTO site_page_totals (path, baseline_views, live_views, updated_at)
VALUES ('/class/', 0, 0, 0);

UPDATE site_page_totals
SET baseline_views = baseline_views + COALESCE((
      SELECT baseline_views FROM site_page_totals WHERE path = '/class/pro.html'
    ), 0),
    live_views = live_views + COALESCE((
      SELECT live_views FROM site_page_totals WHERE path = '/class/pro.html'
    ), 0),
    updated_at = MAX(updated_at, COALESCE((
      SELECT updated_at FROM site_page_totals WHERE path = '/class/pro.html'
    ), 0))
WHERE path = '/class/';

INSERT INTO site_daily_page_totals (visit_day, path, total_visits, updated_at)
SELECT visit_day, '/class/', total_visits, updated_at
FROM site_daily_page_totals
WHERE path = '/class/pro.html'
ON CONFLICT(visit_day, path) DO UPDATE SET
  total_visits = total_visits + excluded.total_visits,
  updated_at = MAX(updated_at, excluded.updated_at);

INSERT OR IGNORE INTO site_session_pages (session_id, path, first_seen)
SELECT session_id, '/class/', first_seen
FROM site_session_pages
WHERE path = '/class/pro.html';

INSERT OR IGNORE INTO site_daily_visits (visit_day, visitor_id, path, first_seen)
SELECT visit_day, visitor_id, '/class/', first_seen
FROM site_daily_visits
WHERE path = '/class/pro.html';

UPDATE site_sessions
SET last_path = '/class/'
WHERE last_path = '/class/pro.html';

DELETE FROM site_daily_page_totals WHERE path = '/class/pro.html';
DELETE FROM site_session_pages WHERE path = '/class/pro.html';
DELETE FROM site_daily_visits WHERE path = '/class/pro.html';
DELETE FROM site_page_totals WHERE path = '/class/pro.html';
