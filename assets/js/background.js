/* Soft pastel aura that drifts with the pointer. */
(() => {
  const canvas = document.getElementById("aura");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const glow = document.querySelector(".cursor-glow");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let running = true;
  let time = 0;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, active: false };

  const palette = [
    [186, 142, 255], // Rich electric violet
    [255, 160, 205], // Vivid radiant rose
    [255, 215, 140], // Warm glowing amber
    [155, 235, 198], // Crisp energetic mint
    [160, 110, 255], // Deep luminous purple
    [220, 168, 255], // Soft magenta glow
    [255, 178, 218], // Bright pastel coral
  ];

  const orbs = palette.map((color, i) => ({
    color,
    x: [0.16, 0.82, 0.62, 0.24, 0.94, 0.48, 0.06][i],
    y: [0.2, 0.16, 0.72, 0.86, 0.58, 0.42, 0.62][i],
    r: [0.52, 0.46, 0.48, 0.42, 0.36, 0.4, 0.34][i],
    depth: [0.65, 1.05, 0.8, 0.5, 1.25, 0.7, 0.45][i],
    speed: [0.00018, 0.00014, 0.00022, 0.00016, 0.00012, 0.00019, 0.00015][i],
    phase: [0, 1.7, 3.1, 4.4, 2.2, 5.3, 0.9][i],
    alpha: [0.72, 0.68, 0.62, 0.55, 0.5, 0.6, 0.52][i],
  }));

  const sprites = new Map();

  function sprite(color, alpha) {
    const key = color.join("-") + alpha;
    if (sprites.has(key)) return sprites.get(key);
    const size = 512;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const octx = off.getContext("2d");
    const gradient = octx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
    gradient.addColorStop(0.38, `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.65})`);
    gradient.addColorStop(0.7, `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.25})`);
    gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
    octx.fillStyle = gradient;
    octx.fillRect(0, 0, size, size);
    sprites.set(key, off);
    return off;
  }

  const dust = Array.from({ length: 34 }, (_, i) => ({
    x: ((i * 0.618) % 1),
    y: ((i * 0.377 + 0.13) % 1),
    r: 1 + ((i * 7) % 5) * 0.35,
    depth: 0.25 + ((i * 3) % 7) / 9,
    phase: i * 0.9,
  }));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const base = Math.min(width, height);

    // Dynamic vivid pointer spotlight bloom
    if (pointer.active) {
      const cursorX = (pointer.tx * 0.5 + 0.5) * width;
      const cursorY = (pointer.ty * 0.5 + 0.5) * height;
      const spotR = base * 0.5;
      const spotlight = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, spotR);
      spotlight.addColorStop(0, "rgba(196, 145, 255, 0.48)");
      spotlight.addColorStop(0.32, "rgba(255, 175, 218, 0.32)");
      spotlight.addColorStop(0.68, "rgba(168, 120, 255, 0.14)");
      spotlight.addColorStop(1, "rgba(168, 120, 255, 0)");
      ctx.fillStyle = spotlight;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, spotR, 0, Math.PI * 2);
      ctx.fill();
    }

    orbs.forEach((orb, i) => {
      const drift = reduceMotion.matches ? 0 : time * orb.speed * 60;
      const ox = orb.x * width + Math.sin(drift + orb.phase) * base * 0.06;
      const oy = orb.y * height + Math.cos(drift * 0.82 + orb.phase * 1.4) * base * 0.065;
      const parallaxX = pointer.x * orb.depth * 68;
      const parallaxY = pointer.y * orb.depth * 68;
      const radius = base * orb.r * (1 + Math.sin(drift * 0.7 + i) * 0.04);
      const image = sprite(orb.color, orb.alpha);
      ctx.drawImage(image, ox + parallaxX - radius, oy + parallaxY - radius, radius * 2, radius * 2);
    });

    dust.forEach((dot, i) => {
      const drift = reduceMotion.matches ? 0 : time * 0.00004;
      const x = dot.x * width + Math.sin(drift + dot.phase) * 18 + pointer.x * dot.depth * 32;
      const y = dot.y * height + Math.cos(drift * 0.9 + dot.phase) * 16 + pointer.y * dot.depth * 32;
      ctx.beginPath();
      ctx.arc(x, y, dot.r * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(138, 88, 235, ${0.16 + (i % 4) * 0.06})`;
      ctx.fill();
    });
  }

  let clientX = 0;
  let clientY = 0;

  function loop() {
    time += 1;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    draw();
    if (glow && pointer.active) {
      pointer.px += (clientX - pointer.px) * 0.15;
      pointer.py += (clientY - pointer.py) * 0.15;
      glow.style.transform = `translate3d(${pointer.px}px, ${pointer.py}px, 0)`;
    }
    if (running) raf = requestAnimationFrame(loop);
  }

  function onPointerMove(event) {
    clientX = event.clientX;
    clientY = event.clientY;
    pointer.tx = (clientX / width - 0.5) * 2;
    pointer.ty = (clientY / height - 0.5) * 2;
    if (!pointer.active) {
      pointer.active = true;
      pointer.px = clientX;
      pointer.py = clientY;
      document.body.classList.add("has-pointer");
    }
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  if (!reduceMotion.matches) {
    raf = requestAnimationFrame(loop);
  } else {
    draw();
  }

  reduceMotion.addEventListener("change", (event) => {
    if (event.matches) stop();
    else start();
  });

  if (!finePointer.matches) {
    document.body.classList.remove("has-pointer");
  }
})();
