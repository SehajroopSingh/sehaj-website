/* ============================================================
   Demo wiring: live drone, gain sliders, Twiddle auto-tune,
   and a strip chart of altitude vs. target.
   ============================================================ */
(function (A) {
  const C = A.colors;
  const canvas = document.getElementById("pid-canvas");
  const stage = A.makeStage(canvas, 0.8);

  const WORLD_X = 10, WORLD_Y = 12;  // scene shows x in [-10, 10], y in [0, 12]
  const SCENE_FRAC = 0.68;           // top part = scene, bottom = chart
  const DT = 0.01, HISTORY = 10;     // seconds of chart history

  const thrust = { p: A.slider("t-p", apply), i: A.slider("t-i", apply), d: A.slider("t-d", apply) };
  const roll = { p: A.slider("r-p", apply, 3), i: A.slider("r-i", apply, 3), d: A.slider("r-d", apply, 3) };
  const downdraft = document.getElementById("pid-downdraft");
  const status = document.getElementById("pid-status");

  const gT = {}, gR = {};
  function apply() {
    gT.p = thrust.p.get(); gT.i = thrust.i.get(); gT.d = thrust.d.get();
    gR.p = roll.p.get(); gR.i = roll.i.get(); gR.d = roll.d.get();
  }
  apply();

  const drone = new A.Drone(gT, gR);
  let target = { x: 0, y: 6 }, t = 0, acc = 0, hist = [], trail = [], tuner = null;

  function restart() {
    drone.reset(); t = 0; hist = []; trail = [];
  }

  // ---------- Coordinates ----------
  const sceneH = () => stage.h * SCENE_FRAC;
  const scale = () => stage.w / (2 * WORLD_X);          // px per meter, horizontal
  const ky = () => (sceneH() - 20) / WORLD_Y;            // px per meter, vertical
  const sx = (x) => stage.w / 2 + x * scale();
  const sy = (y) => sceneH() - 10 - y * ky();

  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (py > sceneH()) return;
    target = {
      x: A.clamp((px - stage.w / 2) / scale(), -WORLD_X + 1, WORLD_X - 1),
      y: A.clamp((sceneH() - 10 - py) / ky(), 0.5, WORLD_Y - 0.5),
    };
  });

  // ---------- Twiddle auto-tune ----------
  document.getElementById("pid-tune").onclick = () => {
    const withDown = downdraft.checked;
    const cost = (p) => A.scoreThrustGains({ p: Math.max(0, p[0]), i: Math.max(0, p[1]), d: Math.max(0, p[2]) }, withDown);
    tuner = new A.Twiddle(cost, [0, 0, 0], [1, 0.3, 1]);
  };
  function stepTuner() {
    if (!tuner) return;
    for (let k = 0; k < 3 && !tuner.done; k++) tuner.tick();
    const [p, i, d] = tuner.p.map((v) => Math.max(0, v));
    thrust.p.set(p); thrust.i.set(i); thrust.d.set(d); apply();
    status.textContent = (tuner.done ? "Done. " : "Tuning… ") + "tries " + tuner.evals + " · cost " + tuner.best.toFixed(2);
    if (tuner.done) { tuner = null; target = { x: target.x, y: 6 }; restart(); }
  }

  // ---------- Drawing ----------
  function drawDrone() {
    const ctx = stage.ctx;
    ctx.save();
    ctx.translate(sx(drone.x), sy(drone.y));
    ctx.rotate(drone.th);
    // thrust flames
    const f = drone.thrust / 26;
    ctx.fillStyle = "rgba(255,160,80,0.8)";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 22 - 5, 4); ctx.lineTo(side * 22 + 5, 4); ctx.lineTo(side * 22, 4 + 22 * f);
      ctx.fill();
    }
    ctx.fillStyle = "#cfd6e2";
    ctx.fillRect(-26, -3, 52, 6);           // arm
    ctx.fillRect(-8, -8, 16, 10);           // body
    ctx.fillStyle = "#7cc4ff";
    for (const side of [-1, 1]) ctx.fillRect(side * 22 - 9, -7, 18, 3); // rotors
    ctx.restore();
  }

  function drawChart() {
    const ctx = stage.ctx;
    const top = sceneH() + 8, bottom = stage.h - 10, left = 44, right = stage.w - 10;
    ctx.fillStyle = "#0e1420";
    ctx.fillRect(0, sceneH(), stage.w, stage.h - sceneH());
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.strokeRect(left, top, right - left, bottom - top);
    const t0 = Math.max(0, t - HISTORY);
    const X = (tt) => left + ((tt - t0) / HISTORY) * (right - left);
    const Y = (v) => bottom - (v / WORLD_Y) * (bottom - top);
    ctx.fillStyle = C.text; ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText("altitude", 6, top + 2);
    ctx.fillText("12m", 12, top + 16);
    ctx.fillText("0m", 18, bottom - 12);
    const line = (key, color, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.setLineDash(dash || []);
      ctx.beginPath();
      hist.forEach((h, k) => (k ? ctx.lineTo(X(h.t), Y(h[key])) : ctx.moveTo(X(h.t), Y(h[key]))));
      ctx.stroke(); ctx.setLineDash([]);
    };
    line("target", C.estimate, [5, 4]);
    line("y", C.particle);
  }

  function draw() {
    const ctx = stage.ctx;
    A.clear(stage);
    // ground + grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let y = 2; y <= WORLD_Y; y += 2) { ctx.beginPath(); ctx.moveTo(0, sy(y)); ctx.lineTo(stage.w, sy(y)); ctx.stroke(); }
    ctx.fillStyle = "#1a2130"; ctx.fillRect(0, sy(0), stage.w, 10);
    if (downdraft.checked) {
      ctx.fillStyle = "rgba(182,156,255,0.5)";
      for (let k = 0; k < 14; k++) {
        const xx = ((k * 97 + t * 40) % stage.w), yy = ((k * 53 + t * 120) % sceneH());
        ctx.fillRect(xx, yy, 1.5, 10);
      }
    }
    // target
    ctx.strokeStyle = C.estimate; ctx.lineWidth = 1.5;
    const tx = sx(target.x), ty = sy(target.y);
    ctx.beginPath(); ctx.arc(tx, ty, 10, 0, 6.3); ctx.moveTo(tx - 16, ty); ctx.lineTo(tx + 16, ty); ctx.moveTo(tx, ty - 16); ctx.lineTo(tx, ty + 16); ctx.stroke();
    // trail
    ctx.strokeStyle = "rgba(124,196,255,0.35)"; ctx.beginPath();
    trail.forEach((p, k) => (k ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
    ctx.stroke();
    drawDrone();
    drawChart();
    A.hud(stage, [
      "altitude " + drone.y.toFixed(2) + " m   target " + target.y.toFixed(2) + " m",
      "x " + drone.x.toFixed(2) + " m   target " + target.x.toFixed(2) + " m",
      "click anywhere to move the target",
    ]);
  }

  document.getElementById("pid-reset").onclick = restart;

  A.loop(canvas, (dt) => {
    stepTuner();
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      drone.step(DT, target, { down: downdraft.checked ? 3 : 0, side: 0 });
      t += DT;
      if (Math.round(t / DT) % 3 === 0) {
        hist.push({ t, y: drone.y, target: target.y });
        trail.push({ x: drone.x, y: drone.y });
      }
    }
    while (hist.length && hist[0].t < t - HISTORY) hist.shift();
    if (trail.length > 200) trail.splice(0, trail.length - 200);
    draw();
  });
})(window.AI4R);
