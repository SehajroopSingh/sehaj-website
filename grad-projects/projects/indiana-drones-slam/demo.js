/* ============================================================
   Demo wiring: runs missions and draws truth vs. beliefs.
   ============================================================ */
(function (A) {
  const C = A.colors;
  const canvas = document.getElementById("slam-canvas");
  const stage = A.makeStage(canvas, 0.75);

  const speed = A.slider("slam-speed", null, 0);
  const showTruth = document.getElementById("slam-truth");
  const modeSel = document.getElementById("slam-mode");
  const tallyEl = document.getElementById("slam-tally");

  let mission, playing = true, timer = 0, pauseAfter = 0;
  const tally = { slam: { found: 0, total: 0 }, dr: { found: 0, total: 0 } };

  function newMission() { mission = new A.Mission(modeSel.value); pauseAfter = 0; }

  function finish() {
    const t = tally[mission.navMode];
    t.total++;
    if (mission.outcome === "found") t.found++;
    tallyEl.textContent = "Treasures found · SLAM " + tally.slam.found + "/" + tally.slam.total +
      " · dead reckoning " + tally.dr.found + "/" + tally.dr.total;
  }

  // world meters -> screen
  function view() {
    const b = mission.world.bounds;
    const k = Math.min(stage.w / (b.x1 - b.x0), stage.h / (b.y1 - b.y0));
    return { k, sx: (x) => (x - b.x0) * k, sy: (y) => stage.h - (y - b.y0) * k };
  }

  function path(pts, color, dash, v) {
    const ctx = stage.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.setLineDash(dash || []);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(v.sx(p.x), v.sy(p.y)) : ctx.moveTo(v.sx(p.x), v.sy(p.y))));
    ctx.stroke(); ctx.setLineDash([]);
  }

  function draw() {
    const ctx = stage.ctx, v = view(), w = mission.world;
    A.clear(stage);

    // true trees (faint) — what the drone does NOT know
    if (showTruth.checked) {
      ctx.fillStyle = "rgba(61,220,151,0.16)";
      for (const t of w.trees) { ctx.beginPath(); ctx.arc(v.sx(t.x), v.sy(t.y), t.r * v.k, 0, 6.3); ctx.fill(); }
    }

    // sensing range + sight lines
    const d = w.drone;
    ctx.strokeStyle = "rgba(124,196,255,0.25)"; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(v.sx(d.x), v.sy(d.y), w.horizon * v.k, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(182,156,255,0.4)";
    for (const id in mission.meas) {
      const t = w.trees.find((tt) => tt.id === id);
      ctx.beginPath(); ctx.moveTo(v.sx(d.x), v.sy(d.y)); ctx.lineTo(v.sx(t.x), v.sy(t.y)); ctx.stroke();
    }

    // SLAM map of trees
    ctx.strokeStyle = C.estimate; ctx.lineWidth = 1.5;
    for (const t of mission.slam.trees) { ctx.beginPath(); ctx.arc(v.sx(t.x), v.sy(t.y), t.r * v.k, 0, 6.3); ctx.stroke(); }

    // treasure
    const tx = v.sx(w.treasure.x), ty = v.sy(w.treasure.y);
    ctx.fillStyle = "#ffb703";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 10;
      ctx.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r);
    }
    ctx.fill();

    // paths
    path(mission.paths.dr, "#8b95a6", [5, 5], v);
    path(mission.paths.slam, C.estimate, null, v);
    if (showTruth.checked) path(mission.paths.truth, C.truth, null, v);

    // drone (true) + beliefs
    const s = mission.slam.pose;
    ctx.fillStyle = C.estimate; ctx.beginPath(); ctx.arc(v.sx(s.x), v.sy(s.y), 4, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#8b95a6"; ctx.beginPath(); ctx.arc(v.sx(mission.dr.x), v.sy(mission.dr.y), 4, 0, 6.3); ctx.fill();
    ctx.save();
    ctx.translate(v.sx(d.x), v.sy(d.y)); ctx.rotate(-d.h);
    ctx.fillStyle = C.truth;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore();

    const e = mission.errors();
    const lines = [
      "navigating with " + (mission.navMode === "slam" ? "SLAM" : "dead reckoning") + " · step " + mission.steps,
      "trees mapped " + mission.slam.trees.length,
      "error  SLAM " + e.slam.toFixed(2) + " m · dead reckoning " + e.dr.toFixed(2) + " m",
    ];
    if (mission.outcome) {
      const msg = { found: "Treasure extracted!", missed: "Missed: dug " + (mission.missBy || 0).toFixed(2) + " m away",
        crashed: "Crashed into a tree", timeout: "Ran out of time" }[mission.outcome];
      lines.push(msg);
    }
    A.hud(stage, lines);
  }

  document.getElementById("slam-play").onclick = (e) => {
    playing = !playing;
    e.target.textContent = playing ? "Pause" : "Play";
  };
  document.getElementById("slam-new").onclick = newMission;
  modeSel.addEventListener("change", newMission);

  newMission();
  A.loop(canvas, (dt) => {
    if (playing) {
      if (mission.outcome) {
        pauseAfter += dt;
        if (pauseAfter > 2.2) newMission();
      } else {
        timer += dt * speed.get();
        while (timer > 1 && !mission.outcome) {
          timer -= 1;
          mission.step();
          if (mission.outcome) finish();
        }
      }
    }
    draw();
  });
})(window.AI4R);
