/* Polik Projects 共用外殼：各子專案頁載入一行即可取得一致的品牌浮動列（回首頁＋回分類），
   並可選擇套用 Neo-Lab 深色外觀層。
   用法：<script src="https://polik18.github.io/assets/polik-shell.js" data-cat="education"
          data-skin="neo" data-accent="#22d3ee" data-accent2="#f472b6" data-side="left" defer></script>
   若頁面已有 [data-polik-category-return] 連結，會沿用其網址並隱藏舊樣式；腳本失敗時舊連結照常可用。 */
(() => {
  "use strict";
  if (window.__polikShell) return;
  window.__polikShell = true;
  const me = document.currentScript || document.querySelector('script[src*="polik-shell.js"]');
  const ds = (me && me.dataset) || {};
  const BASE = "https://polik18.github.io/";
  const CATS = {
    education: ["教學現場", "education.html"],
    creator: ["內容創作", "creator.html"],
    systems: ["系統診斷", "systems.html"],
    experiments: ["實驗室", "experiments.html"],
  };
  const root = document.documentElement;

  const addCss = (href) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); };
  addCss(BASE + "assets/polik-shell.css?v=20261120");

  if (ds.accent) root.style.setProperty("--pk-acc", ds.accent);
  if (ds.accent2) root.style.setProperty("--pk-acc-2", ds.accent2);
  if (ds.accent3) root.style.setProperty("--pk-acc-3", ds.accent3);

  if (ds.skin === "neo") {
    root.classList.add("pk-neo");
    addCss(BASE + "assets/polik-neo.css?v=20261120");
    if (!document.querySelector('link[href*="Space+Grotesk"]')) addCss("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Grotesk:wght@500;600;700&display=swap");
  }

  const mount = () => {
    if (ds.skin === "neo" && ds.atmo !== "off" && !document.querySelector(".pk-atmo")) {
      const atmo = document.createElement("div");
      atmo.className = "pk-atmo";
      atmo.setAttribute("aria-hidden", "true");
      atmo.innerHTML = "<i class=p1></i><i class=p2></i><i class=p3></i><b></b>";
      document.body.prepend(atmo);
      if (ds.grain !== "off") {
        const g = document.createElement("div");
        g.className = "pk-grain";
        g.setAttribute("aria-hidden", "true");
        document.body.appendChild(g);
      }
    }
    if (ds.dock === "off") return;
    const old = document.querySelector("[data-polik-category-return]");
    const cat = CATS[ds.cat];
    const catHref = (old && old.getAttribute("href")) || (cat ? BASE + cat[1] : "");
    const catName = cat ? cat[0] : old ? old.textContent.replace(/^[←\s]*回/, "").replace(/分類$/, "") : "";
    const dock = document.createElement("nav");
    dock.className = "pk-dock";
    dock.dataset.side = ds.side === "right" ? "right" : "left";
    dock.setAttribute("aria-label", "Polik Projects 導覽");
    const accent = getComputedStyle(root).getPropertyValue("--pk-acc").trim() || ds.accent;
    if (accent) dock.style.setProperty("--pk-a", accent);
    if (ds.accent2) dock.style.setProperty("--pk-b", ds.accent2);
    dock.innerHTML = `<a class="pk-home" href="${BASE}" aria-label="回 Polik Projects 首頁"><span aria-hidden="true">⌂</span><em>Polik Projects 首頁</em></a>` +
      (catHref ? `<a class="pk-cat" href="${catHref}"><i aria-hidden="true">←</i>${catName || "分類"}</a>` : "") +
      `<span class="pk-brand" aria-hidden="true">POLIK</span>`;
    if (old) old.style.display = "none";
    document.body.appendChild(dock);
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
