/* ============================================================
   Draws the three result charts from window.BIO_DATA (data.js):
     #chart-years   stacked bars, PubMed papers per year per gene
     #chart-panther grouped bars, PANTHER categories per gene list
     #cluster-genes gene chips for the two MCL clusters
   Plain SVG built in the DOM so it follows the page theme.
   ============================================================ */
(function () {
  const D = window.BIO_DATA;
  if (!D) return;
  const NS = "http://www.w3.org/2000/svg";
  const GENE_COLORS = ["var(--accent)", "var(--core1)", "var(--core2)", "var(--core3)", "#f2b134"];
  const LIST_COLORS = ["var(--accent)", "var(--core1)", "var(--core2)"];

  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- Papers per year, stacked by gene ----------
  (function yearsChart() {
    const root = document.getElementById("chart-years");
    if (!root) return;
    const genes = Object.keys(D.perYear);
    const n = D.years.to - D.years.from + 1;
    const totals = Array.from({ length: n }, (_, i) => genes.reduce((s, g) => s + D.perYear[g][i], 0));
    const max = Math.max(...totals);
    const W = 720, H = 260, L = 40, R = 12, T = 18, B = 34;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Stacked bar chart of PubMed papers per year from 2000 to 2022 for SHANK3, MECP2, NRXN1, SCN2A and SCN1A. Totals rise from near zero before 2007 to around 90 a year by 2022." });
    const step = (W - L - R) / n, bw = step * 0.7;
    const y = (v) => T + (1 - v / max) * (H - T - B);
    // grid + y labels
    for (let v = 0; v <= max; v += 20) {
      svg.appendChild(el("line", { class: "grid", x1: L, x2: W - R, y1: y(v), y2: y(v) }));
      svg.appendChild(el("text", { class: "lbl", x: L - 6, y: y(v) + 4, "text-anchor": "end" }, v));
    }
    svg.appendChild(el("line", { class: "axis", x1: L, x2: W - R, y1: y(0), y2: y(0) }));
    for (let i = 0; i < n; i++) {
      let acc = 0;
      genes.forEach((g, gi) => {
        const v = D.perYear[g][i];
        if (!v) return;
        const r = el("rect", { x: L + i * step + (step - bw) / 2, y: y(acc + v), width: bw, height: y(acc) - y(acc + v), fill: GENE_COLORS[gi], opacity: 0.9 });
        r.appendChild(el("title", {}, `${g} · ${D.years.from + i}: ${v} papers`));
        svg.appendChild(r);
        acc += v;
      });
      const yr = D.years.from + i;
      if (yr % 2 === 0) svg.appendChild(el("text", { class: "lbl", x: L + i * step + step / 2, y: H - B + 16, "text-anchor": "middle" }, yr));
    }
    svg.appendChild(el("text", { class: "ttl", x: L, y: 12 }, "PubMed papers mentioning the gene with \"Autism Spectrum Disorder\", per year"));
    root.appendChild(svg);
    const legend = document.createElement("div");
    legend.className = "legend-inline";
    legend.innerHTML = genes.map((g, i) => `<span><i style="background:${GENE_COLORS[i]}"></i>${g}</span>`).join("");
    root.appendChild(legend);
  })();

  // ---------- PANTHER biological-process categories, grouped bars ----------
  (function pantherChart() {
    const root = document.getElementById("chart-panther");
    if (!root) return;
    const cats = D.panther.categories, lists = ["1", "2", "3"];
    const rowH = 30, L = 210, R = 44, T = 20, B = 26, W = 720;
    const H = T + cats.length * rowH + B;
    const max = 80;
    const x = (v) => L + (v / max) * (W - L - R);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Grouped bar chart of PANTHER biological-process categories for the three SFARI gene-score lists. Cellular process, biological regulation and metabolic process dominate all three lists at similar percentages." });
    for (let v = 0; v <= max; v += 20) {
      svg.appendChild(el("line", { class: "grid", x1: x(v), x2: x(v), y1: T, y2: H - B }));
      svg.appendChild(el("text", { class: "lbl", x: x(v), y: H - B + 14, "text-anchor": "middle" }, v + "%"));
    }
    cats.forEach((c, ci) => {
      const y0 = T + ci * rowH;
      svg.appendChild(el("text", { class: "lbl", x: L - 8, y: y0 + rowH / 2 + 4, "text-anchor": "end" }, c));
      lists.forEach((ls, li) => {
        const v = D.panther[ls][ci];
        const bh = (rowH - 8) / 3;
        const r = el("rect", { x: L, y: y0 + 4 + li * bh, width: x(v) - L, height: bh - 1, fill: LIST_COLORS[li], opacity: 0.9 });
        r.appendChild(el("title", {}, `score ${ls} · ${c}: ${v}% of genes`));
        svg.appendChild(r);
      });
    });
    svg.appendChild(el("text", { class: "ttl", x: L, y: 12 }, "% of genes in each list carrying the category"));
    root.appendChild(svg);
    const legend = document.createElement("div");
    legend.className = "legend-inline";
    legend.innerHTML = lists.map((ls, i) => `<span><i style="background:${LIST_COLORS[i]}"></i>gene-score ${ls} (${D.scores[ls]} genes)</span>`).join("");
    root.appendChild(legend);
  })();

  // ---------- Cluster gene chips ----------
  (function clusterChips() {
    D.clusters.forEach((cl, i) => {
      const root = document.getElementById("cluster-genes-" + (i + 1));
      if (!root) return;
      root.innerHTML = cl.genes.map((g) => `<span>${g}</span>`).join("");
    });
  })();
})();
