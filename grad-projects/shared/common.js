/* ============================================================
   Shared helpers for every demo.
   Plain script (no modules) so pages also work when opened
   straight from disk. Everything lives on window.AI4R.
   ============================================================ */
window.AI4R = window.AI4R || {};

(function (A) {
  // ---------- Canvas colors (screens are always dark) ----------
  A.colors = {
    bg: "#0b0f17",
    grid: "#1b2230",
    text: "#9aa4b2",
    textBright: "#e6ebf2",
    particle: "#7cc4ff",
    truth: "#ff6b6b",
    estimate: "#ffd166",
    measure: "#b69cff",
    good: "#3ddc97",
    rock: "#6b7280",
    wall: "#56627a",
  };

  // ---------- Random ----------
  A.randn = function () {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  A.rand = (a, b) => a + Math.random() * (b - a);
  A.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  A.wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------- Canvas that follows its container's width ----------
  // aspect = height / width. Returns {ctx, w, h} kept up to date.
  A.makeStage = function (canvas, aspect, onResize) {
    const ctx = canvas.getContext("2d");
    const stage = { ctx, w: 0, h: 0, canvas };
    function fit() {
      const w = Math.floor(canvas.parentElement.clientWidth);
      if (!w || w === stage.w) return;
      const h = Math.round(w * aspect);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stage.w = w;
      stage.h = h;
      if (onResize) onResize(stage);
    }
    new ResizeObserver(fit).observe(canvas.parentElement);
    fit();
    return stage;
  };

  // ---------- Animation loop that pauses when off-screen ----------
  A.loop = function (el, frame) {
    let visible = true;
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(el);
    let last = performance.now();
    function tick(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (visible) frame(dt);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  // ---------- Bind a range input to a live value label ----------
  // <input id="x"> + <span data-for="x"> shows the value.
  A.slider = function (id, onChange, digits) {
    const el = document.getElementById(id);
    const out = document.querySelector('[data-for="' + id + '"]');
    const d = digits == null ? 2 : digits;
    const show = () => { if (out) out.textContent = Number(el.value).toFixed(d); };
    el.addEventListener("input", () => { show(); if (onChange) onChange(Number(el.value)); });
    show();
    return {
      get: () => Number(el.value),
      set: (v) => { el.value = v; show(); },
    };
  };

  // ---------- Small drawing helpers ----------
  A.clear = function (stage) {
    stage.ctx.fillStyle = A.colors.bg;
    stage.ctx.fillRect(0, 0, stage.w, stage.h);
  };
  A.hud = function (stage, lines, x, y) {
    const ctx = stage.ctx;
    const small = stage.w < 480, lh = small ? 13 : 16;
    ctx.font = (small ? 10 : 12) + "px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    const x0 = x == null ? 10 : x, y0 = y == null ? 10 : y;
    const wMax = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.fillStyle = "rgba(11,15,23,0.72)";
    ctx.fillRect(x0 - 6, y0 - 5, wMax + 12, lines.length * lh + 8);
    lines.forEach((ln, i) => {
      ctx.fillStyle = i === 0 ? A.colors.textBright : A.colors.text;
      ctx.fillText(ln, x == null ? 10 : x, (y == null ? 10 : y) + i * lh);
    });
  };

  // ---------- Linear algebra (small dense matrices as arrays) ----------
  A.mat = {
    zeros: (r, c) => Array.from({ length: r }, () => new Array(c).fill(0)),
    identity: (n) => { const m = A.mat.zeros(n, n); for (let i = 0; i < n; i++) m[i][i] = 1; return m; },
    mul: (a, b) => {
      const r = a.length, c = b[0].length, k = b.length, out = A.mat.zeros(r, c);
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) {
          let s = 0;
          for (let t = 0; t < k; t++) s += a[i][t] * b[t][j];
          out[i][j] = s;
        }
      return out;
    },
    add: (a, b) => a.map((row, i) => row.map((v, j) => v + b[i][j])),
    sub: (a, b) => a.map((row, i) => row.map((v, j) => v - b[i][j])),
    T: (a) => a[0].map((_, j) => a.map((row) => row[j])),
    // Inverse via Gauss-Jordan (fine for the sizes used here).
    inv: (m) => {
      const n = m.length;
      const a = m.map((row, i) => row.concat(A.mat.identity(n)[i]));
      for (let col = 0; col < n; col++) {
        let piv = col;
        for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
        [a[col], a[piv]] = [a[piv], a[col]];
        const p = a[col][col] || 1e-12;
        for (let j = 0; j < 2 * n; j++) a[col][j] /= p;
        for (let r = 0; r < n; r++) {
          if (r === col) continue;
          const f = a[r][col];
          if (f) for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
        }
      }
      return a.map((row) => row.slice(n));
    },
    // Solve M x = b (b is a plain vector). Gaussian elimination.
    solve: (M, b) => {
      const n = M.length;
      const a = M.map((row, i) => row.slice().concat([b[i]]));
      for (let col = 0; col < n; col++) {
        let piv = col;
        for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
        [a[col], a[piv]] = [a[piv], a[col]];
        const p = a[col][col] || 1e-12;
        for (let r = col + 1; r < n; r++) {
          const f = a[r][col] / p;
          if (f) for (let j = col; j <= n; j++) a[r][j] -= f * a[col][j];
        }
      }
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let s = a[i][n];
        for (let j = i + 1; j < n; j++) s -= a[i][j] * x[j];
        x[i] = s / (a[i][i] || 1e-12);
      }
      return x;
    },
  };
})(window.AI4R);
