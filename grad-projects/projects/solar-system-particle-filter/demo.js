/* ============================================================
   Demo wiring: runs the world + filter and draws them.
   ============================================================ */
(function (A) {
  const C = A.colors;
  const canvas = document.getElementById("pf-canvas");
  const stage = A.makeStage(canvas, 0.78);

  const VIEW = 3.2;          // half-width of the visible area in AU
  const MEAS_NOISE = 0.015;  // true sensor noise (log gravity)
  const FIELD_W = 96, FIELD_H = 75;

  const countSlider = A.slider("pf-count", null, 0);
  const speedSlider = A.slider("pf-speed", null, 1);
  const showTruth = document.getElementById("pf-truth");

  let sys, sat, pf, z, est, truthTrail, estTrail, playing = true, timer = 0;
  const field = document.createElement("canvas");
  field.width = FIELD_W; field.height = FIELD_H;
  const fctx = field.getContext("2d");
  const fimg = fctx.createImageData(FIELD_W, FIELD_H);

  function reset() {
    sys = new A.SolarSystem();
    sat = new A.Satellite(A.rand(1.0, 2.2));
    pf = new A.ParticleFilter({ count: countSlider.get(), extent: 3, sigma: 0.05, fuzz: 0.025 });
    truthTrail = []; estTrail = [];
    sense();
  }

  // Take a gravity reading and update the filter with it.
  function sense() {
    z = Math.log(sys.gravityAt(sat.x, sat.y)) + A.randn() * MEAS_NOISE;
    pf.weigh(z, sys);
    buildField();
    pf.resample();
    pf.roughen();
    est = pf.estimate();
    truthTrail.push({ x: sat.x, y: sat.y });
    estTrail.push(est);
    if (truthTrail.length > 60) { truthTrail.shift(); estTrail.shift(); }
  }

  function advance() {
    const cmd = sat.command();
    sat.move(cmd);
    pf.move(cmd);
    sys.step();
    sense();
  }

  // Purple haze = every place whose gravity matches the current reading.
  function buildField() {
    const d = fimg.data;
    for (let j = 0; j < FIELD_H; j++) {
      for (let i = 0; i < FIELD_W; i++) {
        const x = ((i + 0.5) / FIELD_W * 2 - 1) * VIEW * (stage.w / stage.h);
        const y = (1 - (j + 0.5) / FIELD_H * 2) * VIEW;
        const e = z - Math.log(sys.gravityAt(x, y));
        const like = Math.exp(-(e * e) / (2 * 0.05 * 0.05));
        const k = (j * FIELD_W + i) * 4;
        d[k] = 182; d[k + 1] = 156; d[k + 2] = 255; d[k + 3] = Math.round(like * 90);
      }
    }
    fctx.putImageData(fimg, 0, 0);
  }

  // World (AU) -> screen (px)
  function sx(x) { return stage.w / 2 + x / VIEW * (stage.h / 2); }
  function sy(y) { return stage.h / 2 - y / VIEW * (stage.h / 2); }

  function draw() {
    const ctx = stage.ctx;
    A.clear(stage);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(field, 0, 0, stage.w, stage.h);

    // Orbits
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (const b of sys.bodies) if (b.r > 0) {
      ctx.beginPath(); ctx.arc(sx(0), sy(0), b.r / VIEW * stage.h / 2, 0, 6.3); ctx.stroke();
    }

    // Particles
    ctx.fillStyle = C.particle;
    ctx.globalAlpha = 0.55;
    for (const p of pf.particles) ctx.fillRect(sx(p.x) - 1, sy(p.y) - 1, 2, 2);
    ctx.globalAlpha = 1;

    // Sun + planets
    for (const b of sys.bodies) {
      const p = sys.position(b);
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), b.size, 0, 6.3); ctx.fill();
    }

    // Trails
    const trail = (pts, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
      ctx.stroke();
    };
    trail(estTrail, C.estimate);
    if (showTruth.checked) {
      trail(truthTrail, C.truth);
      ctx.strokeStyle = C.truth; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx(sat.x), sy(sat.y), 7, 0, 6.3); ctx.stroke();
    }

    // Estimate crosshair
    ctx.strokeStyle = C.estimate; ctx.lineWidth = 2;
    const ex = sx(est.x), ey = sy(est.y);
    ctx.beginPath(); ctx.moveTo(ex - 9, ey); ctx.lineTo(ex + 9, ey); ctx.moveTo(ex, ey - 9); ctx.lineTo(ex, ey + 9); ctx.stroke();

    const err = Math.hypot(est.x - sat.x, est.y - sat.y);
    A.hud(stage, [
      "step " + pf.step,
      "particles " + pf.n,
      "error " + err.toFixed(3) + " AU",
    ]);
  }

  document.getElementById("pf-play").onclick = (e) => {
    playing = !playing;
    e.target.textContent = playing ? "Pause" : "Play";
  };
  document.getElementById("pf-step").onclick = () => { advance(); };
  document.getElementById("pf-reset").onclick = reset;
  document.getElementById("pf-count").addEventListener("change", reset);

  reset();
  A.loop(canvas, (dt) => {
    if (playing) {
      timer += dt * speedSlider.get();
      while (timer > 1) { timer -= 1; advance(); }
    }
    draw();
  });
})(window.AI4R);
