(() => {
  'use strict';

  const API_URL = 'https://polik-site-stats-api.vote-platform-api.workers.dev/api/stats';
  const PAGE_STATS_URL = `${API_URL}/pages`;
  const VISITOR_KEY = 'polik_site_stats_visitor';
  const SESSION_KEY = 'polik_site_stats_session';
  const SEEN_KEY = 'polik_site_stats_seen_paths';
  const HEARTBEAT_MS = 45_000;
  const numberFormat = new Intl.NumberFormat('zh-TW');
  const taipeiDayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  function updateText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function getAnonymousId(storage, key) {
    try {
      let value = storage.getItem(key);
      if (!value) {
        value = crypto.randomUUID();
        storage.setItem(key, value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  }

  function normalizePath() {
    return location.pathname === '/index.html' ? '/' : location.pathname;
  }

  function nextEventForPath(path) {
    try {
      const today = taipeiDayFormat.format(new Date());
      const stored = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}');
      const seen = new Set(stored.day === today && Array.isArray(stored.paths) ? stored.paths : []);
      if (seen.has(path)) return 'heartbeat';
      seen.add(path);
      sessionStorage.setItem(SEEN_KEY, JSON.stringify({ day: today, paths: [...seen] }));
      return 'pageview';
    } catch {
      return 'pageview';
    }
  }

  function render(stats) {
    const onlineTargets = ['home-online-counter', 'online-counter', 'grok-online'];
    const totalTargets = ['home-page-counter', 'page-counter', 'header-view-counter', 'view-count'];
    const todayGlobalTargets = ['home-today-counter'];
    const todayPageTargets = ['today-counter', 'grok-today'];
    onlineTargets.forEach(id => {
      const element = document.getElementById(id);
      updateText(element, numberFormat.format(stats.online));
    });
    totalTargets.forEach(id => {
      const element = document.getElementById(id);
      updateText(element, numberFormat.format(stats.pageViews ?? stats.totalViews));
    });
    todayGlobalTargets.forEach(id => {
      updateText(document.getElementById(id), numberFormat.format(stats.todayVisits));
    });
    todayPageTargets.forEach(id => {
      updateText(document.getElementById(id), numberFormat.format(stats.todayPageVisits ?? stats.todayVisits));
    });
    updateText(document.getElementById('home-page-counter'), numberFormat.format(stats.totalViews));
  }

  function renderUnavailable() {
    const ids = ['home-online-counter', 'online-counter', 'grok-online',
      'home-page-counter', 'page-counter', 'header-view-counter', 'view-count',
      'home-today-counter', 'today-counter', 'grok-today'];
    ids.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '—';
        element.title = '暫時無法取得即時統計';
      }
    });
  }

  async function sendActivity(event) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ visitorId, sessionId, path, event }),
      cache: 'no-store',
      keepalive: true
    });
    if (!response.ok) throw new Error(`stats_${response.status}`);
    const stats = await response.json();
    render(stats);
    return stats;
  }

  async function renderPageBreakdown() {
    const targets = [...document.querySelectorAll('[data-stats-path]')];
    if (!targets.length) return;
    try {
      const response = await fetch(PAGE_STATS_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`page_stats_${response.status}`);
      const payload = await response.json();
      const statsByPath = new Map(payload.pages.map(page => [page.path, {
        total: Number(page.total_views || 0),
        today: Number(page.today_visits || 0)
      }]));
      targets.forEach(element => {
        const paths = String(element.dataset.statsPath || '').split(',').map(path => path.trim()).filter(Boolean);
        const totals = paths.reduce((sum, currentPath) => {
          const current = statsByPath.get(currentPath) || { total: 0, today: 0 };
          return { total: sum.total + current.total, today: sum.today + current.today };
        }, { total: 0, today: 0 });
        const label = `${numberFormat.format(totals.total)} 次 · 今日 ${numberFormat.format(totals.today)}`;
        updateText(element, label);
        element.setAttribute('aria-label', `累積瀏覽 ${numberFormat.format(totals.total)} 次，今日造訪 ${numberFormat.format(totals.today)} 人次`);
      });
    } catch {
      targets.forEach(element => updateText(element, '瀏覽統計暫不可用'));
    }
  }

  const visitorId = getAnonymousId(localStorage, VISITOR_KEY);
  const sessionId = getAnonymousId(sessionStorage, SESSION_KEY);
  const path = normalizePath();

  async function refreshActivity(refreshBreakdown = false) {
    const event = nextEventForPath(path);
    try {
      await sendActivity(event);
    } finally {
      if (refreshBreakdown || event === 'pageview') await renderPageBreakdown();
    }
  }

  refreshActivity(true).catch(renderUnavailable);

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshActivity().catch(() => {});
    }
  }, HEARTBEAT_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshActivity().catch(() => {});
    }
  });
})();
