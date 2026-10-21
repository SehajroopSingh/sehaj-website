/* ============================================================
   Mini warehouse (robotics journey, scene 1)
   A small grid with shelves. A* plans a path from the robot to a
   box and back to the dropzone; the robot drives it, then a new
   box appears. Returns { start(), stop() }.
   ============================================================ */
window.RoboMini = window.RoboMini || {};
window.RoboMini.warehouse = function (canvas) {
  "use strict";
  var ctx = canvas.getContext("2d"), COLS = 16, ROWS = 10, grid = [], seed = 5;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (var y = 0; y < ROWS; y++) { grid.push([]); for (var x = 0; x < COLS; x++) grid[y].push(rnd() < 0.2 && !(x < 2 && y > ROWS - 3) ? 1 : 0); }
  var drop = { x: 0, y: ROWS - 1 }, robot = { x: 0, y: ROWS - 1 }, box = null, path = [], explored = [], step = 0, carrying = false, tAcc = 0;

  function astar(a, b) {
    var open = [{ x: a.x, y: a.y, g: 0, f: 0, p: null }], seen = {}, vis = [];
    while (open.length) {
      open.sort(function (u, v) { return u.f - v.f; });
      var n = open.shift(), k = n.x + "," + n.y;
      if (seen[k]) continue; seen[k] = n; vis.push(n);
      if (Math.max(Math.abs(n.x - b.x), Math.abs(n.y - b.y)) <= 1 && !(n.x === b.x && n.y === b.y)) {
        var out = []; for (var c = n; c; c = c.p) out.unshift({ x: c.x, y: c.y }); return { path: out, vis: vis };
      }
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = n.x + dx, ny = n.y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || grid[ny][nx] || (nx === b.x && ny === b.y)) continue;
        var g = n.g + (dx && dy ? 1.5 : 1), h = Math.max(Math.abs(nx - b.x), Math.abs(ny - b.y));
        open.push({ x: nx, y: ny, g: g, f: g + h, p: n });
      }
    }
    return { path: [], vis: vis };
  }
  function newBox() {
    do { box = { x: 3 + Math.floor(rnd() * (COLS - 3)), y: Math.floor(rnd() * (ROWS - 2)) }; } while (grid[box.y][box.x]);
    carrying = false; plan(box);
  }
  function plan(goal) { var r = astar(robot, goal); path = r.path; explored = r.vis; step = 0; }
  newBox();

  var running = false, last = 0;
  function frame(t) {
    if (!running) return;
    var dt = (t - last) / 1000 || 0; last = t; tAcc += dt;
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr)) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cs = Math.min(w / COLS, h / ROWS), ox = (w - cs * COLS) / 2, oy = (h - cs * ROWS) / 2;
    if (tAcc > 0.16) {
      tAcc = 0;
      if (step < path.length - 1) { step++; robot = { x: path[step].x, y: path[step].y }; }
      else if (!carrying) { carrying = true; plan(drop); }
      else newBox();
    }
    ctx.fillStyle = "#0b0f17"; ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      ctx.fillStyle = grid[y][x] ? "#56627a" : "rgba(255,255,255,.04)";
      ctx.fillRect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2);
    }
    explored.forEach(function (n) { ctx.fillStyle = "rgba(124,196,255,.14)"; ctx.fillRect(ox + n.x * cs + 1, oy + n.y * cs + 1, cs - 2, cs - 2); });
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.beginPath();
    path.forEach(function (n, i) { var px = ox + (n.x + 0.5) * cs, py = oy + (n.y + 0.5) * cs; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    ctx.fillStyle = "#3ddc97"; ctx.fillRect(ox + drop.x * cs + 2, oy + drop.y * cs + 2, cs - 4, cs - 4);
    if (!carrying) { ctx.fillStyle = "#c9a06b"; ctx.fillRect(ox + box.x * cs + 4, oy + box.y * cs + 4, cs - 8, cs - 8); }
    ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(ox + (robot.x + 0.5) * cs, oy + (robot.y + 0.5) * cs, cs * 0.34, 0, 7); ctx.fill();
    if (carrying) { ctx.fillStyle = "#c9a06b"; ctx.fillRect(ox + (robot.x + 0.5) * cs - cs * 0.2, oy + (robot.y + 0.5) * cs - cs * 0.2, cs * 0.4, cs * 0.4); }
    ctx.fillStyle = "#9aa4b2"; ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
    ctx.fillText(carrying ? "carrying box → dropzone" : "A* to the next box · blue = cells explored", 8, h - 8);
    requestAnimationFrame(frame);
  }
  return { start: function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }, stop: function () { running = false; } };
};
