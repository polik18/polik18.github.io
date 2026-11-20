/* Polik Projects — 互動特效（無相依套件）
   粒子網路背景、捲動進度條、捲動浮現、卡片聚光與 3D 傾斜、數字跳動、標題打字。
   尊重 prefers-reduced-motion；任何錯誤都不影響頁面內容。 */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  doc.classList.add("fx");

  /* ── 捲動進度條 ── */
  const bar = document.createElement("div");
  bar.id = "fx-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  const onScroll = () => {
    const max = doc.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── 粒子網路背景 ── */
  const canvas = document.createElement("canvas");
  canvas.id = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const mouse = { x: -9999, y: -9999 };
  let W = 0, H = 0, dpr = 1, pts = [], raf = 0;
  const COLORS = ["34,211,238", "129,140,248", "244,114,182"];

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (W * H) / 16000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.6,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
    if (reduce) draw();
  };

  const LINK = 130;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { const f = 0.6 / Math.sqrt(d2 + 1); p.x += dx * f; p.y += dy * f; }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},0.85)`;
      ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${a.c},${(1 - d / LINK) * 0.22})`;
          ctx.lineWidth = 0.7;
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
  };

  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
  document.addEventListener("visibilitychange", () => {
    if (reduce) return;
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(draw);
  });
  resize();
  if (!reduce) raf = requestAnimationFrame(draw);

  /* ── 卡片聚光＋3D 傾斜 ── */
  const cards = document.querySelectorAll(
    ".category-card, .project-card, .use-case, .article-card, .principle, .next-categories a, .hero-panel"
  );
  if (finePointer) {
    cards.forEach((el) => {
      const tilt = !reduce && (el.matches(".category-card, .hero-panel"));
      if (tilt) el.classList.add("fx-tilt");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        if (tilt) {
          const rx = (y / r.height - 0.5) * -6, ry = (x / r.width - 0.5) * 6;
          el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        }
      });
      if (tilt) el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ── 數字跳動 ── */
  const countUp = (el) => {
    const target = parseInt(el.textContent.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(target) || reduce) return;
    const t0 = performance.now(), dur = 1200;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(target * e));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  };

  /* ── 捲動浮現 ── */
  const revealTargets = document.querySelectorAll(
    ".section-head, .category-card, .principle, .directory-row, .project-card, .use-case, .article-card, .next-categories a, .stat, .hero-panel, .page-summary"
  );
  if (!reduce && "IntersectionObserver" in window) {
    const groups = new Map();
    revealTargets.forEach((el) => {
      const parent = el.parentElement;
      const idx = groups.get(parent) || 0;
      groups.set(parent, idx + 1);
      el.style.setProperty("--fx-delay", `${Math.min(idx, 8) * 70}ms`);
      el.classList.add("fx-reveal");
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        const num = en.target.matches(".stat") && en.target.querySelector("strong");
        if (num) countUp(num);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ── 主標題打字效果（只跑一次，保留原文字給螢幕閱讀器） ── */
  const h1 = document.querySelector(".hero h1");
  if (h1 && !reduce) {
    const lines = [...h1.querySelectorAll(".hero-title-line")];
    if (lines.length) {
      h1.setAttribute("aria-label", h1.textContent.trim());
      const nodes = [];
      const walk = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? nodes.push(c) : walk(c)));
      lines.forEach(walk);
      const texts = nodes.map((n) => n.textContent);
      let ni = 0, ci = 0;
      const tick = () => {
        if (ni >= nodes.length) { h1.style.minHeight = ""; return; }
        nodes[ni].textContent = texts[ni].slice(0, ++ci);
        if (ci >= texts[ni].length) { ni++; ci = 0; }
        setTimeout(tick, 55);
      };
      // 先量出完整高度避免版面跳動
      nodes.forEach((n, i) => (n.textContent = texts[i]));
      h1.style.minHeight = `${h1.offsetHeight}px`;
      nodes.forEach((n) => (n.textContent = ""));
      setTimeout(tick, 250);
    }
  }
})();
