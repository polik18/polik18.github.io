(() => {
  'use strict';

  const API_URL = 'https://polik-site-stats-api.vote-platform-api.workers.dev/api/stats';
  const PAGE_STATS_URL = `${API_URL}/pages`;
  const VISITOR_KEY = 'polik_site_stats_visitor';
  const SESSION_KEY = 'polik_site_stats_session';
  const SEEN_KEY = 'polik_site_stats_seen_paths';
  const HEARTBEAT_MS = 45_000;
  const numberFormat = new Intl.NumberFormat('zh-TW');

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

  function isFirstViewForPath(path) {
    try {
      const seen = new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
      if (seen.has(path)) return false;
      seen.add(path);
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
      return true;
    } catch {
      return true;
    }
  }

  function render(stats) {
    const onlineTargets = ['home-online-counter', 'online-counter', 'grok-online'];
    const totalTargets = ['home-page-counter', 'page-counter', 'header-view-counter', 'view-count'];
    onlineTargets.forEach(id => {
      const element = document.getElementById(id);
      updateText(element, numberFormat.format(stats.online));
    });
    totalTargets.forEach(id => {
      const element = document.getElementById(id);
      updateText(element, numberFormat.format(stats.pageViews ?? stats.totalViews));
    });
    updateText(document.getElementById('home-page-counter'), numberFormat.format(stats.totalViews));
  }

  function renderUnavailable() {
    const ids = ['home-online-counter', 'online-counter', 'grok-online',
      'home-page-counter', 'page-counter', 'header-view-counter', 'view-count'];
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
  }

  async function renderPageBreakdown() {
    const targets = [...document.querySelectorAll('[data-stats-path]')];
    if (!targets.length) return;
    try {
      const response = await fetch(PAGE_STATS_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`page_stats_${response.status}`);
      const payload = await response.json();
      const viewsByPath = new Map(payload.pages.map(page => [page.path, Number(page.total_views || 0)]));
      targets.forEach(element => {
        const paths = String(element.dataset.statsPath || '').split(',').map(path => path.trim()).filter(Boolean);
        const total = paths.reduce((sum, currentPath) => sum + (viewsByPath.get(currentPath) || 0), 0);
        const label = `${numberFormat.format(total)} 次瀏覽`;
        updateText(element, label);
        element.setAttribute('aria-label', label);
      });
    } catch {
      targets.forEach(element => updateText(element, '瀏覽統計暫不可用'));
    }
  }

  const visitorId = getAnonymousId(localStorage, VISITOR_KEY);
  const sessionId = getAnonymousId(sessionStorage, SESSION_KEY);
  const path = normalizePath();
  const initialEvent = isFirstViewForPath(path) ? 'pageview' : 'heartbeat';

  sendActivity(initialEvent).catch(renderUnavailable);
  renderPageBreakdown();

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      sendActivity('heartbeat').catch(() => {});
    }
  }, HEARTBEAT_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendActivity('heartbeat').catch(() => {});
    }
  });
})();
