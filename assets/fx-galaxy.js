/* Polik Projects — 3D 專案星系（由 fx.js 視裝置能力延遲載入）
   14 個專案化為發光星球，依 4 個分類在傾斜軌道上運行；滑鼠移動改變視角，
   滑到星球顯示名稱，點擊直接開啟專案。分頁隱藏或捲出畫面時暫停算圖。 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";

const COLOR = { edu: 0x22d3ee, cre: 0xf472b6, sys: 0xa78bfa, lab: 0xa3e635 };
const ORBIT = { edu: 2.3, cre: 3.3, sys: 4.2, lab: 5.0 };
const TILT = { edu: 0.32, cre: -0.22, sys: 0.18, lab: -0.38 };

// 用 canvas 畫一張柔光貼圖，給星球光暈與核心使用
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,0.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mount(panel, projects, cats) {
  const stage = document.createElement("div");
  stage.className = "galaxy-stage";
  stage.setAttribute("aria-hidden", "true");
  const tip = document.createElement("div");
  tip.className = "galaxy-tip";
  stage.appendChild(tip);
  const label = panel.querySelector(".panel-label");
  (label ? label.after(stage) : panel.prepend(stage));
  panel.classList.add("has-galaxy");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 3.2, 11);
  camera.lookAt(0, 0, 0);

  const world = new THREE.Group();
  scene.add(world);
  const tex = glowTexture();

  // 核心
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 48), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
  world.add(core);
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x818cf8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  coreGlow.scale.set(4.2, 4.2, 1);
  world.add(coreGlow);

  // 背景星點
  const starGeo = new THREE.BufferGeometry();
  const N = 900, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 9 + Math.random() * 18, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.05, transparent: true, opacity: 0.8 }));
  scene.add(stars);

  // 軌道與星球
  const planets = [];
  const byCat = {};
  projects.forEach((p) => (byCat[p.cat] ||= []).push(p));
  Object.entries(byCat).forEach(([cat, list]) => {
    const orbit = new THREE.Group();
    orbit.rotation.x = TILT[cat];
    orbit.rotation.z = TILT[cat] * 0.6;
    world.add(orbit);
    const ringPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * ORBIT[cat], 0, Math.sin(a) * ORBIT[cat]));
    }
    orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: COLOR[cat], transparent: true, opacity: 0.28 })));
    list.forEach((p, i) => {
      const holder = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 24), new THREE.MeshBasicMaterial({ color: COLOR[cat] }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: COLOR[cat], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(1.1, 1.1, 1);
      holder.add(ball, glow);
      orbit.add(holder);
      const planet = { p, holder, ball, glow, r: ORBIT[cat], a: (i / list.length) * Math.PI * 2 + Math.random() * 0.4, speed: 0.12 / Math.sqrt(ORBIT[cat]) };
      ball.userData.planet = planet;
      planets.push(planet);
    });
  });

  // 尺寸
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // 互動：視角跟隨滑鼠、拖曳旋轉、懸停提示、點擊開啟
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  let targetX = 0.25, targetY = 0, curX = 0.25, curY = 0, drag = null, spin = 0, hover = null;
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (drag) { spin += (e.clientX - drag) * 0.008; drag = e.clientX; }
    targetY = ndc.x * 0.35;
    targetX = 0.25 - ndc.y * 0.18;
  });
  stage.addEventListener("pointerleave", () => { ndc.set(9, 9); drag = null; targetX = 0.25; targetY = 0; });
  stage.addEventListener("pointerdown", (e) => { drag = e.clientX; stage.style.cursor = "grabbing"; });
  addEventListener("pointerup", () => { drag = null; stage.style.cursor = ""; });
  stage.addEventListener("click", () => { if (hover) location.href = hover.p.url; });

  const balls = planets.map((pl) => pl.ball);
  const v = new THREE.Vector3();
  let visible = true, last = performance.now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const frame = (t) => {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = t; return; }
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    curX += (targetX - curX) * 0.05;
    curY += (targetY - curY) * 0.05;
    world.rotation.x = curX;
    world.rotation.y = curY + spin + t * 0.00004;
    stars.rotation.y = t * 0.00001;
    const pulse = 1 + Math.sin(t * 0.002) * 0.05;
    coreGlow.scale.set(4.2 * pulse, 4.2 * pulse, 1);

    planets.forEach((pl) => {
      if (pl !== hover) pl.a += pl.speed * dt;
      pl.holder.position.set(Math.cos(pl.a) * pl.r, 0, Math.sin(pl.a) * pl.r);
      const s = pl === hover ? 1.8 : 1;
      pl.ball.scale.lerp(v.set(s, s, s), 0.2);
      const gs = pl === hover ? 2.2 : 1.1;
      pl.glow.scale.set(gs, gs, 1);
    });

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(balls, false)[0];
    const next = hit ? hit.object.userData.planet : null;
    if (next !== hover) {
      hover = next;
      stage.style.cursor = hover ? "pointer" : drag ? "grabbing" : "";
      if (hover) tip.innerHTML = `${hover.p.name}<small>${cats[hover.p.cat]} · 點擊開啟</small>`;
      tip.classList.toggle("is-on", !!hover);
    }
    if (hover) {
      hover.ball.getWorldPosition(v).project(camera);
      tip.style.left = `${(v.x * 0.5 + 0.5) * stage.clientWidth}px`;
      tip.style.top = `${(-v.y * 0.5 + 0.5) * stage.clientHeight}px`;
    }
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}
