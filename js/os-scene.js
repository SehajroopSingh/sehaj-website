/* ============================================================
   Operating Systems section · live scene (projects.html)
   ------------------------------------------------------------
   One canvas, two overlapping animations with no hard edge:
     A (top left)     vCPU scheduler: 8 VMs stacked on 4 cores,
                      rebalanced whenever the cores drift apart.
     B (bottom right) Buddy allocator: 16 page frames that split
                      and merge as blocks are allocated and freed.
   Memory pages drift across the seam between them.

   Scroll  → A's workload rises, B allocates more blocks.
   Hover   → A: a core's load and VMs.  B: a block and its buddy.
   Click   → A: pile every VM onto two cores, watch it rebalance.
             B: free a used block / allocate a page in a free one.
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("os-scene");
  if (!root) return;
  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var readA = root.querySelector('[data-read="a"]');
  var readB = root.querySelector('[data-read="b"]');
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CORE_COLORS = ["#ff8a5b", "#74c0fc", "#63e6be", "#e599f7"];
  var VM_COLORS = ["#ffb38a", "#ff8a5b", "#9fd3ff", "#74c0fc", "#8ff0d0", "#63e6be", "#f0b8fa", "#e599f7"];
  var PINK = "#ff6b9a";

  var W = 0, H = 0, A = {}, B = {}, mobile = false;
  var mouse = { x: -1, y: -1, in: false };
  var scrollP = 0;

  /* ---------- layout ---------- */
  function fit() {
    var w = canvas.parentElement.clientWidth;
    mobile = w < 760;
    var h = mobile ? 760 : Math.round(Math.min(720, Math.max(600, w * 0.6)));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w; H = h;
    if (mobile) {
      A = { x: 0, y: 0, w: W, h: H * 0.54 };
      B = { x: 0, y: H * 0.46, w: W, h: H * 0.54 };
    } else {
      A = { x: 0, y: 0, w: W * 0.6, h: H * 0.62 };
      B = { x: W * 0.4, y: H * 0.38, w: W * 0.6, h: H * 0.62 };
    }
  }

  /* ============================================================
     A · vCPU scheduler
     ============================================================ */
  var vms = [];
  for (var i = 0; i < 8; i++) vms.push({ id: i + 1, base: [34, 22, 28, 18, 30, 24, 20, 26][i], phase: i * 0.8, core: i % 4, load: 10, y: 0, h: 0, x: 0, init: false });
  var migrations = 0, lastTick = 0, tickEvery = 1600, flashCore = -1, flashT = 0;

  function coreGeom(c) {
    var pad = A.w * 0.12, span = A.w - pad * 2;
    var cw = Math.min(70, span / 4 * 0.62);
    var cx = A.x + pad + span * (c + 0.5) / 4;
    var top = A.y + A.h * 0.16, bottom = A.y + A.h * 0.82;
    return { cx: cx, w: cw, top: top, bottom: bottom, h: bottom - top };
  }
  function usage() {
    var u = [0, 0, 0, 0];
    vms.forEach(function (v) { u[v.core] += v.load; });
    return u.map(function (x) { return Math.min(100, x); });
  }
  function sd(a) { var m = a.reduce(function (s, x) { return s + x; }, 0) / a.length; return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / a.length); }

  function schedule() {
    var u = usage(), hi = 0, lo = 0;
    for (var c = 1; c < 4; c++) { if (u[c] > u[hi]) hi = c; if (u[c] < u[lo]) lo = c; }
    if (u[hi] - u[lo] < 12) return;
    // move the VM from the busiest core that best evens out busiest vs idlest
    var best = null, bestGap = u[hi] - u[lo];
    vms.forEach(function (v) {
      if (v.core !== hi) return;
      var gap = Math.abs((u[hi] - v.load) - (u[lo] + v.load));
      if (gap < bestGap) { bestGap = gap; best = v; }
    });
    if (best) { best.core = lo; migrations++; flashCore = lo; flashT = 1; }
  }

  function scramble() {
    vms.forEach(function (v, i) { v.core = i % 2; });
    tickEvery = 700; migrations = 0;
    setTimeout(function () { tickEvery = 1600; }, 6000);
  }

  function updateA(t, dt) {
    var intensity = 0.45 + scrollP * 0.75;
    vms.forEach(function (v) {
      var target = v.base * intensity * (0.85 + 0.15 * Math.sin(t / 900 + v.phase));
      v.load += (target - v.load) * Math.min(1, dt * 3);
    });
    if (t - lastTick > tickEvery) { lastTick = t; schedule(); }
    // stack chips per core
    var stacks = [0, 0, 0, 0];
    vms.forEach(function (v) {
      var g = coreGeom(v.core);
      var h = g.h * v.load / 100;
      var ty = g.bottom - stacks[v.core] - h;
      stacks[v.core] += h;
      if (!v.init) { v.x = g.cx; v.y = ty; v.h = h; v.init = true; }
      var k = reduce ? 1 : Math.min(1, dt * 6);
      v.x += (g.cx - v.x) * k; v.y += (ty - v.y) * k; v.h += (h - v.h) * k;
    });
    flashT = Math.max(0, flashT - dt * 1.5);
  }

  function drawA() {
    var u = usage(), hover = -1;
    for (var c = 0; c < 4; c++) {
      var g = coreGeom(c);
      if (mouse.in && Math.abs(mouse.x - g.cx) < g.w * 0.8 && mouse.y > g.top - 20 && mouse.y < g.bottom + 30) hover = c;
    }
    for (c = 0; c < 4; c++) {
      g = coreGeom(c);
      ctx.fillStyle = "rgba(255,255,255," + (c === hover ? 0.1 : 0.05) + ")";
      rr(g.cx - g.w / 2, g.top, g.w, g.h, 8); ctx.fill();
      // 100% line glow if busy
      ctx.strokeStyle = CORE_COLORS[c]; ctx.globalAlpha = 0.25 + (c === flashCore ? flashT * 0.6 : 0);
      ctx.lineWidth = 1.5; rr(g.cx - g.w / 2, g.top, g.w, g.h, 8); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = "#9aa4b2"; ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
      ctx.fillText("pCPU " + c, g.cx, g.bottom + 18);
      ctx.fillStyle = "#e6ebf2"; ctx.font = "600 12px ui-monospace, Menlo, monospace";
      ctx.fillText(Math.round(u[c]) + "%", g.cx, g.top - 8);
    }
    vms.forEach(function (v, i) {
      var g = coreGeom(v.core), w = g.w - 10;
      ctx.fillStyle = VM_COLORS[i]; ctx.globalAlpha = hover === -1 || hover === v.core ? 0.92 : 0.45;
      rr(v.x - w / 2, v.y + 1.5, w, Math.max(2, v.h - 3), 5); ctx.fill(); ctx.globalAlpha = 1;
      if (v.h > 16) { ctx.fillStyle = "#0b0f17"; ctx.font = "700 10px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.fillText("vm" + v.id, v.x, v.y + v.h / 2 + 3.5); }
    });
    var s = sd(u);
    var msg = hover >= 0
      ? "pCPU " + hover + " · " + Math.round(u[hover]) + "% busy · " + vms.filter(function (v) { return v.core === hover; }).map(function (v) { return "vm" + v.id; }).join(", ")
      : "spread σ " + s.toFixed(1) + "% · " + migrations + " migration" + (migrations === 1 ? "" : "s");
    if (readA && readA.textContent !== msg) readA.textContent = msg;
    root.style.cursor = hover >= 0 || hoverBlock ? "pointer" : "default";
  }

  /* ============================================================
     B · buddy allocator (16 page frames, orders 0..4)
     ============================================================ */
  var N = 16, MAXO = 4;
  var blocks = [{ start: 0, order: MAXO, used: false, flash: 0, auto: false }];
  var autoStack = [], SEQ = [1, 0, 2, 0, 1, 0, 2, 0, 1], seqI = 0, lastStep = 0;
  var hoverBlock = null, manualUntil = 0;

  function find(start) { for (var i = 0; i < blocks.length; i++) if (blocks[i].start === start) return blocks[i]; return null; }
  function sortBlocks() { blocks.sort(function (a, b) { return a.start - b.start; }); }

  function alloc(order, auto) {
    var cand = null;
    blocks.forEach(function (b) { if (!b.used && b.order >= order && (!cand || b.order < cand.order || (b.order === cand.order && b.start < cand.start))) cand = b; });
    if (!cand) return null;
    while (cand.order > order) {               // split in half until it fits
      cand.order--; cand.flash = 1;
      var half = { start: cand.start + (1 << cand.order), order: cand.order, used: false, flash: 1, auto: false };
      blocks.push(half);
    }
    cand.used = true; cand.auto = !!auto; cand.flash = 1;
    sortBlocks();
    return cand;
  }
  function free(b) {
    b.used = false; b.auto = false; b.flash = 1;
    var merged = true;
    while (merged && b.order < MAXO) {          // coalesce with the buddy while it is free
      merged = false;
      var bs = b.start ^ (1 << b.order), buddy = find(bs);
      if (buddy && !buddy.used && buddy.order === b.order) {
        blocks.splice(blocks.indexOf(buddy), 1);
        b.start = Math.min(b.start, bs); b.order++; b.flash = 1; merged = true;
      }
    }
    sortBlocks();
  }

  function updateB(t, dt) {
    var target = Math.round(scrollP * 7);
    if (t > manualUntil && t - lastStep > (reduce ? 0 : 420)) {
      lastStep = t;
      autoStack = autoStack.filter(function (b) { return blocks.indexOf(b) >= 0 && b.used; });
      if (autoStack.length < target) {
        var b = alloc(SEQ[seqI % SEQ.length], true); seqI++;
        if (b) autoStack.push(b);
      } else if (autoStack.length > target) {
        free(autoStack.pop()); seqI = Math.max(0, seqI - 1);
      }
    }
    blocks.forEach(function (b) { b.flash = Math.max(0, b.flash - dt * 1.4); });
  }

  function stripGeom() {
    var padL = B.w * 0.1, padR = B.w * 0.08;
    var x0 = B.x + padL, wAll = B.w - padL - padR;
    var y = B.y + B.h * (mobile ? 0.36 : 0.4);
    return { x0: x0, pw: wAll / N, y: y, h: Math.min(64, B.h * 0.16) };
  }

  function drawB() {
    var g = stripGeom();
    hoverBlock = null;
    // page frame ticks
    for (var p = 0; p < N; p++) {
      ctx.fillStyle = "rgba(255,255,255,.04)";
      rr(g.x0 + p * g.pw + 1, g.y + g.h + 10, g.pw - 2, 6, 2); ctx.fill();
    }
    ctx.fillStyle = "#9aa4b2"; ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
    ctx.fillText("page frames 0–15", g.x0, g.y + g.h + 34);
    ctx.textAlign = "right"; ctx.fillText("4 KB each", g.x0 + g.pw * N, g.y + g.h + 34);

    blocks.forEach(function (b) {
      var x = g.x0 + b.start * g.pw, w = g.pw * (1 << b.order);
      if (mouse.in && mouse.x > x && mouse.x < x + w && mouse.y > g.y - 6 && mouse.y < g.y + g.h + 6) hoverBlock = b;
    });
    var buddyStart = hoverBlock && hoverBlock.order < MAXO ? hoverBlock.start ^ (1 << hoverBlock.order) : -1;

    blocks.forEach(function (b) {
      var x = g.x0 + b.start * g.pw, w = g.pw * (1 << b.order);
      var isHover = b === hoverBlock;
      ctx.fillStyle = b.used ? PINK : "rgba(255,255,255," + (0.07 + b.flash * 0.25) + ")";
      ctx.globalAlpha = b.used ? 0.75 + b.flash * 0.25 : 1;
      rr(x + 2, g.y, w - 4, g.h, 7); ctx.fill(); ctx.globalAlpha = 1;
      if (isHover) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; rr(x + 2, g.y, w - 4, g.h, 7); ctx.stroke(); }
      if (b.flash > 0) { ctx.strokeStyle = "rgba(255,255,255," + b.flash * 0.7 + ")"; ctx.lineWidth = 1.5; rr(x + 2, g.y - 3, w - 4, g.h + 6, 9); ctx.stroke(); }
      if (w > 30) {
        ctx.fillStyle = b.used ? "#1a0610" : "#9aa4b2"; ctx.font = "700 10px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
        ctx.fillText((1 << b.order) + "p", x + w / 2, g.y + g.h / 2 + 3.5);
      }
    });
    // buddy outline + connector
    if (hoverBlock && buddyStart >= 0) {
      var bw = g.pw * (1 << hoverBlock.order), bx = g.x0 + buddyStart * g.pw, hx = g.x0 + hoverBlock.start * g.pw;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1.5;
      rr(bx + 2, g.y, bw - 4, g.h, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + bw / 2, g.y - 6); ctx.quadraticCurveTo((hx + bx + bw) / 2, g.y - 34, bx + bw / 2, g.y - 6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd166"; ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
      ctx.fillText("buddy = " + hoverBlock.start + " XOR " + (1 << hoverBlock.order), (hx + bx + bw) / 2, g.y - 38);
    }
    // free lists
    var fy = g.y + g.h + 58;
    for (var o = MAXO; o >= 0; o--) {
      var list = blocks.filter(function (b) { return !b.used && b.order === o; });
      var ly = fy + (MAXO - o) * 17;
      ctx.fillStyle = "#77808f"; ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
      ctx.fillText("order " + o, g.x0, ly);
      list.forEach(function (b, k) {
        ctx.fillStyle = "rgba(255,255,255,.14)"; rr(g.x0 + 62 + k * 34, ly - 10, 30, 13, 3); ctx.fill();
        ctx.fillStyle = "#e6ebf2"; ctx.textAlign = "center"; ctx.fillText(String(b.start), g.x0 + 77 + k * 34, ly);
      });
    }
    var usedPages = blocks.reduce(function (s, b) { return s + (b.used ? 1 << b.order : 0); }, 0);
    var largest = blocks.reduce(function (m, b) { return !b.used && b.order > m ? b.order : m; }, -1);
    var msg = hoverBlock
      ? "pages " + hoverBlock.start + "–" + (hoverBlock.start + (1 << hoverBlock.order) - 1) + " · " + (hoverBlock.used ? "allocated" : "free") + (buddyStart >= 0 ? " · buddy " + buddyStart + "–" + (buddyStart + (1 << hoverBlock.order) - 1) : "")
      : usedPages + " / 16 pages in use · largest free block " + (largest >= 0 ? (1 << largest) + " pages" : "none");
    if (readB && readB.textContent !== msg) readB.textContent = msg;
  }

  /* ============================================================
     The seam: soft glows + pages drifting between the two scenes
     ============================================================ */
  var motes = [];
  for (var m = 0; m < 16; m++) motes.push({ t: Math.random(), speed: 0.04 + Math.random() * 0.05, off: (Math.random() - 0.5) * 2, dir: m % 2 ? 1 : -1 });

  function seamPoint(t, off) {
    // from the cores (A) down to the page strip (B) along a gentle S-curve
    var a = coreGeom(3), g = stripGeom();
    var x0 = a.cx, y0 = a.bottom - a.h * 0.3, x1 = g.x0 + g.pw * 3, y1 = g.y + g.h * 0.5;
    var cx = (x0 + x1) / 2 + off * 40, cy = (y0 + y1) / 2 + off * 30;
    var u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
  }

  function drawGlows() {
    var ga = ctx.createRadialGradient(A.x + A.w * 0.5, A.y + A.h * 0.5, 0, A.x + A.w * 0.5, A.y + A.h * 0.5, Math.max(A.w, A.h) * 0.7);
    ga.addColorStop(0, "rgba(59,91,219,.22)"); ga.addColorStop(1, "rgba(59,91,219,0)");
    ctx.fillStyle = ga; ctx.fillRect(0, 0, W, H);
    var gb = ctx.createRadialGradient(B.x + B.w * 0.5, B.y + B.h * 0.45, 0, B.x + B.w * 0.5, B.y + B.h * 0.45, Math.max(B.w, B.h) * 0.7);
    gb.addColorStop(0, "rgba(194,37,92,.2)"); gb.addColorStop(1, "rgba(194,37,92,0)");
    ctx.fillStyle = gb; ctx.fillRect(0, 0, W, H);
  }

  function drawMotes(dt) {
    motes.forEach(function (o) {
      if (!reduce) o.t += o.speed * dt * o.dir;
      if (o.t > 1) o.t -= 1; if (o.t < 0) o.t += 1;
      var p = seamPoint(o.t, o.off);
      var a = Math.sin(o.t * Math.PI);
      ctx.fillStyle = o.dir > 0 ? "rgba(255,107,154," + a * 0.7 + ")" : "rgba(116,192,252," + a * 0.7 + ")";
      rr(p.x - 4, p.y - 4, 8, 8, 2); ctx.fill();
    });
  }

  /* ---------- helpers ---------- */
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function readScroll() {
    var r = root.getBoundingClientRect(), vh = window.innerHeight;
    scrollP = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height) * 1.25 - 0.1));
  }

  /* ---------- events ---------- */
  canvas.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.in = true; });
  canvas.addEventListener("pointerleave", function () { mouse.in = false; });
  canvas.addEventListener("click", function (e) {
    var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    var g = stripGeom();
    if (mouse.y > g.y - 6 && mouse.y < g.y + g.h + 6 && mouse.x > g.x0 && mouse.x < g.x0 + g.pw * N) {
      manualUntil = performance.now() + 8000;   // let the click's result stay on screen
      var page = Math.floor((mouse.x - g.x0) / g.pw), hit = null;
      blocks.forEach(function (b) { if (page >= b.start && page < b.start + (1 << b.order)) hit = b; });
      if (hit && hit.used) free(hit);
      else if (hit) {                                        // allocate one page inside the clicked free block
        while (hit.order > 0) { hit.order--; hit.flash = 1; var hb = { start: hit.start + (1 << hit.order), order: hit.order, used: false, flash: 1 }; blocks.push(hb); if (page >= hb.start) hit = hb; }
        hit.used = true; hit.flash = 1; sortBlocks();
      }
      return;
    }
    if (mouse.x < A.x + A.w && mouse.y < A.y + A.h) scramble();
  });
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", function () { fit(); readScroll(); });

  /* ---------- loop (paused off-screen) ---------- */
  var visible = true, last = performance.now();
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(root);
  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (visible) {
      updateA(t, dt); updateB(t, dt);
      ctx.clearRect(0, 0, W, H);
      drawGlows(); drawMotes(dt); drawA(); drawB();
    }
    requestAnimationFrame(frame);
  }
  fit(); readScroll();
  requestAnimationFrame(frame);
})();
