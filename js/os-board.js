/* ============================================================
   Operating Systems section · CPU motherboard (projects.html)
   ------------------------------------------------------------
   A dark circuit board with a CPU in the middle. When the board
   scrolls into view the CPU powers on, the traces light up from
   the chip outward, and project nodes pop up at the edges.

   Hover (or tap) a node: light runs along its trace from the CPU
   to the node, then that project's panel expands out of the node
   with its live animation (grad-projects/shared/os-anims.js) inside.

   TO ADD A PROJECT NODE: add a <button class="osb-node"> and a
   matching <div class="osb-panel"> in projects.html, then add an
   entry to NODES below with where it sits on the board.
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("os-board");
  if (!root) return;
  var canvas = root.querySelector(".osb-canvas");
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Where each project node sits, as fractions of the board (desktop / phone),
  // and which animation its panel runs.
  // `port` is where the trace leaves the chip edge (-0.5 .. 0.5 along that edge).
  var NODES = [
    { id: "aos",   desk: [0.11, 0.3],  phone: [0.24, 0.17], port: -0.25, anim: "scheduler" },
    { id: "mips",  desk: [0.14, 0.76], phone: [0.76, 0.17], port: 0.25,  anim: "mips" },
    { id: "infos", desk: [0.89, 0.58], phone: [0.5, 0.86],  port: 0.15,  anim: "buddy" },
  ];

  var W = 0, H = 0, mobile = false, cpu = {}, traces = [], pads = [], parts = [];
  var powerAt = null;           // time the CPU switched on
  var open = null;              // node id whose panel is open
  var hover = null;             // node id being hovered / focused

  NODES.forEach(function (n) {
    n.btn = root.querySelector('.osb-node[data-node="' + n.id + '"]');
    n.panel = root.querySelector('.osb-panel[data-panel="' + n.id + '"]');
    n.fill = 0;                 // 0..1 how far the light has run along the trace
    var c = n.panel.querySelector("canvas"), r = n.panel.querySelector(".osb-read");
    n.player = window.OSAnims && window.OSAnims[n.anim] ? window.OSAnims[n.anim](c, r) : { start: function () {}, stop: function () {} };
  });

  /* ---------- seeded random so the board is the same every visit ---------- */
  var seed = 7;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  /* ---------- layout ---------- */
  function polyLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

  function build() {
    var w = root.clientWidth;
    mobile = w < 760;
    var h = root.clientHeight || (mobile ? 760 : 680);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w; H = h;
    var S = Math.round(Math.min(W, H) * (mobile ? 0.34 : 0.27));
    cpu = { x: W / 2, y: H / 2, s: S, die: S * 0.56 };

    // decorative traces leaving the chip on all four sides
    seed = 7; traces = []; pads = []; parts = [];
    var sides = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    sides.forEach(function (d) {
      var count = mobile ? 7 : 11;
      for (var i = 0; i < count; i++) {
        var t = (i + 0.5) / count - 0.5;
        var sx = cpu.x + d[0] * S / 2 + (d[0] === 0 ? t * S * 0.86 : 0);
        var sy = cpu.y + d[1] * S / 2 + (d[1] === 0 ? t * S * 0.86 : 0);
        var pts = [[sx, sy]], L1 = 18 + rnd() * 60;
        var x = sx + d[0] * L1, y = sy + d[1] * L1; pts.push([x, y]);
        var bend = (rnd() < 0.5 ? -1 : 1), L2 = 20 + rnd() * 70;
        // 45° jog sideways, then straight out again
        x += d[0] * L2 + (d[0] === 0 ? bend * L2 : 0); y += d[1] * L2 + (d[1] === 0 ? bend * L2 : 0); pts.push([x, y]);
        var L3 = 40 + rnd() * (d[0] === 0 ? H * 0.25 : W * 0.3);
        x += d[0] * L3; y += d[1] * L3;
        // keep every trace inside the fade radius, so none runs off the canvas edge (which would show once the board is scaled into the phone)
        var Rk = Math.min(W, H) * 0.62 * 0.92, dxk = x - cpu.x, dyk = y - cpu.y, dk = Math.hypot(dxk, dyk);
        if (dk > Rk) { var prev = pts[pts.length - 1], back = (dk - Rk); x -= d[0] * back; y -= d[1] * back; if ((x - prev[0]) * d[0] + (y - prev[1]) * d[1] < 10) { x = prev[0] + d[0] * 10; y = prev[1] + d[1] * 10; } }
        pts.push([x, y]);
        traces.push({ pts: pts, len: polyLen(pts), w: rnd() < 0.2 ? 2 : 1.2, delay: rnd() * 0.35, pulse: rnd() < 0.35 ? rnd() : -1 });
        pads.push({ x: x, y: y, r: 2 + rnd() * 2.5 });
      }
    });
    // little surface-mount parts scattered over the board
    for (var k = 0; k < (mobile ? 18 : 34); k++) {
      var px = rnd() * W, py = rnd() * H;
      if (Math.abs(px - cpu.x) < S * 0.9 && Math.abs(py - cpu.y) < S * 0.9) continue;
      parts.push({ x: px, y: py, w: 8 + rnd() * 26, h: 5 + rnd() * 14, rot: rnd() < 0.5 ? 0 : Math.PI / 2 });
    }

    // main traces from the chip to each project node
    NODES.forEach(function (n, idx) {
      var f = mobile ? n.phone : n.desk, nx = f[0] * W, ny = f[1] * H, pts;
      if (!mobile) {
        var left = nx < cpu.x, ex = cpu.x + (left ? -1 : 1) * S / 2, ey = cpu.y + n.port * S;
        var x1 = ex + (left ? -1 : 1) * 46, dy = ny - ey, x2 = x1 + (left ? -1 : 1) * Math.abs(dy);
        pts = [[ex, ey], [x1, ey], [x2, ny], [nx + (left ? 22 : -22), ny]];
      } else {
        var up = ny < cpu.y, sy = cpu.y + (up ? -1 : 1) * S / 2, sx = cpu.x + n.port * S;
        var y1 = sy + (up ? -1 : 1) * 30, dx = nx - sx, y2 = y1 + (up ? -1 : 1) * Math.abs(dx);
        pts = [[sx, sy], [sx, y1], [nx, y2], [nx, ny + (up ? 22 : -22)]];
      }
      n.x = nx; n.y = ny; n.pts = pts; n.len = polyLen(pts);
      n.btn.style.left = nx + "px"; n.btn.style.top = ny + "px";
      n.btn.classList.toggle("osb-node--right", !mobile && nx > cpu.x);
      n.btn.classList.toggle("osb-node--below", mobile && ny > cpu.y);
      placePanel(n);
    });
  }

  function placePanel(n) {
    var p = n.panel, pw = mobile ? W - 16 : Math.min(580, W * 0.6);
    p.style.width = pw + "px";
    var ph = p.offsetHeight || 460, left, top;
    if (!mobile) {
      left = n.x < cpu.x ? n.x + 36 : n.x - 36 - pw;
      top = Math.max(8, Math.min(H - ph - 8, n.y - ph / 2));
    } else {
      left = 8;
      top = n.y < cpu.y ? n.y + 34 : n.y - 34 - ph;
      top = Math.max(8, Math.min(H - ph - 8, top));
    }
    p.style.left = left + "px"; p.style.top = top + "px";
    p.style.transformOrigin = (n.x - left) + "px " + (n.y - top) + "px";
  }

  /* ---------- drawing helpers ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // stroke the first `frac` of a polyline
  function strokePart(pts, len, frac) {
    var want = len * frac, done = 0;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length && want > done; i++) {
      var a = pts[i - 1], b = pts[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (done + seg <= want) ctx.lineTo(b[0], b[1]);
      else { var k = (want - done) / seg; ctx.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k); }
      done += seg;
    }
    ctx.stroke();
  }
  function pointAt(pts, len, frac) {
    var want = len * frac, done = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (done + seg >= want) { var k = (want - done) / seg; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
      done += seg;
    }
    return pts[pts.length - 1];
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* ---------- frame ---------- */
  var introK = 0, IN = window.Timing.phone.intro, FLAT = (window.Constellation && window.Constellation.BG) || "#05091a";
  function win(x, w) { return ease((x - w[0]) / (w[1] - w[0])); }
  function drawIntro(t) {
    var k = introK, nodesK = win(k, IN.nodes), linesK = win(k, IN.lines), chipK = win(k, IN.chip), boardK = win(k, IN.board);
    window.Constellation.draw(ctx, W, H, { alpha: 1, stars: 1 - boardK, bg: 1 - boardK }, mobile);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // stars at every pad and at the three project nodes, brightening one after another
    var ends = pads.map(function (p) { return { x: p.x, y: p.y, r: 1.2 + p.r * 0.6 }; }).concat(NODES.map(function (n) { var e = n.pts[n.pts.length - 1]; return { x: e[0], y: e[1], r: 5, big: true }; }));
    ends.forEach(function (e, i) {
      var kk = ease((nodesK - (i % 7) * 0.08) / 0.5); if (kk <= 0) return;
      var gl = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
      gl.addColorStop(0, "rgba(160,210,255," + (0.5 * kk) + ")"); gl.addColorStop(1, "rgba(160,210,255,0)");
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 5, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(235,245,255," + kk + ")"; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (e.big ? 0.9 : 0.8), 0, 7); ctx.fill();
    });
    // the traces, drawn from their far ends in toward the chip
    traces.forEach(function (tr) {
      var kk = ease((linesK - tr.delay * 0.8) / 0.7); if (kk <= 0) return;
      var rp = tr.pts.slice().reverse();
      ctx.strokeStyle = "rgba(120,180,255," + (0.3 + 0.45 * kk) + ")"; ctx.lineWidth = tr.w; ctx.shadowColor = "#4fc3ff"; ctx.shadowBlur = 6; strokePart(rp, tr.len, kk); ctx.shadowBlur = 0;
    });
    NODES.forEach(function (n, i) {
      var kk = ease((linesK - i * 0.1) / 0.7); if (kk <= 0) return;
      var rp = n.pts.slice().reverse();
      ctx.strokeStyle = "rgba(140,200,255," + (0.4 + 0.5 * kk) + ")"; ctx.lineWidth = 3; ctx.shadowColor = "#4fc3ff"; ctx.shadowBlur = 12; strokePart(rp, n.len, kk); ctx.shadowBlur = 0;
      var head = pointAt(rp, n.len, kk); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(head[0], head[1], 3, 0, 7); ctx.fill();
    });
    if (chipK > 0) {
      ctx.strokeStyle = "rgba(160,200,255," + (0.7 * chipK) + ")"; ctx.lineWidth = 1.5; ctx.shadowColor = "#3aa0ff"; ctx.shadowBlur = 18 * chipK;
      ctx.strokeRect(cpu.x - cpu.s / 2, cpu.y - cpu.s / 2, cpu.s, cpu.s); ctx.shadowBlur = 0;
    }
  }
  function draw(t, dt) {
    var on = powerAt === null ? 0 : (t - powerAt) / 1000;   // seconds since power-on
    var chip = reduce ? (on > 0 ? 1 : 0) : ease((on - 0.25) / 0.35);
    var flicker = !reduce && on > 0 && on < 0.25 ? (Math.sin(on * 90) > 0 ? 0.6 : 0.1) : 0;
    var lit = Math.max(chip, flicker);

    ctx.clearRect(0, 0, W, H);
    // the intro: the star sky the previous section ended on; stars brighten at every pad and node, the traces draw
    // in from them to the chip, the chip outline appears, then the board comes up (scroll-driven: introK 0..1)
    if (introK < 1 && window.Constellation) { drawIntro(t); return; }
    // the board is painted opaque, and everything on it fades to one flat colour (FLAT, shared with the stage, the
    // phone screen and the star sky) well before the canvas edge — so when the canvas is scaled down inside the
    // phone there is no visible rectangle: the board simply dissolves into the phone's screen colour
    var R = Math.min(W, H) * 0.62;
    var g = ctx.createRadialGradient(cpu.x, cpu.y, 0, cpu.x, cpu.y, R);
    g.addColorStop(0, "#0a1640"); g.addColorStop(0.55, "#060b1f"); g.addColorStop(1, FLAT);
    ctx.fillStyle = FLAT; ctx.fillRect(0, 0, W, H); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(cpu.x, cpu.y, 0, cpu.x, cpu.y, R);
    glow.addColorStop(0, "rgba(40,90,255," + (0.08 + 0.22 * lit) + ")"); glow.addColorStop(1, "rgba(10,20,60,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // dot grid, fading out toward the edges
    for (var gx = 12; gx < W; gx += 22) for (var gy = 12; gy < H; gy += 22) {
      var fd = 1 - Math.min(1, Math.hypot(gx - cpu.x, gy - cpu.y) / R); if (fd <= 0) continue;
      ctx.fillStyle = "rgba(120,160,255," + (0.12 * fd) + ")"; ctx.fillRect(gx, gy, 1.2, 1.2);
    }
    // parts
    parts.forEach(function (p) {
      var fd = 1 - Math.min(1, Math.hypot(p.x - cpu.x, p.y - cpu.y) / R); if (fd <= 0.05) return;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = fd;
      ctx.fillStyle = "rgba(90,120,200,.10)"; ctx.strokeStyle = "rgba(120,160,255," + (0.12 + 0.12 * lit) + ")"; ctx.lineWidth = 1;
      rr(-p.w / 2, -p.h / 2, p.w, p.h, 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });

    // decorative traces: dim copper always, then light running outward after power-on
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    traces.forEach(function (tr) {
      ctx.strokeStyle = "rgba(90,130,230,.16)"; ctx.lineWidth = tr.w; strokePart(tr.pts, tr.len, 1);
      var rev = reduce ? (on > 0 ? 1 : 0) : ease((on - 0.45 - tr.delay) / 0.9);
      if (rev > 0) {
        ctx.strokeStyle = "rgba(90,180,255,.75)"; ctx.lineWidth = tr.w; ctx.shadowColor = "#3aa0ff"; ctx.shadowBlur = 8;
        strokePart(tr.pts, tr.len, rev); ctx.shadowBlur = 0;
        if (tr.pulse >= 0 && rev >= 1 && !reduce) {
          var q = pointAt(tr.pts, tr.len, (tr.pulse + t / 2600) % 1);
          ctx.fillStyle = "#cfe8ff"; ctx.beginPath(); ctx.arc(q[0], q[1], 1.8, 0, 7); ctx.fill();
        }
      }
    });
    pads.forEach(function (p, i) {
      var rev = traces[i] ? (reduce ? (on > 0 ? 1 : 0) : ease((on - 0.45 - traces[i].delay) / 0.9)) : 0;
      ctx.fillStyle = rev >= 1 ? "rgba(140,200,255,.9)" : "rgba(90,130,230,.25)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });

    // main traces to the project nodes
    NODES.forEach(function (n) {
      var want = hover === n.id || open === n.id ? 1 : 0;
      var speed = 2.4;                                    // ~0.4 s for the light to reach the node
      n.fill += (want ? 1 : -1.6) * speed * dt;
      n.fill = Math.max(0, Math.min(1, n.fill));
      if (want && n.fill >= 1 && open !== n.id && chip >= 1) openPanel(n);
      var base = reduce ? (on > 0 ? 1 : 0) : ease((on - 0.7) / 0.6);
      ctx.strokeStyle = "rgba(90,130,230," + (0.25 + 0.3 * base) + ")"; ctx.lineWidth = 3; strokePart(n.pts, n.len, 1);
      if (n.fill > 0) {
        ctx.strokeStyle = "#9fe1ff"; ctx.lineWidth = 3.5; ctx.shadowColor = "#4fc3ff"; ctx.shadowBlur = 16;
        strokePart(n.pts, n.len, n.fill); ctx.shadowBlur = 0;
        var head = pointAt(n.pts, n.len, n.fill);
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(head[0], head[1], 3.5, 0, 7); ctx.fill();
      }
    });

    // the CPU
    var S = cpu.s, x0 = cpu.x - S / 2, y0 = cpu.y - S / 2;
    ctx.shadowColor = "rgba(60,160,255," + (0.9 * lit) + ")"; ctx.shadowBlur = 50 * lit;
    ctx.fillStyle = "#0e1630"; rr(x0, y0, S, S, 10); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(140,200,255," + (0.25 + 0.6 * lit) + ")"; ctx.lineWidth = 1.5; rr(x0, y0, S, S, 10); ctx.stroke();
    // pins around the edge
    var pins = 14;
    ctx.fillStyle = "rgba(200,220,255," + (0.25 + 0.5 * lit) + ")";
    for (var i = 0; i < pins; i++) {
      var o = S * 0.1 + (S * 0.8) * i / (pins - 1);
      ctx.fillRect(x0 + o - 1.5, y0 + 6, 3, 6); ctx.fillRect(x0 + o - 1.5, y0 + S - 12, 3, 6);
      ctx.fillRect(x0 + 6, y0 + o - 1.5, 6, 3); ctx.fillRect(x0 + S - 12, y0 + o - 1.5, 6, 3);
    }
    // die
    var D = cpu.die, dx = cpu.x - D / 2, dy = cpu.y - D / 2;
    var dg = ctx.createLinearGradient(dx, dy, dx + D, dy + D);
    dg.addColorStop(0, "rgba(" + Math.round(30 + 90 * lit) + "," + Math.round(40 + 180 * lit) + "," + Math.round(70 + 185 * lit) + ",1)");
    dg.addColorStop(1, "rgba(" + Math.round(20 + 20 * lit) + "," + Math.round(30 + 110 * lit) + "," + Math.round(60 + 170 * lit) + ",1)");
    ctx.shadowColor = "#5cc8ff"; ctx.shadowBlur = 30 * lit;
    ctx.fillStyle = dg; rr(dx, dy, D, D, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255," + (0.15 + 0.6 * lit) + ")"; ctx.lineWidth = 1; rr(dx, dy, D, D, 6); ctx.stroke();
    ctx.fillStyle = "rgba(8,18,40," + (0.35 + 0.5 * lit) + ")"; ctx.textAlign = "center";
    ctx.font = "700 " + Math.max(9, Math.round(D * 0.11)) + "px ui-monospace, Menlo, monospace";
    ctx.fillText("OPERATING", cpu.x, cpu.y - 2); ctx.fillText("SYSTEMS", cpu.x, cpu.y + D * 0.13);
    ctx.font = Math.max(8, Math.round(D * 0.08)) + "px ui-monospace, Menlo, monospace";
    ctx.fillText("VMs · kernel · MIPS", cpu.x, cpu.y + D * 0.3);

    // power-on flash ring
    if (!reduce && on > 0.25 && on < 1.1) {
      var k = (on - 0.25) / 0.85;
      ctx.strokeStyle = "rgba(160,220,255," + (1 - k) * 0.6 + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cpu.x, cpu.y, S * 0.6 + k * Math.max(W, H) * 0.45, 0, 7); ctx.stroke();
    }

    // nodes pop in once the traces reach the edges
    if (on > (reduce ? 0 : 1.35) && !root.classList.contains("osb-nodes-on")) root.classList.add("osb-nodes-on");
    if (on > 0.3 && !root.classList.contains("osb-powered")) root.classList.add("osb-powered");
  }

  /* ---------- panels ---------- */
  function openPanel(n) {
    if (open && open !== n.id) closePanel();
    open = n.id;
    placePanel(n);
    n.panel.hidden = false;
    requestAnimationFrame(function () { n.panel.classList.add("is-open"); placePanel(n); });
    n.btn.setAttribute("aria-expanded", "true");
    root.classList.add("osb-has-open");
    n.player.start();
  }
  function closePanel() {
    NODES.forEach(function (n) {
      if (open !== n.id) return;
      n.panel.classList.remove("is-open");
      n.btn.setAttribute("aria-expanded", "false");
      n.player.stop();
      setTimeout(function () { if (open !== n.id) n.panel.hidden = true; }, 320);
    });
    open = null; hover = null;
    root.classList.remove("osb-has-open");
  }

  var closeTimer = null;
  function keepOpen() { clearTimeout(closeTimer); }
  function maybeClose() { clearTimeout(closeTimer); closeTimer = setTimeout(function () { hover = null; if (open) closePanel(); }, 350); }
  var touch = window.matchMedia && window.matchMedia("(hover: none)").matches;

  NODES.forEach(function (n) {
    n.btn.addEventListener("pointerenter", function (e) { if (e.pointerType === "touch") return; keepOpen(); if (open && open !== n.id) closePanel(); hover = n.id; });
    n.btn.addEventListener("pointerleave", function (e) { if (e.pointerType === "touch") return; maybeClose(); });
    n.btn.addEventListener("focus", function () { if (!touch) hover = n.id; });
    n.btn.addEventListener("click", function () {            // tap / Enter toggles
      if (open === n.id) { closePanel(); return; }
      if (open) closePanel();
      hover = n.id;
    });
    n.panel.addEventListener("pointerenter", keepOpen);
    n.panel.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") maybeClose(); });
    n.panel.querySelector(".osb-close").addEventListener("click", function () { closePanel(); n.btn.focus(); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) closePanel(); });
  document.addEventListener("pointerdown", function (e) {
    if (!open || !touch) return;
    if (!root.contains(e.target) || e.target === canvas) closePanel();
  });

  /* ---------- power on when the board scrolls into view ---------- */
  var visible = false;
  new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting;
  }, { threshold: [0, 0.4, 0.85] }).observe(root);
  // the intro is driven by the first stretch of the pinned track's scroll; the board powers on the moment it completes
  var wrap = root.parentElement;
  function trackIntro() {
    var r = wrap.getBoundingClientRect(), vh = window.innerHeight, p = (-r.top) / (r.height - vh);
    introK = Math.max(0, Math.min(1, p / IN.share));
    if (introK >= 1 && powerAt === null) powerAt = performance.now();
  }
  window.addEventListener("scroll", trackIntro, { passive: true }); window.addEventListener("resize", trackIntro); trackIntro();

  var last = performance.now();
  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (visible) draw(t, dt);
    requestAnimationFrame(frame);
  }
  build();
  window.addEventListener("resize", function () { build(); if (open) NODES.forEach(function (n) { if (n.id === open) placePanel(n); }); });
  requestAnimationFrame(frame);
})();
