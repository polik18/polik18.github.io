/* Polik Projects — 互動層（無相依套件）
   粒子網路、捲動進度、浮現、卡片聚光／傾斜、數字跳動、標題打字、文字解碼、
   作品牆篩選、即時數據帶、⌘K 指令面板、深淺色切換、磁吸按鈕、游標光暈，
   並在合適裝置上延遲載入 3D 專案星系（fx-galaxy.js）。
   尊重 prefers-reduced-motion；任何錯誤都不影響頁面內容。 */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 無痕模式等 */ } },
  };
  doc.classList.add("fx");

  /* ── 專案資料（指令面板與星系共用） ── */
  const BASE = "https://polik18.github.io/";
  const PROJECTS = [
    ["Classroom Seat Master", "SeatPlanner/", "edu", "座位配置 seat"],
    ["Polik Scheduler", "school-scheduler/", "edu", "排課 課表 schedule"],
    ["智慧課堂助手", "class/", "edu", "抽籤 分組 計時 class"],
    ["Polik Vote", "vote-platform/", "edu", "投票 表決 vote"],
    ["Class3D Gallery", "class3d-gallery/", "edu", "3D 作品展 gallery"],
    ["Scratch AI Bridge", "scratch-editor-ai-bridge/", "edu", "scratch ai 遊戲"],
    ["WebPad++", "Webcoding/", "edu", "程式 ocr qr seo editor"],
    ["Screenrecorder Pro", "Screenrecorder/", "cre", "錄影 螢幕 record"],
    ["Audio Visualizer 3D", "Audio-Visualizer-3D/", "cre", "音樂 視覺化 mp4"],
    ["YouTube Shorts Embed", "ytshort/", "cre", "youtube shorts 嵌入"],
    ["YieldVitals", "YieldVitals/", "sys", "效能 跑分 benchmark"],
    ["Polik Recovery", "polik-recovery/", "sys", "資料救援 recovery"],
    ["School IT Toolkit｜AI 系管師", "school-it-toolkit/", "sys", "ai 系管 校園網路 sysadmin"],
    ["Cyber Snake 3D", "CyberSnake/", "lab", "遊戲 webgl snake"],
  ].map(([name, path, cat, kw]) => ({ name, url: BASE + path, cat, kw }));
  const CAT = { edu: "教學現場", cre: "內容創作", sys: "系統診斷", lab: "互動實驗" };
  window.POLIK_PROJECTS = PROJECTS;
  window.POLIK_CATS = CAT;

  /* ── 深淺色主題 ── */
  const applyTheme = (t) => {
    if (t === "light") doc.setAttribute("data-theme", "light");
    else doc.removeAttribute("data-theme");
    const m = $('meta[name="theme-color"]');
    if (m) m.content = t === "light" ? "#f3f6fb" : "#05070d";
  };
  applyTheme(store.get("polik-theme"));

  /* ── 標頭工具：⌘K 與主題切換 ── */
  const nav = $(".nav-cluster") || $(".nav-shell");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (nav) {
    const tools = document.createElement("div");
    tools.className = "nav-tools";
    tools.innerHTML =
      `<button class="nav-tool" type="button" data-act="cmdk" aria-label="搜尋專案（${isMac ? "⌘" : "Ctrl"}+K）"><span aria-hidden="true">⌕</span><kbd>${isMac ? "⌘" : "Ctrl"} K</kbd></button>` +
      `<button class="nav-tool" type="button" data-act="theme" aria-label="切換深淺色"><span aria-hidden="true">◐</span></button>`;
    nav.appendChild(tools);
    tools.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.act === "cmdk") openCmdk();
      if (b.dataset.act === "theme") {
        const next = doc.getAttribute("data-theme") === "light" ? "dark" : "light";
        const run = () => { applyTheme(next); store.set("polik-theme", next); };
        if (document.startViewTransition && !reduce) document.startViewTransition(run); else run();
      }
    });
  }

  /* ── ⌘K 指令面板 ── */
  let cmdk, cmdkInput, cmdkList, items = [], sel = 0;
  const buildItems = () => {
    const list = PROJECTS.map((p) => ({ title: p.name, sub: CAT[p.cat], url: p.url, tag: "PROJECT", kw: p.kw }));
    Object.entries({ "education.html": "edu", "creator.html": "cre", "systems.html": "sys", "experiments.html": "lab" })
      .forEach(([href, c]) => list.push({ title: `${CAT[c]} 分類頁`, sub: "依用途比較工具", url: BASE + href, tag: "PAGE", kw: c }));
    list.push({ title: "專案總覽首頁", sub: "Polik Projects", url: BASE, tag: "PAGE", kw: "home 首頁" });
    $$("#blog .directory-row").forEach((row) => {
      const a = $("a", row), h = $("h3", row);
      if (a && h) list.push({ title: h.textContent.trim(), sub: "部落格文章", url: a.href, tag: "BLOG", kw: ($("p", row) || {}).textContent || "" });
    });
    list.push({ title: "C樂遊部落格", sub: "polik18.blogspot.com", url: "https://polik18.blogspot.com/", tag: "BLOG", kw: "blog 部落格" });
    return list;
  };
  const renderCmdk = () => {
    const q = cmdkInput.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const shown = items.filter((it) => terms.every((t) => `${it.title} ${it.sub} ${it.kw} ${it.tag}`.toLowerCase().includes(t)));
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    cmdkList.innerHTML = shown.length
      ? shown.map((it, i) => `<li><a href="${it.url}" role="option" aria-selected="${i === sel}" data-i="${i}"><span>${it.title}</span><small>${it.sub}</small><em>${it.tag}</em></a></li>`).join("")
      : `<li class="cmdk-empty">找不到「${cmdkInput.value.replace(/[<>&"]/g, "")}」相關結果</li>`;
    const on = $('[aria-selected="true"]', cmdkList);
    if (on) on.scrollIntoView({ block: "nearest" });
  };
  function openCmdk() {
    if (!cmdk) {
      cmdk = document.createElement("dialog");
      cmdk.className = "cmdk";
      cmdk.setAttribute("aria-label", "搜尋專案與文章");
      cmdk.innerHTML =
        `<div class="cmdk-head"><span aria-hidden="true">❯</span><input type="search" placeholder="搜尋專案、分類或文章…" aria-label="搜尋" autocomplete="off"></div>` +
        `<ul class="cmdk-list" role="listbox"></ul>` +
        `<div class="cmdk-foot"><span>↑↓ 選擇</span><span>Enter 開啟</span><span>Esc 關閉</span></div>`;
      document.body.appendChild(cmdk);
      cmdkInput = $("input", cmdk);
      cmdkList = $(".cmdk-list", cmdk);
      items = buildItems();
      cmdkInput.addEventListener("input", () => { sel = 0; renderCmdk(); });
      cmdkInput.addEventListener("keydown", (e) => {
        const n = $$("a", cmdkList).length;
        if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(n, 1); renderCmdk(); }
        if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + n) % Math.max(n, 1); renderCmdk(); }
        if (e.key === "Enter") { const a = $('[aria-selected="true"]', cmdkList); if (a) location.href = a.href; }
        if (e.key === "Escape") { e.preventDefault(); cmdk.close(); }
      });
      cmdkList.addEventListener("pointermove", (e) => {
        const a = e.target.closest("a");
        if (a && +a.dataset.i !== sel) { sel = +a.dataset.i; renderCmdk(); }
      });
      cmdk.addEventListener("click", (e) => { if (e.target === cmdk) cmdk.close(); });
    }
    cmdkInput.value = "";
    sel = 0;
    renderCmdk();
    cmdk.showModal();
    cmdkInput.focus();
  }
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); cmdk && cmdk.open ? cmdk.close() : openCmdk(); }
    else if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !(cmdk && cmdk.open)) { e.preventDefault(); openCmdk(); }
  });

  /* ── 捲動進度條 ── */
  const bar = document.createElement("div");
  bar.id = "fx-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  const story = $(".story");
  const supportsTimeline = CSS.supports && CSS.supports("animation-timeline: view()");
  const onScroll = () => {
    const max = doc.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    if (story && !supportsTimeline) {
      const r = story.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight)));
      story.style.setProperty("--story", k.toFixed(3));
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── 游標光暈 ── */
  if (fine && !reduce) {
    const glow = document.createElement("div");
    glow.id = "fx-cursor";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const loop = () => {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ── 粒子網路背景 ── */
  const canvas = document.createElement("canvas");
  canvas.id = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const mouse = { x: -9999, y: -9999 };
  let W = 0, H = 0, pts = [], raf = 0;
  const COLORS = ["34,211,238", "129,140,248", "244,114,182"];
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (W * H) / 16000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.6, c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
    if (reduce) draw();
  };
  const LINK = 130;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { const f = 0.6 / Math.sqrt(d2 + 1); p.x += dx * f; p.y += dy * f; }
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},0.85)`; ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${a.c},${(1 - d / LINK) * 0.22})`; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const m = pts[i], md = Math.hypot(m.x - mouse.x, m.y - mouse.y);
      if (md < 170) {
        ctx.strokeStyle = `rgba(34,211,238,${(1 - md / 170) * 0.45})`;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    if (!reduce) raf = requestAnimationFrame(draw);
  }
  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
  document.addEventListener("visibilitychange", () => {
    if (reduce) return;
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(draw);
  });
  resize();
  if (!reduce) raf = requestAnimationFrame(draw);

  /* ── 卡片聚光＋3D 傾斜 ── */
  if (fine) {
    $$(".category-card, .project-card, .use-case, .article-card, .principle, .next-categories a, .hero-panel, .story-step").forEach((el) => {
      const tilt = !reduce && el.matches(".category-card");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        if (tilt) el.style.transform = `perspective(900px) rotateX(${(y / r.height - 0.5) * -6}deg) rotateY(${(x / r.width - 0.5) * 6}deg) translateY(-4px)`;
      });
      if (tilt) el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ── 磁吸按鈕 ── */
  if (fine && !reduce) {
    $$(".button, .nav-tool").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.transform = `translate(${x}px, ${y - 2}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  /* ── 文字解碼（英文小標進場時亂碼後還原） ── */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/";
  const scramble = (el) => {
    if (reduce || el.dataset.scrambled) return;
    el.dataset.scrambled = "1";
    const text = el.textContent, len = text.length;
    let f = 0;
    const tick = () => {
      el.textContent = [...text].map((ch, i) => (ch === " " || i < f / 2 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      if (f++ < len * 2) requestAnimationFrame(tick); else el.textContent = text;
    };
    tick();
  };

  /* ── 數字跳動 ── */
  const countUp = (el) => {
    const target = parseInt(el.textContent.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(target) || reduce) return;
    const t0 = performance.now(), dur = 1200;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  };

  /* ── 捲動浮現 ── */
  const revealSel = ".section-head, .category-card, .principle, .directory-row, .project-card, .use-case, .article-card, .next-categories a, .stat, .hero-panel, .page-summary, .bento-card, .live-band, .story-sticky"
    + (supportsTimeline ? "" : ", .story-step");
  const revealTargets = $$(revealSel);
  if (!reduce && "IntersectionObserver" in window) {
    const groups = new Map();
    revealTargets.forEach((el) => {
      const idx = groups.get(el.parentElement) || 0;
      groups.set(el.parentElement, idx + 1);
      el.style.setProperty("--fx-delay", `${Math.min(idx, 8) * 60}ms`);
      el.classList.add("fx-reveal");
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const t = en.target;
        t.classList.add("is-in");
        if (t.matches(".stat")) { const n = $("strong", t); if (n) countUp(n); }
        $$(".section-kicker, .category-number", t).forEach(scramble);
        io.unobserve(t);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealTargets.forEach((el) => io.observe(el));
    // 解碼效果也套在不在浮現清單內的小標
    const io2 = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { scramble(en.target); io2.unobserve(en.target); } }));
    $$(".eyebrow, .story .section-kicker").forEach((el) => io2.observe(el));
  }

  /* ── 作品牆分類篩選 ── */
  const filter = $(".bento-filter");
  if (filter) {
    filter.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const run = () => {
        $$("button", filter).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        $$(".bento-card").forEach((c) => c.classList.toggle("is-hidden", b.dataset.filter !== "all" && c.dataset.cat !== b.dataset.filter));
      };
      if (document.startViewTransition && !reduce) document.startViewTransition(run); else run();
    });
  }

  /* ── 即時數據帶：鏡射標頭的即時統計 ── */
  $$("[data-mirror]").forEach((el) => {
    const src = document.getElementById(el.dataset.mirror);
    if (!src) return;
    const sync = () => { el.textContent = src.textContent; };
    sync();
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
  });

  /* ── 主標題打字效果（只跑一次，保留完整文字給螢幕閱讀器） ── */
  const h1 = $(".hero h1");
  if (h1 && !reduce) {
    const lines = $$(".hero-title-line", h1);
    if (lines.length) {
      h1.setAttribute("aria-label", h1.textContent.trim());
      const nodes = [];
      const walk = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? nodes.push(c) : walk(c)));
      lines.forEach(walk);
      const texts = nodes.map((n) => n.textContent);
      h1.style.minHeight = `${h1.offsetHeight}px`;
      nodes.forEach((n) => (n.textContent = ""));
      let ni = 0, ci = 0;
      const tick = () => {
        if (ni >= nodes.length) { h1.style.minHeight = ""; return; }
        nodes[ni].textContent = texts[ni].slice(0, ++ci);
        if (ci >= texts[ni].length) { ni++; ci = 0; }
        setTimeout(tick, 55);
      };
      setTimeout(tick, 250);
    }
  }

  /* ── 3D 專案星系：只在桌機、非省流量、支援 WebGL、未要求減少動態時載入 ── */
  const panel = $(".hero .hero-panel");
  const saveData = navigator.connection && navigator.connection.saveData;
  if (panel && !reduce && !saveData && matchMedia("(min-width: 901px)").matches) {
    let gl = null;
    try { gl = document.createElement("canvas").getContext("webgl2"); } catch { /* 不支援 */ }
    if (gl) {
      const load = () => import("./fx-galaxy.js?v=20261120c").then((m) => m.mount(panel, PROJECTS, CAT)).catch(() => { /* 失敗就保留原本面板 */ });
      ("requestIdleCallback" in window) ? requestIdleCallback(load, { timeout: 1500 }) : setTimeout(load, 600);
    }
  }
})();
