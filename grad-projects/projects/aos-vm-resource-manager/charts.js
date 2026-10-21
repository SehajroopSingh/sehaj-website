/* ============================================================
   Draws the result charts and runs the test-2 replay.
   Everything reads window.AOS_DATA (data.js).
   ============================================================ */
(function () {
  const D = window.AOS_DATA;
  const CORE_COLORS = ["var(--core0)", "var(--core1)", "var(--core2)", "var(--core3)"];
  const NS = "http://www.w3.org/2000/svg";

  // ---------- tiny SVG helpers ----------
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function stdev(a) {
    const m = a.reduce((s, v) => s + v, 0) / a.length;
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
  }

  // ============================================================
  // Replay of CPU test 2 (real monitor samples)
  // ============================================================
  (function replay() {
    const root = document.getElementById("replay");
    if (!root) return;
    const data = D.cpu2;
    const cores = document.getElementById("rp-cores");
    const slider = document.getElementById("rp-slider");
    const iterEl = document.getElementById("rp-iter");
    const sdEl = document.getElementById("rp-sd");
    const note = document.getElementById("rp-note");
    const playBtn = document.getElementById("rp-play");

    const cols = [];
    for (let c = 0; c < 4; c++) {
      const col = document.createElement("div");
      col.className = "rcore";
      col.style.setProperty("--core-color", CORE_COLORS[c]);
      col.innerHTML = '<div class="name">pCPU ' + c + '</div><div class="bar"><i></i></div><div class="pct">0%</div><div class="chips"></div>';
      cores.appendChild(col);
      cols.push(col);
    }

    function notes(i) {
      if (i === 1) return "First monitor sample. The VMs are idle and the monitor saw no pins yet.";
      if (i <= 5) return "The scheduler's first pass has already spread the eight vCPUs round-robin, two per core. The test workload hasn't started.";
      if (i === 6) return "Load appears and the first reading is uneven, so the scheduler re-pins. Orange chips moved this iteration. This is the only re-pin in the whole run.";
      if (i === 7) return "One interval later every core sits in the mid-90s. From here on the scheduler checks, finds the cores inside its ±10% band, and does nothing.";
      return "Steady state: all four cores within a few percent of each other and the pin map unchanged since iteration 6.";
    }

    function show(i) {
      const it = data[i - 1], prev = data[i - 2];
      slider.value = i;
      iterEl.textContent = "Iteration " + i + " / 25";
      for (let c = 0; c < 4; c++) {
        const u = Math.min(100, it.u[c]);
        cols[c].querySelector(".bar i").style.height = u + "%";
        cols[c].querySelector(".pct").textContent = it.u[c] + "%";
        const chips = cols[c].querySelector(".chips");
        chips.innerHTML = "";
        for (const vm of it.m[c]) {
          const s = document.createElement("span");
          s.className = "chip" + (prev && prev.m[c].length && !prev.m[c].includes(vm) ? " moved" : "");
          s.textContent = "vm" + vm;
          chips.appendChild(s);
        }
      }
      const sd = stdev(it.u);
      sdEl.textContent = "σ of core usage = " + sd.toFixed(1) + (it.u.some((v) => v > 0) ? (sd < 5 ? "  ✓ balanced" : "  ✗ unbalanced") : "");
      note.textContent = notes(i);
    }

    let timer = null;
    function stop() { clearInterval(timer); timer = null; playBtn.textContent = "Play"; }
    playBtn.onclick = () => {
      if (timer) return stop();
      let i = 0;
      show(1);
      playBtn.textContent = "Pause";
      timer = setInterval(() => { i++; show(i); if (i >= 25) stop(); }, 650);
    };
    slider.addEventListener("input", () => { stop(); show(Number(slider.value)); });
    show(6); // open on the one re-pin of the run; Play replays from the start
  })();

  // ============================================================
  // CPU line chart: % usage per core across 25 samples
  // ============================================================
  function cpuChart(id, data, opts) {
    const host = document.getElementById(id);
    if (!host) return;
    const W = 680, H = 240, L = 40, R = 12, T = 18, B = 44;
    const svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": opts.label });
    const x = (i) => L + ((i - 1) / 24) * (W - L - R);
    const y = (v) => T + (1 - Math.min(100, v) / 100) * (H - T - B);
    for (const v of [0, 25, 50, 75, 100]) {
      svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: v ? "grid" : "axis" }));
      svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "lbl" }, v + "%"));
    }
    for (const i of [1, 5, 10, 15, 20, 25]) svg.appendChild(el("text", { x: x(i), y: H - 26, "text-anchor": "middle", class: "lbl" }, i));
    svg.appendChild(el("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", class: "lbl" }, "monitor sample (one per interval)"));
    if (opts.marker) {
      svg.appendChild(el("line", { x1: x(opts.marker), x2: x(opts.marker), y1: T, y2: H - B, class: "marker" }));
      svg.appendChild(el("text", { x: x(opts.marker) - 6, y: y(50) + 4, "text-anchor": "end", class: "marker-text" }, opts.markerText));
    }
    for (let c = 0; c < 4; c++) {
      const pts = data.map((it) => x(it.i) + "," + y(it.u[c])).join(" ");
      svg.appendChild(el("polyline", { points: pts, fill: "none", stroke: CORE_COLORS[c], "stroke-width": 2, "stroke-linejoin": "round" }));
    }
    host.appendChild(svg);
  }
  cpuChart("chart-cpu2", D.cpu2, { label: "Per-core CPU usage, test 2", marker: 6, markerText: "re-pin" });

  // ============================================================
  // Memory charts
  // ============================================================
  function memChart(id, series, opts) {
    const host = document.getElementById(id);
    if (!host) return;
    const W = 680, H = 270, L = 48, R = 12, T = 16, B = 44;
    const max = opts.max;
    const n = series[0].values.length;
    const svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": opts.label });
    const x = (i) => L + (i / (n - 1)) * (W - L - R);
    const y = (v) => T + (1 - Math.min(max, v) / max) * (H - T - B);
    const step = max > 1000 ? 400 : 200;
    for (let v = 0; v <= max; v += step) {
      svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: v ? "grid" : "axis" }));
      svg.appendChild(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "lbl" }, v));
    }
    svg.appendChild(el("text", { x: L - 6, y: T - 4, "text-anchor": "end", class: "lbl" }, "MB"));
    for (const i of [0, 10, 20, 30, 40, 49]) svg.appendChild(el("text", { x: x(i), y: H - 26, "text-anchor": "middle", class: "lbl" }, i + 1));
    svg.appendChild(el("text", { x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle", class: "lbl" }, "monitor sample (one per interval)"));
    for (const t of opts.thresholds || []) {
      svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(t.v), y2: y(t.v), class: "thr" }));
      // label sits above or below the line, on a backing panel so it stays readable over the series
      const ty = t.below ? y(t.v) + 13 : y(t.v) - 5;
      const tw = t.text.length * 6.4 + 8;
      svg.appendChild(el("rect", { x: W - R - tw - 2, y: ty - 10, width: tw, height: 13, rx: 2, class: "thr-bg" }));
      svg.appendChild(el("text", { x: W - R - 6, y: ty, "text-anchor": "end", class: "lbl" }, t.text));
    }
    for (const s of series) {
      const pts = s.values.map((v, i) => x(i) + "," + y(v)).join(" ");
      svg.appendChild(el("polyline", { points: pts, fill: "none", stroke: s.color, "stroke-width": s.width || 2, "stroke-dasharray": s.dash || "none", "stroke-linejoin": "round", opacity: s.opacity || 1 }));
    }
    host.appendChild(svg);
  }

  // Test 1: VM2 is the only VM running a workload.
  memChart("chart-mem1", [
    { values: D.mem1["1"].map((p) => p[0]), color: "var(--muted)", width: 1.5, dash: "4 4" },
    { values: D.mem1["2"].map((p) => p[0]), color: "var(--core1)", width: 2.4 },
    { values: D.mem1["2"].map((p) => p[1]), color: "var(--core2)", width: 2 },
  ], { max: 1400, label: "VM2 memory during test 1", thresholds: [{ v: 90, text: "under 90 MB unused: give +100 MB", below: true }, { v: 200, text: "over 200 MB unused: take back" }] });

  // Test 3: every VM starts bloated from the previous test; coordinator reclaims.
  memChart("chart-mem3", ["1", "3", "5", "6", "7", "8"].map((k) => ({ values: D.mem3[k].map((p) => p[0]), color: "var(--muted)", width: 1.2, opacity: 0.7 }))
    .concat([
      { values: D.mem3["2"].map((p) => p[0]), color: "var(--core3)", width: 2.2 },
      { values: D.mem3["4"].map((p) => p[0]), color: "var(--core1)", width: 2.2 },
    ]), { max: 1800, label: "Memory of all eight VMs during test 3" });
})();
