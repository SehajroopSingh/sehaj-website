/* ============================================================
   Demo wiring: observe -> track -> decide -> move -> resolve jump
   ============================================================ */
(function (A) {
  const C = A.colors;
  const canvas = document.getElementById("kf-canvas");
  const stage = A.makeStage(canvas, 0.75);

  const MEAS_NOISE = 0.012;
  const JUMP = 0.22;
  const CATCH = 0.018;   // landing tolerance
  const GOAL_Y = 0.9;

  const speed = A.slider("kf-speed", null, 0);
  const noiseToggle = document.getElementById("kf-noisy");
  const modeSel = document.getElementById("kf-mode");

  let field, tracker, hopper, obs, preds, stats, playing = true, timer = 0, flash = [];

  function reset() {
    field = new A.AsteroidField(MEAS_NOISE);
    tracker = new A.Tracker(MEAS_NOISE);
    hopper = new A.Hopper(field, JUMP);
    stats = { hops: 0, home: 0, falls: 0, errKF: 0, errRaw: 0, n: 0 };
    obs = field.observe();
    preds = tracker.update(obs, modeSel.value === "kalman");
  }

  function step() {
    // 1) decide using predictions for next step
    const target = hopper.choose(preds, tracker);
    const landing = target ? preds[target] : null;
    const kfPreds = {};
    for (const id in tracker.filters) kfPreds[id] = tracker.filters[id].pos;

    // 2) world moves
    field.step();

    // score prediction quality (Kalman vs raw last measurement)
    for (const id in kfPreds) {
      const r = field.byId(Number(id));
      if (!r || !tracker.lastObs[id]) continue;
      const eK = Math.hypot(kfPreds[id].x - r.x, kfPreds[id].y - r.y);
      const o = tracker.lastObs[id];
      const eR = Math.hypot(o[0] - r.x, o[1] - r.y);
      stats.errKF = stats.errKF * 0.995 + eK * 0.005;
      stats.errRaw = stats.errRaw * 0.995 + eR * 0.005;
    }

    // 3) resolve jump
    if (target) {
      const rock = field.byId(Number(target));
      const from = { ...hopper.pos };
      if (rock && Math.hypot(rock.x - landing.x, rock.y - landing.y) < CATCH) {
        hopper.riding = Number(target);
        hopper.cooldown = 2;
        stats.hops++;
        flash.push({ from, to: { x: rock.x, y: rock.y }, ok: true, t: 1 });
      } else {
        stats.falls++;
        flash.push({ from, to: landing, ok: false, t: 1 });
        hopper.reset();
      }
    }

    // 4) ride along
    if (hopper.riding) {
      const rock = field.byId(hopper.riding);
      if (!rock) { stats.falls++; hopper.reset(); }
      else hopper.pos = { x: rock.x, y: rock.y };
    }
    if (hopper.pos.y > GOAL_Y) { stats.home++; hopper.reset(); }

    // 5) observe + track
    obs = field.observe();
    preds = tracker.update(obs, modeSel.value === "kalman");
  }

  // world -> screen
  const s = () => stage.h;
  const sx = (x) => x * s();
  const sy = (y) => stage.h - y * s();

  function drawRock(r) {
    const ctx = stage.ctx, rad = 0.018 * s();
    ctx.beginPath();
    r.shape.forEach((k, i) => {
      const a = r.spin + (i / r.shape.length) * Math.PI * 2;
      const px = sx(r.x) + Math.cos(a) * rad * k, py = sy(r.y) + Math.sin(a) * rad * k;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = hopper.riding === r.id ? "#8b95a6" : C.rock;
    ctx.fill();
  }

  function draw() {
    const ctx = stage.ctx;
    A.clear(stage);

    // home band
    ctx.fillStyle = "rgba(61,220,151,0.08)";
    ctx.fillRect(0, 0, stage.w, sy(GOAL_Y));
    ctx.fillStyle = C.good;
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText("HOME", stage.w - 50, 10);

    // ground
    ctx.fillStyle = "#1a2130";
    ctx.fillRect(0, sy(0) - 4, stage.w, 4);

    for (const r of field.rocks) drawRock(r);

    // noisy measurements
    if (noiseToggle.checked) {
      ctx.strokeStyle = C.measure; ctx.lineWidth = 1;
      for (const id in obs) {
        const [x, y] = obs[id];
        ctx.beginPath();
        ctx.moveTo(sx(x) - 3, sy(y) - 3); ctx.lineTo(sx(x) + 3, sy(y) + 3);
        ctx.moveTo(sx(x) + 3, sy(y) - 3); ctx.lineTo(sx(x) - 3, sy(y) + 3);
        ctx.stroke();
      }
    }

    // predictions for next step
    ctx.strokeStyle = C.estimate; ctx.lineWidth = 1.2;
    for (const id in preds) {
      const p = preds[id];
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), CATCH * s(), 0, 6.3); ctx.stroke();
    }

    // jump reach
    ctx.strokeStyle = "rgba(61,220,151,0.35)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(sx(hopper.pos.x), sy(hopper.pos.y), JUMP * 0.9 * s(), 0, 6.3); ctx.stroke();
    ctx.setLineDash([]);

    // jump flashes
    flash = flash.filter((f) => (f.t -= 0.04) > 0);
    for (const f of flash) {
      ctx.strokeStyle = f.ok ? `rgba(61,220,151,${f.t})` : `rgba(255,107,107,${f.t})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx(f.from.x), sy(f.from.y)); ctx.lineTo(sx(f.to.x), sy(f.to.y)); ctx.stroke();
    }

    // the agent
    const ax = sx(hopper.pos.x), ay = sy(hopper.pos.y) - 6;
    ctx.fillStyle = C.good;
    ctx.beginPath(); ctx.moveTo(ax, ay - 8); ctx.lineTo(ax - 6, ay + 5); ctx.lineTo(ax + 6, ay + 5); ctx.closePath(); ctx.fill();

    A.hud(stage, [
      "hops " + stats.hops + " · home " + stats.home + " · missed " + stats.falls,
      "prediction error · kalman " + (stats.errKF * 1000).toFixed(1) + " · raw " + (stats.errRaw * 1000).toFixed(1),
    ]);
  }

  document.getElementById("kf-play").onclick = (e) => {
    playing = !playing;
    e.target.textContent = playing ? "Pause" : "Play";
  };
  document.getElementById("kf-reset").onclick = reset;
  modeSel.addEventListener("change", () => {
    stats.hops = stats.home = stats.falls = 0;
    hopper.reset();
  });

  reset();
  A.loop(canvas, (dt) => {
    if (playing) {
      timer += dt * speed.get();
      let guard = 0;
      while (timer > 1 && guard++ < 10) { timer -= 1; step(); }
    }
    draw();
  });
})(window.AI4R);
