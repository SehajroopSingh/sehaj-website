/* ============================================================
   Small live animations used inside the CPU board's project
   panels (js/os-board.js). Each one draws into its own canvas:

     OSAnims.scheduler(canvas, readoutEl)
       8 VMs stacked on 4 cores; the scheduler moves a VM when the
       cores drift apart. Hover a core for its load; click to pile
       every VM onto two cores and watch it rebalance.

     OSAnims.mips(canvas, readoutEl)
       A multi-cycle MIPS processor running a small loop, one clock
       cycle at a time through its control FSM. Hover a state for its
       control signals; click to pause or resume.

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


  /* ============================================================ */
  function mips(canvas, readout) {
    // ---- the program: a loop that bumps a counter in memory ----
    var R = function (rs, rt, rd, funct, txt) { return { op: 0, rs: rs, rt: rt, rd: rd, funct: funct, txt: txt }; };
    var I = function (op, rs, rt, imm, txt) { return { op: op, rs: rs, rt: rt, imm: imm, txt: txt }; };
    var PROG = [
      I(35, 0, 1, 64, "lw   $1, 64($0)"),
      I(8, 1, 1, 1, "addi $1, $1, 1"),
      I(43, 0, 1, 64, "sw   $1, 64($0)"),
      R(1, 1, 2, 32, "add  $2, $1, $1"),
      R(2, 1, 3, 42, "slt  $3, $2, $1"),
      I(4, 3, 0, 1, "beq  $3, $0, +1"),
      R(0, 0, 2, 32, "add  $2, $0, $0"),
      { op: 2, addr: 0, txt: "j    0" },
    ];
    function encode(x) {
      if (x.op === 0) return ((x.rs << 21) | (x.rt << 16) | (x.rd << 11) | x.funct) >>> 0;
      if (x.op === 2) return ((2 << 26) | x.addr) >>> 0;
      return ((x.op << 26) | (x.rs << 21) | (x.rt << 16) | (x.imm & 0xffff)) >>> 0;
    }
    // ---- the control FSM: name, signals asserted, grid position ----
    var S = {
      0:  { n: "Fetch",       sig: "MemRead · IRWrite · PCWrite · ALUSrcB=01 · ALUOp=01", c: 0, r: 2.5 },
      1:  { n: "Decode",      sig: "ALUSrcA=0 · ALUSrcB=11 · ALUOp=01 (branch target)", c: 1, r: 2.5 },
      2:  { n: "Mem addr",    sig: "ALUSrcA=1 · ALUSrcB=10 · ALUOp=01 (base + offset)", c: 2, r: 0 },
      3:  { n: "Mem read",    sig: "MemRead · IorD=1", c: 3, r: 0 },
      4:  { n: "Write back",  sig: "RegWrite · MemtoReg=1 · RegDst=0", c: 4, r: 0 },
      5:  { n: "Mem write",   sig: "MemWrite · IorD=1", c: 3, r: 1 },
      6:  { n: "Execute",     sig: "ALUSrcA=1 · ALUSrcB=00 · ALUOp=00 (use funct)", c: 2, r: 2 },
      7:  { n: "R complete",  sig: "RegWrite · RegDst=1 · MemtoReg=0", c: 3, r: 2 },
      11: { n: "I execute",   sig: "ALUSrcA=1 · ALUSrcB=10 · ALUOp=01", c: 2, r: 3 },
      12: { n: "I complete",  sig: "RegWrite · RegDst=0 · MemtoReg=0", c: 3, r: 3 },
      8:  { n: "Branch",      sig: "ALUSrcA=1 · ALUSrcB=00 · ALUOp=10 (subtract) · PCWriteCond · PCSource=01", c: 2, r: 4 },
      9:  { n: "Jump",        sig: "PCWrite · PCSource=10", c: 2, r: 5 },
    };
    var EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [1, 6], [6, 7], [1, 11], [11, 12], [1, 8], [1, 9]];

    var reg = new Array(32).fill(0), mem = { 64: 0 };
    var pr = { PC: 0, IR: 0, A: 0, B: 0, ALUOut: 0, MDR: 0 }, cur = null, state = 0, cycle = 0, trail = [0];
    var paused = false, lastStep = 0, pulse = 0, hoverS = null;

    function step() {
      var x = cur, next;
      switch (state) {
        case 0: cur = x = PROG[pr.PC / 4]; pr.IR = encode(x); pr.PC += 4; next = 1; break;
        case 1:
          pr.A = reg[x.rs || 0]; pr.B = reg[x.rt || 0];
          pr.ALUOut = pr.PC + ((x.imm || 0) << 2);
          next = x.op === 0 ? 6 : x.op === 35 || x.op === 43 ? 2 : x.op === 8 ? 11 : x.op === 4 ? 8 : 9; break;
        case 2: pr.ALUOut = pr.A + x.imm; next = x.op === 35 ? 3 : 5; break;
        case 3: pr.MDR = mem[pr.ALUOut] || 0; next = 4; break;
        case 4: reg[x.rt] = pr.MDR; next = 0; break;
        case 5: mem[pr.ALUOut] = pr.B; next = 0; break;
        case 6: pr.ALUOut = x.funct === 32 ? pr.A + pr.B : (pr.A < pr.B ? 1 : 0); next = 7; break;
        case 7: reg[x.rd] = pr.ALUOut; next = 0; break;
        case 11: pr.ALUOut = pr.A + x.imm; next = 12; break;
        case 12: reg[x.rt] = pr.ALUOut; next = 0; break;
        case 8: if (pr.A - pr.B === 0) pr.PC = pr.ALUOut; next = 0; break;
        case 9: pr.PC = x.addr << 2; next = 0; break;
      }
      state = next; cycle++; pulse = 1;
      if (state === 0) trail = [0]; else trail.push(state);
    }

    function hex(v) { return "0x" + (v >>> 0).toString(16).padStart(8, "0"); }

    var api = host(canvas, function (st, t, dt) {
      var ctx = st.ctx;
      if (!paused && t - lastStep > (reduce ? 1400 : 750)) { lastStep = t; step(); }
      pulse = Math.max(0, pulse - dt * 2.5);

      var top = 6, gh = st.h - 86, rowH = gh / 6, colW = (st.w - 16) / 5, pw = Math.min(96, colW - 10), ph = Math.min(22, rowH - 6);
      function pos(k) { var s = S[k]; return { x: 8 + s.c * colW + (colW - pw) / 2, y: top + s.r * rowH + (rowH - ph) / 2 }; }
      // edges
      EDGES.forEach(function (e) {
        var a = pos(e[0]), b = pos(e[1]);
        var on = trail.indexOf(e[0]) >= 0 && trail.indexOf(e[1]) >= 0;
        ctx.strokeStyle = on ? "rgba(159,225,255,.85)" : "rgba(255,255,255,.12)"; ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(a.x + pw, a.y + ph / 2);
        var mx = (a.x + pw + b.x) / 2; ctx.bezierCurveTo(mx, a.y + ph / 2, mx, b.y + ph / 2, b.x, b.y + ph / 2); ctx.stroke();
      });
      // states
      hoverS = null;
      Object.keys(S).forEach(function (k) {
        k = +k; var p = pos(k), active = k === state, inTrail = trail.indexOf(k) >= 0;
        if (st.in && st.mx > p.x && st.mx < p.x + pw && st.my > p.y && st.my < p.y + ph) hoverS = k;
        ctx.fillStyle = active ? "#9fe1ff" : inTrail ? "rgba(79,182,255,.35)" : "rgba(255,255,255,.06)";
        if (active) { ctx.shadowColor = "#4fc3ff"; ctx.shadowBlur = 12 + pulse * 14; }
        rr(ctx, p.x, p.y, pw, ph, ph / 2); ctx.fill(); ctx.shadowBlur = 0;
        if (hoverS === k) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; rr(ctx, p.x, p.y, pw, ph, ph / 2); ctx.stroke(); }
        ctx.fillStyle = active ? "#06121f" : "#d7e3f4"; ctx.font = (active ? "700 " : "") + "10px " + MONO; ctx.textAlign = "center";
        ctx.fillText(k + " " + S[k].n, p.x + pw / 2, p.y + ph / 2 + 3.5);
      });
      // datapath registers
      var y0 = st.h - 62;
      ctx.fillStyle = "#9aa4b2"; ctx.font = "10.5px " + MONO; ctx.textAlign = "left";
      ctx.fillText("cycle " + cycle + "   " + (cur ? cur.txt : "") + "   mem[64] = " + (mem[64] || 0), 10, y0);
      var names = ["PC", "IR", "A", "B", "ALUOut", "MDR"], bw = (st.w - 20) / 6;
      names.forEach(function (n, i) {
        var x = 10 + i * bw;
        ctx.fillStyle = "rgba(255,255,255,.06)"; rr(ctx, x, y0 + 8, bw - 6, 40, 6); ctx.fill();
        ctx.fillStyle = "#77808f"; ctx.font = "9.5px " + MONO; ctx.fillText(n, x + 6, y0 + 21);
        ctx.fillStyle = "#e6ebf2"; ctx.font = "600 10.5px " + MONO;
        ctx.fillText(n === "IR" ? hex(pr.IR) : String(pr[n]), x + 6, y0 + 38);
      });
      var shown = hoverS !== null ? hoverS : state;
      var msg = (hoverS !== null ? "state " : "now in state ") + shown + " " + S[shown].n + ": " + S[shown].sig + (paused ? " · paused" : "");
      if (readout && readout.textContent !== msg) readout.textContent = msg;
      canvas.style.cursor = "pointer";
    }, function () { paused = !paused; });
    return api;
  }

  return { scheduler: scheduler, buddy: buddy, mips: mips };
})();
