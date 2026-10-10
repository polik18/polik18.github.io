const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

const TRACKED_PATHS = new Set([
  '/',
  '/education.html',
  '/creator.html',
  '/systems.html',
  '/experiments.html',
  '/PremLogin.html',
  '/grok-premlogin.html',
  '/chatgpt-premlogin.html',
  '/Audio-Visualizer-3D/',
  '/CyberSnake/',
  '/Screenrecorder/',
  '/SeatPlanner/',
  '/Webcoding/',
  '/YieldVitals/',
  '/class/',
  '/vote-platform/',
  '/school-scheduler/',
  '/class3d-gallery/',
  '/class/exam.html',
  '/polik-recovery/',
  '/ytshort/'
]);

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('site-stats error', error);
      return jsonResponse({ error: 'internal_error' }, 500, request, env);
    }
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return corsPreflight(request, env);

  if (url.pathname === '/api/stats' && request.method === 'GET') {
    return readStats(request, env);
  }

  if (url.pathname === '/api/stats/pages' && request.method === 'GET') {
    return readPageStats(request, env);
  }

  if (url.pathname === '/api/stats' && request.method === 'POST') {
    if (!isAllowedBrowserOrigin(request, env)) {
      return jsonResponse({ error: 'origin_not_allowed' }, 403, request, env);
    }
    return recordActivity(request, env);
  }

  if (url.pathname === '/health' && request.method === 'GET') {
    return jsonResponse({ ok: true, service: 'polik-site-stats-api' }, 200, request, env);
  }

  return jsonResponse({ error: 'not_found' }, 404, request, env);
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function isAllowedBrowserOrigin(request, env) {
  const origin = request.headers.get('origin');
  return Boolean(origin && allowedOrigins(env).includes(origin));
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const headers = {
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

function corsPreflight(request, env) {
  if (!isAllowedBrowserOrigin(request, env)) {
    return new Response(null, { status: 403, headers: { vary: 'Origin' } });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function jsonResponse(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request, env) }
  });
}

function normalizePath(value) {
  if (typeof value !== 'string') return null;
  let path;
  try {
    path = new URL(value, 'https://polik18.github.io').pathname;
  } catch {
    return null;
  }
  if (path === '/index.html') path = '/';
  return TRACKED_PATHS.has(path) ? path : null;
}

function validSessionId(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function taipeiDay(timestamp = Date.now()) {
  return new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function parseBody(request) {
  try {
    return JSON.parse(await request.text());
  } catch {
    return null;
  }
}

async function recordActivity(request, env) {
  const body = await parseBody(request);
  const sessionId = body?.sessionId;
  // visitorId is stable across tabs so "online" approximates browsers rather than open tabs.
  // The fallback keeps the first cached tracker version compatible during rollout.
  const visitorId = body?.visitorId || sessionId;
  const path = normalizePath(body?.path);
  const event = body?.event === 'heartbeat' ? 'heartbeat' : 'pageview';

  if (!validSessionId(visitorId) || !validSessionId(sessionId) || !path) {
    return jsonResponse({ error: 'invalid_activity' }, 400, request, env);
  }

  const now = Date.now();
  const today = taipeiDay(now);
  await env.DB.prepare(`
    INSERT INTO site_sessions (session_id, first_seen, last_seen, last_path)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      last_seen = excluded.last_seen,
      last_path = excluded.last_path
  `).bind(visitorId, now, now, path).run();

  if (event === 'pageview') {
    const [pageInserted, dailyInserted] = await Promise.all([
      env.DB.prepare(`
      INSERT OR IGNORE INTO site_session_pages (session_id, path, first_seen)
      VALUES (?, ?, ?)
      `).bind(sessionId, path, now).run(),
      env.DB.prepare(`
        INSERT OR IGNORE INTO site_daily_visits (visit_day, visitor_id, path, first_seen)
        VALUES (?, ?, ?, ?)
      `).bind(today, visitorId, path, now).run()
    ]);

    if (Number(pageInserted.meta?.changes || 0) === 1) {
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE site_totals
          SET live_views = live_views + 1, updated_at = ?
          WHERE id = 'global'
        `).bind(now),
        env.DB.prepare(`
          INSERT INTO site_page_totals (path, baseline_views, live_views, updated_at)
          VALUES (?, 0, 1, ?)
          ON CONFLICT(path) DO UPDATE SET
            live_views = live_views + 1,
            updated_at = excluded.updated_at
        `).bind(path, now)
      ]);
    }

    if (Number(dailyInserted.meta?.changes || 0) === 1) {
      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO site_daily_totals (visit_day, total_visits, updated_at)
          VALUES (?, 1, ?)
          ON CONFLICT(visit_day) DO UPDATE SET
            total_visits = total_visits + 1,
            updated_at = excluded.updated_at
        `).bind(today, now),
        env.DB.prepare(`
          INSERT INTO site_daily_page_totals (visit_day, path, total_visits, updated_at)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(visit_day, path) DO UPDATE SET
            total_visits = total_visits + 1,
            updated_at = excluded.updated_at
        `).bind(today, path, now)
      ]);
    }
  }

  if (Math.random() < 0.01) {
    const staleSessionCutoff = now - 24 * 60 * 60 * 1000;
    const staleDedupeCutoff = now - 90 * 24 * 60 * 60 * 1000;
    const staleDailyCutoff = taipeiDay(now - 8 * 24 * 60 * 60 * 1000);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM site_sessions WHERE last_seen < ?').bind(staleSessionCutoff),
      env.DB.prepare('DELETE FROM site_session_pages WHERE first_seen < ?').bind(staleDedupeCutoff),
      env.DB.prepare('DELETE FROM site_daily_visits WHERE visit_day < ?').bind(staleDailyCutoff)
    ]);
  }

  return readStats(request, env, path);
}

async function readStats(request, env, path = null) {
  const now = Date.now();
  const configuredWindow = Number(env.ONLINE_WINDOW_SECONDS || 120);
  const windowSeconds = Number.isFinite(configuredWindow)
    ? Math.min(600, Math.max(60, configuredWindow))
    : 120;
  const cutoff = now - windowSeconds * 1000;
  const today = taipeiDay(now);

  const [totalRow, onlineRow, pageRow, todayRow, todayPageRow] = await Promise.all([
    env.DB.prepare("SELECT baseline_views, live_views FROM site_totals WHERE id = 'global'").first(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM site_sessions WHERE last_seen >= ?').bind(cutoff).first(),
    path
      ? env.DB.prepare('SELECT baseline_views, live_views FROM site_page_totals WHERE path = ?').bind(path).first()
      : Promise.resolve(null),
    env.DB.prepare('SELECT total_visits FROM site_daily_totals WHERE visit_day = ?').bind(today).first(),
    path
      ? env.DB.prepare(`
          SELECT total_visits FROM site_daily_page_totals
          WHERE visit_day = ? AND path = ?
        `).bind(today, path).first()
      : Promise.resolve(null)
  ]);

  return jsonResponse({
    online: Number(onlineRow?.count || 0),
    totalViews: Number(totalRow?.baseline_views || 0) + Number(totalRow?.live_views || 0),
    baselineViews: Number(totalRow?.baseline_views || 0),
    liveViews: Number(totalRow?.live_views || 0),
    pageViews: path
      ? Number(pageRow?.baseline_views || 0) + Number(pageRow?.live_views || 0)
      : undefined,
    today,
    todayVisits: Number(todayRow?.total_visits || 0),
    todayPageVisits: path ? Number(todayPageRow?.total_visits || 0) : undefined,
    windowSeconds,
    baselineAsOf: env.BASELINE_AS_OF || '2026-10-02',
    asOf: new Date(now).toISOString()
  }, 200, request, env);
}

async function readPageStats(request, env) {
  const today = taipeiDay();
  const rows = await env.DB.prepare(`
    SELECT pages.path, pages.baseline_views, pages.live_views,
      pages.baseline_views + pages.live_views AS total_views,
      COALESCE(daily.total_visits, 0) AS today_visits
    FROM site_page_totals AS pages
    LEFT JOIN site_daily_page_totals AS daily
      ON daily.path = pages.path AND daily.visit_day = ?
    ORDER BY total_views DESC, pages.path ASC
  `).bind(today).all();

  return jsonResponse({
    baselineAsOf: env.BASELINE_AS_OF || '2026-10-02',
    today,
    pages: rows.results || []
  }, 200, request, env);
}
