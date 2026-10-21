/* ============================================================
   Draws the result charts from window.WDS_DATA (data.js):
     #chart-income  bars, years of schooling by income group
     #chart-corr    horizontal bars, correlation with schooling
     #chart-scatter scatter, temperature vs schooling
     #chart-pca     bars, variance explained per component
   ============================================================ */
(function () {
  const D = window.WDS_DATA;
  if (!D) return;
  const NS = "http://www.w3.org/2000/svg";
  const GROUPS = ["Low income", "Lower middle income", "Upper middle income", "High income"];
  const GROUP_COLORS = ["var(--accent)", "#f2b134", "var(--core2)", "var(--core1)"];
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function legend(root, items) {
    const l = document.createElement("div");
    l.className = "legend-inline";
    l.innerHTML = items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("");
    root.appendChild(l);
  }

  (function incomeChart() {
    const root = document.getElementById("chart-income");
    if (!root) return;
    const W = 720, H = 220, L = 40, R = 12, T = 18, B = 40, max = 14;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Bar chart: mean years of schooling rises from 2.3 in low-income countries to 11.1 in high-income countries." });
    const y = (v) => T + (1 - v / max) * (H - T - B);
    for (let v = 0; v <= max; v += 2) {
      svg.appendChild(el("line", { class: "grid", x1: L, x2: W - R, y1: y(v), y2: y(v) }));
      svg.appendChild(el("text", { class: "lbl", x: L - 6, y: y(v) + 4, "text-anchor": "end" }, v));
    }
    const step = (W - L - R) / D.byIncome.length;
    D.byIncome.forEach(([g, v, n], i) => {
      const x = L + i * step + step * 0.2, bw = step * 0.6;
      const r = el("rect", { x, y: y(v), width: bw, height: y(0) - y(v), fill: GROUP_COLORS[i], opacity: 0.9, rx: 3 });
      r.appendChild(el("title", {}, `${g}: ${v} years (${n} countries)`));
      svg.appendChild(r);
      svg.appendChild(el("text", { class: "ttl", x: x + bw / 2, y: y(v) - 6, "text-anchor": "middle" }, v.toFixed(1)));
      svg.appendChild(el("text", { class: "lbl", x: x + bw / 2, y: H - B + 16, "text-anchor": "middle" }, g));
      svg.appendChild(el("text", { class: "lbl", x: x + bw / 2, y: H - B + 30, "text-anchor": "middle" }, n + " countries"));
    });
    svg.appendChild(el("text", { class: "ttl", x: L, y: 12 }, "Mean years of schooling, child generation"));
    root.appendChild(svg);
  })();

  (function corrChart() {
    const root = document.getElementById("chart-corr");
    if (!root) return;
    const rowH = 28, L = 230, R = 40, T = 20, B = 26, W = 720;
    const H = T + D.corr.length * rowH + B;
    const x = (v) => L + ((v + 1) / 2) * (W - L - R);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Horizontal bars of correlation with children's schooling: parents' schooling 0.86 strongest, temperature negative at minus 0.58." });
    for (let v = -1; v <= 1; v += 0.5) {
      svg.appendChild(el("line", { class: v === 0 ? "axis" : "grid", x1: x(v), x2: x(v), y1: T, y2: H - B }));
      svg.appendChild(el("text", { class: "lbl", x: x(v), y: H - B + 14, "text-anchor": "middle" }, v.toFixed(1)));
    }
    D.corr.forEach(([name, v], i) => {
      const y0 = T + i * rowH;
      svg.appendChild(el("text", { class: "lbl", x: L - 8, y: y0 + rowH / 2 + 4, "text-anchor": "end" }, name));
      const r = el("rect", { x: Math.min(x(0), x(v)), y: y0 + 5, width: Math.abs(x(v) - x(0)), height: rowH - 10, fill: v < 0 ? "var(--accent)" : "var(--core1)", opacity: 0.9, rx: 2 });
      r.appendChild(el("title", {}, `${name}: r = ${v}`));
      svg.appendChild(r);
      svg.appendChild(el("text", { class: "ttl", x: v < 0 ? x(v) - 4 : x(v) + 4, y: y0 + rowH / 2 + 4, "text-anchor": v < 0 ? "end" : "start" }, v.toFixed(2)));
    });
    svg.appendChild(el("text", { class: "ttl", x: L, y: 12 }, "Correlation (r) with mean years of schooling"));
    root.appendChild(svg);
  })();

  (function scatterChart() {
    const root = document.getElementById("chart-scatter");
    if (!root) return;
    const W = 720, H = 300, L = 44, R = 14, T = 18, B = 40;
    const x = (t) => L + ((t - 5) / 32) * (W - L - R);
    const y = (v) => T + (1 - v / 15) * (H - T - B);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Scatter of 68 countries: hotter countries tend to have fewer years of schooling; high-income countries cluster cool and high." });
    for (let v = 0; v <= 15; v += 5) { svg.appendChild(el("line", { class: "grid", x1: L, x2: W - R, y1: y(v), y2: y(v) })); svg.appendChild(el("text", { class: "lbl", x: L - 6, y: y(v) + 4, "text-anchor": "end" }, v)); }
    for (let t = 5; t <= 35; t += 5) { svg.appendChild(el("line", { class: "grid", x1: x(t), x2: x(t), y1: T, y2: H - B })); svg.appendChild(el("text", { class: "lbl", x: x(t), y: H - B + 14, "text-anchor": "middle" }, t + "°C")); }
    // least-squares line
    const n = D.scatter.length, mx = D.scatter.reduce((s, p) => s + p[1], 0) / n, my = D.scatter.reduce((s, p) => s + p[2], 0) / n;
    let sxy = 0, sxx = 0;
    D.scatter.forEach((p) => { sxy += (p[1] - mx) * (p[2] - my); sxx += (p[1] - mx) ** 2; });
    const b = sxy / sxx, a = my - b * mx;
    svg.appendChild(el("line", { class: "thr", x1: x(7), y1: y(a + b * 7), x2: x(36), y2: y(a + b * 36) }));
    D.scatter.forEach(([c, t, v, g]) => {
      const dot = el("circle", { cx: x(t), cy: y(v), r: 5, fill: GROUP_COLORS[GROUPS.indexOf(g)], opacity: 0.8 });
      dot.appendChild(el("title", {}, `${c}: ${t}°C, ${v} years (${g})`));
      svg.appendChild(dot);
    });
    svg.appendChild(el("text", { class: "ttl", x: L, y: 12 }, "Daily maximum temperature vs mean years of schooling, 68 countries"));
    svg.appendChild(el("text", { class: "lbl", x: W - R, y: H - 4, "text-anchor": "end" }, "daily max temperature"));
    root.appendChild(svg);
    legend(root, GROUPS.map((g, i) => [GROUP_COLORS[i], g]));
  })();

  (function pcaChart() {
    const root = document.getElementById("chart-pca");
    if (!root) return;
    const W = 720, H = 200, L = 40, R = 12, T = 18, B = 30;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Bars of variance explained by nine principal components: 66 percent, 10, 8.5, then small." });
    const y = (v) => T + (1 - v / 0.7) * (H - T - B);
    for (let v = 0; v <= 0.7; v += 0.2) { svg.appendChild(el("line", { class: "grid", x1: L, x2: W - R, y1: y(v), y2: y(v) })); svg.appendChild(el("text", { class: "lbl", x: L - 6, y: y(v) + 4, "text-anchor": "end" }, Math.round(v * 100) + "%")); }
    const step = (W - L - R) / D.pca.length;
    let cum = 0;
    D.pca.forEach((v, i) => {
      cum += v;
      const r = el("rect", { x: L + i * step + step * 0.2, y: y(v), width: step * 0.6, height: y(0) - y(v), fill: i < 3 ? "var(--core1)" : "var(--chip)", stroke: "var(--line)", rx: 3 });
      r.appendChild(el("title", {}, `PC${i + 1}: ${(v * 100).toFixed(1)}% (cumulative ${(cum * 100).toFixed(0)}%)`));
      svg.appendChild(r);
      svg.appendChild(el("text", { class: "lbl", x: L + i * step + step / 2, y: H - B + 16, "text-anchor": "middle" }, "PC" + (i + 1)));
    });
    svg.appendChild(el("text", { class: "ttl", x: L, y: 12 }, "Share of variance explained · first three components = 85%"));
    root.appendChild(svg);
  })();
})();
