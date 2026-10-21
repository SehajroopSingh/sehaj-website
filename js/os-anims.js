/* ============================================================
   Small live animations used inside the CPU board's project
   panels (js/os-board.js). Each one draws into its own canvas:

     OSAnims.scheduler(canvas, readoutEl)
       8 VMs stacked on 4 cores; the scheduler moves a VM when the
       cores drift apart. Hover a core for its load; click to pile
       every VM onto two cores and watch it rebalance.

     OSAnims.buddy(canvas, readoutEl)
       16 page frames handed out in power-of-two blocks that split
       and merge. Hover a block to see its buddy; click to free or
       allocate.

   Both return { start(), stop() } so they only run while visible.
   ============================================================ */
window.OSAnims = (function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MONO = "ui-monospace, Menlo, monospace";

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Shared plumbing: sizing, pointer tracking, a pausable loop.
  function host(canvas, draw, onClick) {
    var ctx = canvas.getContext("2d"), st = { w: 0, h: 0, mx: -1, my: -1, in: false, ctx: ctx };
    function fit() {
      var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = h;
    }
    canvas.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); st.mx = e.clientX - r.left; st.my = e.clientY - r.top; st.in = true; });
    canvas.addEventListener("pointerleave", function () { st.in = false; });
    canvas.addEventListener("click", function (e) { var r = canvas.getBoundingClientRect(); st.mx = e.clientX - r.left; st.my = e.clientY - r.top; onClick(st); });
    var running = false, last = 0;
    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!st.w) fit();
      ctx.clearRect(0, 0, st.w, st.h);
      draw(st, t, dt);
      requestAnimationFrame(frame);
    }
    window.addEventListener("resize", fit);
    return {
      start: function () { if (running) return; running = true; fit(); last = performance.now(); requestAnimationFrame(frame); },
      stop: function () { running = false; },
    };
  }

  /* ============================================================ */
  function scheduler(canvas, readout) {
    var CORE = ["#ff8a5b", "#74c0fc", "#63e6be", "#e599f7"];
    var VMC = ["#ffb38a", "#ff8a5b", "#9fd3ff", "#74c0fc", "#8ff0d0", "#63e6be", "#f0b8fa", "#e599f7"];
    var vms = [], migrations = 0, lastTick = 0, every = 1500, flash = -1, flashT = 0, t0 = 0;
    for (var i = 0; i < 8; i++) vms.push({ id: i + 1, base: [34, 22, 28, 18, 30, 24, 20, 26][i], ph: i * 0.8, core: i % 2, load: 18, x: 0, y: 0, h: 0, init: false });

    function geom(st, c) {
      var pad = st.w * 0.08, span = st.w - pad * 2, cw = Math.min(64, span / 4 * 0.6);
      return { cx: pad + span * (c + 0.5) / 4, w: cw, top: 26, bottom: st.h - 26, h: st.h - 52 };
    }
    function usage() { var u = [0, 0, 0, 0]; vms.forEach(function (v) { u[v.core] += v.load; }); return u.map(function (x) { return Math.min(100, x); }); }
    function sd(a) { var m = a.reduce(function (s, x) { return s + x; }, 0) / 4; return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / 4); }
    function schedule() {
      var u = usage(), hi = 0, lo = 0;
      for (var c = 1; c < 4; c++) { if (u[c] > u[hi]) hi = c; if (u[c] < u[lo]) lo = c; }
      if (u[hi] - u[lo] < 12) return;
      var best = null, gap = u[hi] - u[lo];
      vms.forEach(function (v) { if (v.core !== hi) return; var g = Math.abs((u[hi] - v.load) - (u[lo] + v.load)); if (g < gap) { gap = g; best = v; } });
      if (best) { best.core = lo; migrations++; flash = lo; flashT = 1; }
    }

    var api = host(canvas, function (st, t, dt) {
      var ctx = st.ctx;
      if (!t0) t0 = t;
      // workload swells and eases over time so the scheduler keeps working
      var intensity = 0.75 + 0.35 * Math.sin((t - t0) / 4000);
      vms.forEach(function (v) { var tg = v.base * intensity * (0.8 + 0.2 * Math.sin(t / 700 + v.ph)); v.load += (tg - v.load) * Math.min(1, dt * 3); });
      if (t - lastTick > every) { lastTick = t; schedule(); }
      var stacks = [0, 0, 0, 0];
      vms.forEach(function (v) {
        var g = geom(st, v.core), h = g.h * v.load / 100, ty = g.bottom - stacks[v.core] - h;
        stacks[v.core] += h;
        if (!v.init) { v.x = g.cx; v.y = ty; v.h = h; v.init = true; }
        var k = reduce ? 1 : Math.min(1, dt * 6); v.x += (g.cx - v.x) * k; v.y += (ty - v.y) * k; v.h += (h - v.h) * k;
      });
      flashT = Math.max(0, flashT - dt * 1.5);

      var u = usage(), hover = -1;
      for (var c = 0; c < 4; c++) { var g = geom(st, c); if (st.in && Math.abs(st.mx - g.cx) < g.w * 0.8) hover = c; }
      for (c = 0; c < 4; c++) {
        g = geom(st, c);
        ctx.fillStyle = "rgba(255,255,255," + (c === hover ? 0.1 : 0.05) + ")"; rr(ctx, g.cx - g.w / 2, g.top, g.w, g.h, 7); ctx.fill();
        ctx.strokeStyle = CORE[c]; ctx.globalAlpha = 0.3 + (c === flash ? flashT * 0.7 : 0); ctx.lineWidth = 1.5;
        rr(ctx, g.cx - g.w / 2, g.top, g.w, g.h, 7); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.textAlign = "center"; ctx.fillStyle = "#9aa4b2"; ctx.font = "10.5px " + MONO; ctx.fillText("pCPU " + c, g.cx, g.bottom + 16);
        ctx.fillStyle = "#e6ebf2"; ctx.font = "600 11.5px " + MONO; ctx.fillText(Math.round(u[c]) + "%", g.cx, g.top - 8);
      }
      vms.forEach(function (v, i) {
        var g = geom(st, v.core), w = g.w - 10;
        ctx.globalAlpha = hover === -1 || hover === v.core ? 0.92 : 0.4; ctx.fillStyle = VMC[i];
        rr(ctx, v.x - w / 2, v.y + 1.5, w, Math.max(2, v.h - 3), 5); ctx.fill(); ctx.globalAlpha = 1;
        if (v.h > 15) { ctx.fillStyle = "#0b0f17"; ctx.font = "700 9.5px " + MONO; ctx.textAlign = "center"; ctx.fillText("vm" + v.id, v.x, v.y + v.h / 2 + 3.5); }
      });
      var msg = hover >= 0
        ? "pCPU " + hover + " · " + Math.round(u[hover]) + "% busy · " + vms.filter(function (v) { return v.core === hover; }).map(function (v) { return "vm" + v.id; }).join(", ")
        : "spread σ " + sd(u).toFixed(1) + "% · " + migrations + " migration" + (migrations === 1 ? "" : "s") + " · click to scramble";
      if (readout && readout.textContent !== msg) readout.textContent = msg;
      canvas.style.cursor = "pointer";
    }, function () {
      vms.forEach(function (v, i) { v.core = i % 2; });
      migrations = 0; every = 650; setTimeout(function () { every = 1500; }, 6000);
    });
    return api;
  }

  /* ============================================================ */
  function buddy(canvas, readout) {
    var N = 16, MAXO = 4, PINK = "#ff6b9a";
    var blocks = [{ start: 0, order: MAXO, used: false, flash: 0 }];
    var SEQ = [1, 0, 2, 0, 1, 0, 2, 0], seqI = 0, auto = [], lastStep = 0, manualUntil = 0, hoverB = null, phase = 0;

    function find(s) { for (var i = 0; i < blocks.length; i++) if (blocks[i].start === s) return blocks[i]; return null; }
    function sort() { blocks.sort(function (a, b) { return a.start - b.start; }); }
    function alloc(order) {
      var c = null;
      blocks.forEach(function (b) { if (!b.used && b.order >= order && (!c || b.order < c.order || (b.order === c.order && b.start < c.start))) c = b; });
      if (!c) return null;
      while (c.order > order) { c.order--; c.flash = 1; blocks.push({ start: c.start + (1 << c.order), order: c.order, used: false, flash: 1 }); }
      c.used = true; c.flash = 1; sort(); return c;
    }
    function free(b) {
      b.used = false; b.flash = 1;
      var merged = true;
      while (merged && b.order < MAXO) {
        merged = false;
        var bs = b.start ^ (1 << b.order), bd = find(bs);
        if (bd && !bd.used && bd.order === b.order) { blocks.splice(blocks.indexOf(bd), 1); b.start = Math.min(b.start, bs); b.order++; b.flash = 1; merged = true; }
      }
      sort();
    }
    function geom(st) { var x0 = st.w * 0.06, pw = (st.w * 0.88) / N; return { x0: x0, pw: pw, y: 40, h: Math.min(58, st.h * 0.24) }; }

    var api = host(canvas, function (st, t, dt) {
      var ctx = st.ctx, g = geom(st);
      // auto pilot: fill up to 7 blocks, then drain, forever
      if (t > manualUntil && t - lastStep > (reduce ? 300 : 650)) {
        lastStep = t;
        auto = auto.filter(function (b) { return blocks.indexOf(b) >= 0 && b.used; });
        if (phase === 0) { var b = alloc(SEQ[seqI++ % SEQ.length]); if (b) auto.push(b); if (!b || auto.length >= 7) phase = 1; }
        else { if (auto.length) free(auto.pop()); if (!auto.length) phase = 0; }
      }
      blocks.forEach(function (b) { b.flash = Math.max(0, b.flash - dt * 1.4); });

      hoverB = null;
      blocks.forEach(function (b) { var x = g.x0 + b.start * g.pw, w = g.pw * (1 << b.order); if (st.in && st.mx > x && st.mx < x + w && st.my > g.y - 6 && st.my < g.y + g.h + 6) hoverB = b; });
      var bs = hoverB && hoverB.order < MAXO ? hoverB.start ^ (1 << hoverB.order) : -1;

      for (var p = 0; p < N; p++) { ctx.fillStyle = "rgba(255,255,255,.05)"; rr(ctx, g.x0 + p * g.pw + 1, g.y + g.h + 8, g.pw - 2, 5, 2); ctx.fill(); }
      blocks.forEach(function (b) {
        var x = g.x0 + b.start * g.pw, w = g.pw * (1 << b.order);
        ctx.fillStyle = b.used ? PINK : "rgba(255,255,255," + (0.07 + b.flash * 0.25) + ")";
        ctx.globalAlpha = b.used ? 0.75 + b.flash * 0.25 : 1; rr(ctx, x + 2, g.y, w - 4, g.h, 6); ctx.fill(); ctx.globalAlpha = 1;
        if (b === hoverB) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; rr(ctx, x + 2, g.y, w - 4, g.h, 6); ctx.stroke(); }
        if (b.flash > 0) { ctx.strokeStyle = "rgba(255,255,255," + b.flash * 0.7 + ")"; ctx.lineWidth = 1.5; rr(ctx, x + 2, g.y - 3, w - 4, g.h + 6, 8); ctx.stroke(); }
        if (w > 26) { ctx.fillStyle = b.used ? "#1a0610" : "#9aa4b2"; ctx.font = "700 9.5px " + MONO; ctx.textAlign = "center"; ctx.fillText((1 << b.order) + "p", x + w / 2, g.y + g.h / 2 + 3.5); }
      });
      if (hoverB && bs >= 0) {
        var bw = g.pw * (1 << hoverB.order), bx = g.x0 + bs * g.pw, hx = g.x0 + hoverB.start * g.pw;
        ctx.setLineDash([4, 4]); ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1.5; rr(ctx, bx + 2, g.y, bw - 4, g.h, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + bw / 2, g.y - 5); ctx.quadraticCurveTo((hx + bx + bw) / 2, g.y - 30, bx + bw / 2, g.y - 5); ctx.stroke(); ctx.setLineDash([]);
      }
      // free lists
      var fy = g.y + g.h + 34;
      ctx.font = "10.5px " + MONO;
      for (var o = MAXO; o >= 0; o--) {
        var ly = fy + (MAXO - o) * 16, lst = blocks.filter(function (b) { return !b.used && b.order === o; });
        ctx.fillStyle = "#77808f"; ctx.textAlign = "left"; ctx.fillText("free order " + o + " (" + (1 << o) + "p)", g.x0, ly);
        lst.forEach(function (b, k) { ctx.fillStyle = "rgba(255,255,255,.14)"; rr(ctx, g.x0 + 132 + k * 32, ly - 10, 28, 13, 3); ctx.fill(); ctx.fillStyle = "#e6ebf2"; ctx.textAlign = "center"; ctx.fillText(String(b.start), g.x0 + 146 + k * 32, ly); });
      }
      var used = blocks.reduce(function (s, b) { return s + (b.used ? 1 << b.order : 0); }, 0);
      var msg = hoverB
        ? "pages " + hoverB.start + "–" + (hoverB.start + (1 << hoverB.order) - 1) + " · " + (hoverB.used ? "allocated" : "free") + (bs >= 0 ? " · buddy = " + hoverB.start + " XOR " + (1 << hoverB.order) + " → " + bs : "")
        : used + " / 16 pages in use · click a block to free or allocate";
      if (readout && readout.textContent !== msg) readout.textContent = msg;
      canvas.style.cursor = hoverB ? "pointer" : "default";
    }, function (st) {
      var g = geom(st);
      if (st.my < g.y - 6 || st.my > g.y + g.h + 6) return;
      manualUntil = performance.now() + 8000;
      var page = Math.floor((st.mx - g.x0) / g.pw), hit = null;
      blocks.forEach(function (b) { if (page >= b.start && page < b.start + (1 << b.order)) hit = b; });
      if (!hit) return;
      if (hit.used) { free(hit); return; }
      while (hit.order > 0) { hit.order--; hit.flash = 1; var hb = { start: hit.start + (1 << hit.order), order: hit.order, used: false, flash: 1 }; blocks.push(hb); if (page >= hb.start) hit = hb; }
      hit.used = true; hit.flash = 1; sort();
    });
    return api;
  }

  return { scheduler: scheduler, buddy: buddy };
})();
