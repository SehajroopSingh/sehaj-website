/* ============================================================
   Demo wiring. Two modes:
   - "astar":  deliver boxes in order, animating each A* search
   - "policy": value-iteration policy under stochastic motion
   ============================================================ */
(function (A) {
  const C = A.colors;
  const canvas = document.getElementById("wh-canvas");
  const stage = A.makeStage(canvas, 12 / 18);

  const speed = A.slider("wh-speed", null, 0);
  const probSlider = A.slider("wh-prob", recomputePolicy, 2);
  const floorToggle = document.getElementById("wh-floor");
  const statusEl = document.getElementById("wh-status");
  const policyOnly = document.querySelectorAll(".policy-only");

  let wh, mode = "astar";
  // A* animation state
  let anim;
  // policy state
  let target = 1, vi, bot;

  // ---------- A* delivery animation ----------
  function startDelivery() {
    wh.grid = wh.initialGrid.map((row) => row.slice());
    anim = { robot: { ...wh.dropzone }, carrying: null, queue: wh.todo.slice(), leg: null, total: 0, expandedTotal: 0, t: 0, done: false };
    nextLeg();
  }

  function nextLeg() {
    if (!anim.carrying && !anim.queue.length) { anim.done = true; anim.leg = null; return; }
    const goingForBox = !anim.carrying;
    const box = goingForBox ? anim.queue[0] : anim.carrying;
    const target = goingForBox ? wh.boxes[box] : wh.dropzone;
    const res = A.astar(wh, anim.robot, target, goingForBox ? null : { notOn: wh.dropzone });
    anim.leg = { res, phase: "search", shown: 0, step: 0, box, goingForBox };
    anim.expandedTotal += res.expanded.length;
    if (!res.path) anim.done = true;
  }

  function tickDelivery(dt) {
    const leg = anim.leg;
    if (!leg || anim.done) return;
    const rate = speed.get();
    if (leg.phase === "search") {
      leg.shown += dt * rate * 14;
      if (leg.shown >= leg.res.expanded.length) { leg.phase = "move"; anim.t = 0; }
    } else if (leg.phase === "move") {
      anim.t += dt * rate;
      while (anim.t > 1 && leg.step < leg.res.path.length - 1) {
        anim.t -= 1; leg.step++;
        anim.robot = leg.res.path[leg.step];
      }
      if (leg.step >= leg.res.path.length - 1) { leg.phase = "act"; anim.t = 0; }
    } else if (leg.phase === "act") {
      anim.t += dt * rate;
      if (anim.t > 1.5) {
        anim.total += leg.res.cost + (leg.goingForBox ? 4 : 2); // lift 4, set down 2
        if (leg.goingForBox) {
          const b = wh.boxes[leg.box];
          wh.grid[b.r][b.c] = ".";
          anim.carrying = leg.box;
          anim.queue.shift();
        } else {
          anim.carrying = null;
        }
        nextLeg();
      }
    }
    statusEl.textContent = anim.done
      ? "All boxes delivered · total cost " + anim.total + " · cells expanded " + anim.expandedTotal
      : (leg.goingForBox ? "Searching for box " + leg.box : "Returning box " + leg.box + " to the dropzone") +
        " · cost so far " + anim.total;
  }

  // ---------- Stochastic policy ----------
  function recomputePolicy() {
    if (!wh || mode !== "policy") return;
    wh.grid = wh.initialGrid.map((row) => row.slice());
    vi = A.valueIteration(wh, wh.boxes[target], probSlider.get(), floorToggle.checked);
    bot = { cell: { ...wh.dropzone }, t: 0, bumps: 0, trips: 0, flash: null, pathCost: 0 };
    statusEl.textContent = "Target: box " + target + " · converged in " + vi.sweeps + " sweeps · click a box to retarget, click floor to add/remove a wall";
  }

  function tickPolicy(dt) {
    bot.t += dt * speed.get();
    if (bot.t < 1) return;
    bot.t = 0;
    const a = vi.policy[bot.cell.r][bot.cell.c];
    if (a === -1 || a == null) { bot.trips++; bot.flash = { ...bot.cell, k: 1 }; bot.cell = { ...wh.dropzone }; return; }
    const res = A.sampleMove(wh, bot.cell, a, probSlider.get());
    if (res.bumped) { bot.bumps++; bot.flash = { ...bot.cell, k: 1, bad: true }; }
    bot.cell = res.cell;
  }

  // ---------- Drawing ----------
  function geom() {
    const cs = Math.min(stage.w / wh.cols, stage.h / wh.rows);
    return { cs, ox: (stage.w - cs * wh.cols) / 2, oy: (stage.h - cs * wh.rows) / 2 };
  }

  function heat(v, lo, hi) {
    // low cost = bright teal, high cost = dark
    const t = Math.max(0, Math.min(1, (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo) || 1)));
    const r = Math.round(20 + (1 - t) * 30), g = Math.round(40 + (1 - t) * 150), b = Math.round(60 + (1 - t) * 110);
    return `rgb(${r},${g},${b})`;
  }

  function drawArrow(ctx, x, y, dir, len) {
    const d = A.DIRS[dir];
    const ux = d.dc / Math.hypot(d.dr, d.dc), uy = d.dr / Math.hypot(d.dr, d.dc);
    const x1 = x - ux * len / 2, y1 = y - uy * len / 2, x2 = x + ux * len / 2, y2 = y + uy * len / 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - ux * 5 - uy * 4, y2 - uy * 5 + ux * 4);
    ctx.moveTo(x2, y2); ctx.lineTo(x2 - ux * 5 + uy * 4, y2 - uy * 5 - ux * 4);
    ctx.stroke();
  }

  function draw() {
    const ctx = stage.ctx, { cs, ox, oy } = geom();
    A.clear(stage);
    const X = (c) => ox + c * cs, Y = (r) => oy + r * cs;

    // value range for heatmap
    let lo = Infinity, hi = 0;
    if (mode === "policy") for (const row of vi.value) for (const v of row) if (v < 4000) { lo = Math.min(lo, v); hi = Math.max(hi, v); }

    for (let r = 0; r < wh.rows; r++) for (let c = 0; c < wh.cols; c++) {
      const v = wh.grid[r][c];
      if (v === "#") ctx.fillStyle = C.wall;
      else if (mode === "policy" && (v === "." || v === "@") && vi.value[r][c] < 4000) ctx.fillStyle = heat(vi.value[r][c], lo, hi);
      else ctx.fillStyle = "#121925";
      ctx.fillRect(X(c) + 1, Y(r) + 1, cs - 2, cs - 2);
      if (v === "#") { ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(X(c) + 1, Y(r) + 1, cs - 2, 3); }
      if (mode === "policy" && floorToggle.checked && wh.floorCost[r][c] > 2 && v !== "#") {
        ctx.fillStyle = "rgba(0,0,0," + Math.min(0.35, wh.floorCost[r][c] / 30) + ")";
        ctx.fillRect(X(c) + 1, Y(r) + 1, cs - 2, cs - 2);
      }
    }

    // A*: expanded cells + path
    if (mode === "astar" && anim.leg) {
      const leg = anim.leg, n = Math.min(leg.res.expanded.length, Math.floor(leg.shown));
      for (let i = 0; i < n; i++) {
        const p = leg.res.expanded[i];
        ctx.fillStyle = "rgba(124,196,255," + (0.12 + 0.25 * (i / Math.max(1, n))) + ")";
        ctx.fillRect(X(p.c) + 1, Y(p.r) + 1, cs - 2, cs - 2);
      }
      if (leg.phase !== "search" && leg.res.path) {
        ctx.strokeStyle = C.estimate; ctx.lineWidth = 2.5; ctx.beginPath();
        leg.res.path.forEach((p, i) => (i ? ctx.lineTo(X(p.c) + cs / 2, Y(p.r) + cs / 2) : ctx.moveTo(X(p.c) + cs / 2, Y(p.r) + cs / 2)));
        ctx.stroke();
      }
    }

    // policy arrows
    if (mode === "policy") {
      ctx.strokeStyle = "rgba(230,235,242,0.75)"; ctx.lineWidth = 1.3;
      for (let r = 0; r < wh.rows; r++) for (let c = 0; c < wh.cols; c++) {
        const a = vi.policy[r][c];
        if (a != null && a >= 0 && vi.value[r][c] < 4000) drawArrow(ctx, X(c) + cs / 2, Y(r) + cs / 2, a, cs * 0.5);
        if (a === -1) { ctx.fillStyle = "rgba(255,209,102,0.9)"; ctx.beginPath(); ctx.arc(X(c) + cs / 2, Y(r) + cs / 2, 3, 0, 6.3); ctx.fill(); }
      }
    }

    // dropzone + boxes
    const dz = wh.dropzone;
    ctx.strokeStyle = C.good; ctx.lineWidth = 2;
    ctx.strokeRect(X(dz.c) + 3, Y(dz.r) + 3, cs - 6, cs - 6);
    ctx.font = "600 " + Math.round(cs * 0.45) + "px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let r = 0; r < wh.rows; r++) for (let c = 0; c < wh.cols; c++) {
      const v = wh.grid[r][c];
      if (v >= "1" && v <= "9") {
        const isTarget = mode === "policy" && Number(v) === target;
        ctx.fillStyle = isTarget ? "#ffb703" : "#c08a4a";
        ctx.fillRect(X(c) + 4, Y(r) + 4, cs - 8, cs - 8);
        ctx.fillStyle = "#1b1206"; ctx.fillText(v, X(c) + cs / 2, Y(r) + cs / 2 + 1);
      }
    }

    // robot
    const rb = mode === "astar" ? anim.robot : bot.cell;
    ctx.fillStyle = C.truth;
    ctx.beginPath(); ctx.arc(X(rb.c) + cs / 2, Y(rb.r) + cs / 2, cs * 0.32, 0, 6.3); ctx.fill();
    if (mode === "astar" && anim.carrying) {
      ctx.fillStyle = "#c08a4a"; ctx.fillRect(X(rb.c) + cs * 0.3, Y(rb.r) + cs * 0.3, cs * 0.4, cs * 0.4);
    }
    if (mode === "policy" && bot.flash) {
      const f = bot.flash;
      ctx.strokeStyle = f.bad ? `rgba(255,107,107,${f.k})` : `rgba(255,209,102,${f.k})`; ctx.lineWidth = 3;
      ctx.strokeRect(X(f.c) + 2, Y(f.r) + 2, cs - 4, cs - 4);
      f.k -= 0.03; if (f.k <= 0) bot.flash = null;
    }
    ctx.textAlign = "left";

    if (mode === "policy") A.hud(stage, ["lifts " + bot.trips + "   collisions " + bot.bumps]);
  }

  // ---------- Interaction ----------
  canvas.addEventListener("click", (e) => {
    if (mode !== "policy") return;
    const rect = canvas.getBoundingClientRect(), { cs, ox, oy } = geom();
    const c = Math.floor((e.clientX - rect.left - ox) / cs), r = Math.floor((e.clientY - rect.top - oy) / cs);
    if (!wh.inside({ r, c })) return;
    const v = wh.initialGrid[r][c];
    if (v >= "1" && v <= "9") target = Number(v);
    else if (v === "." || v === "#") wh.initialGrid[r][c] = v === "." ? "#" : ".";
    recomputePolicy();
  });

  function setMode(m) {
    mode = m;
    document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("primary", b.dataset.mode === m));
    policyOnly.forEach((el) => (el.style.display = m === "policy" ? "" : "none"));
    if (m === "astar") startDelivery(); else recomputePolicy();
  }
  document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  floorToggle.addEventListener("change", recomputePolicy);
  document.getElementById("wh-new").onclick = () => { newWarehouse(); setMode(mode); };

  function newWarehouse() {
    wh = new A.Warehouse();
    wh.initialGrid = wh.grid.map((row) => row.slice());
    target = 1;
  }

  newWarehouse();
  setMode("astar");
  A.loop(canvas, (dt) => {
    if (mode === "astar") tickDelivery(dt); else tickPolicy(dt);
    draw();
  });
})(window.AI4R);
