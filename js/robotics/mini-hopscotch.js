/* ============================================================
   Mini HopScotch (robotics journey, scene 4)
   Asteroids drift with noisy readings; a Kalman-style estimate
   predicts each one's next spot and a ship hops between them.
   Returns { start(), stop() }.
   ============================================================ */
window.RoboMini = window.RoboMini || {};
window.RoboMini.hopscotch = function (canvas) {
  "use strict";
  var ctx = canvas.getContext("2d"), rocks = [], ship = { x: 0.5, y: 0.92, on: null, t: 0, from: null }, misses = 0, hops = 0, seed = 3;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function gauss() { return (rnd() + rnd() + rnd() - 1.5) * 1.2; }
  for (var i = 0; i < 14; i++) rocks.push({ x: rnd(), y: 0.1 + rnd() * 0.75, vx: (rnd() - 0.5) * 0.12, vy: (rnd() - 0.5) * 0.05, r: 0.025 + rnd() * 0.02, ex: 0, ey: 0, evx: 0, evy: 0 });
  rocks.forEach(function (r) { r.ex = r.x; r.ey = r.y; });

  var running = false, last = 0, hopTimer = 0;
  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr)) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // physics + a simple filter (blend prediction with the noisy reading)
    rocks.forEach(function (r) {
      r.x += r.vx * dt; r.y += r.vy * dt;
      if (r.x < 0.03 || r.x > 0.97) r.vx *= -1; if (r.y < 0.05 || r.y > 0.9) r.vy *= -1;
      r.mx = r.x + gauss() * 0.02; r.my = r.y + gauss() * 0.02;          // noisy measurement
      var px = r.ex + r.evx * dt, py = r.ey + r.evy * dt, K = 0.25;       // predict, then correct
      r.evx += ((r.mx - px) / Math.max(dt, 0.001)) * K * 0.08; r.evy += ((r.my - py) / Math.max(dt, 0.001)) * K * 0.08;
      r.ex = px + (r.mx - px) * K; r.ey = py + (r.my - py) * K;
    });
    // hop every 1.2 s to the best predicted rock above the ship
    hopTimer += dt;
    if (ship.from) { ship.t += dt * 2.2; if (ship.t >= 1) { ship.from = null; var tr = ship.on; var d = Math.hypot(tr.x - ship.x, tr.y - ship.y); if (d > tr.r + 0.02) misses++; else hops++; } }
    else if (hopTimer > 1.2) {
      hopTimer = 0; var best = null, bd = 1;
      rocks.forEach(function (r) { var ny = r.ey + r.evy * 0.45, nx = r.ex + r.evx * 0.45; if (ny < ship.y - 0.05 && ny > ship.y - 0.35 && Math.abs(nx - ship.x) < 0.3) { var dd = Math.hypot(nx - ship.x, ny - ship.y); if (dd < bd) { bd = dd; best = r; } } });
      if (best) { ship.from = { x: ship.x, y: ship.y }; ship.on = best; ship.t = 0; }
      else if (ship.y < 0.9) { ship.from = { x: ship.x, y: ship.y }; ship.on = { x: 0.5, y: 0.92, r: 1 }; ship.t = 0; }
    }
    if (ship.from) { var tx = ship.on.ex != null ? ship.on.ex + ship.on.evx * 0.45 * (1 - ship.t) : ship.on.x, ty = ship.on.ey != null ? ship.on.ey + ship.on.evy * 0.45 * (1 - ship.t) : ship.on.y; ship.x = ship.from.x + (tx - ship.from.x) * ship.t; ship.y = ship.from.y + (ty - ship.from.y) * ship.t; }
    else if (ship.on && ship.on.ex != null) { ship.x = ship.on.x; ship.y = ship.on.y; }
    if (ship.y < 0.12) { ship.x = 0.5; ship.y = 0.92; ship.on = null; ship.from = null; ship.t = 0; }

    ctx.fillStyle = "#0b0f17"; ctx.fillRect(0, 0, w, h);
    rocks.forEach(function (r) {
      ctx.fillStyle = "#b69cff"; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(r.mx * w, r.my * h, 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = "#8a8f9c"; ctx.beginPath(); ctx.arc(r.x * w, r.y * h, r.r * w, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffd166"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc((r.ex + r.evx * 0.45) * w, (r.ey + r.evy * 0.45) * h, r.r * w + 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.fillStyle = "#3ddc97"; ctx.beginPath(); ctx.moveTo(ship.x * w, ship.y * h - 9); ctx.lineTo(ship.x * w + 7, ship.y * h + 7); ctx.lineTo(ship.x * w - 7, ship.y * h + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#9aa4b2"; ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
    ctx.fillText("purple = noisy reading · yellow = predicted landing · hops " + hops + " · misses " + misses, 8, h - 8);
    requestAnimationFrame(frame);
  }
  return { start: function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }, stop: function () { running = false; } };
};
