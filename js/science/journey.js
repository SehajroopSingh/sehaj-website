/* ============================================================
   Science journey · scroll controller (projects.html)
   Six screens tall, pinned. Progress 0..5 drives the 3D world
   (js/science/world.js) and fades the cards in and out:
     0 MemSurf · the very card the phone section ended on, on the
       same box (the section starts a screen early and its stage
       pins as the phone section's lets go, so the card never
       moves); the neurons fade up behind it
     1 neurons + DNA   2 the autism paper   3 brain → head → crowd
     4 the earth       5 data frame → World DataSet
   The 3D world has five scenes, held at scene 0 during card 0, so
   world progress = max(0, p - 1).
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("science-journey");
  if (!root) return;
  var canvas = root.querySelector(".sj-canvas");
  var cards = Array.prototype.slice.call(root.querySelectorAll(".sj-card"));
  var dots = Array.prototype.slice.call(root.querySelectorAll(".sj-dot"));
  var N = cards.length;
  var world = window.SciWorld ? window.SciWorld.create(canvas) : null;
  if (!world) root.classList.add("sj-no3d");
  var CARDS = window.Timing.cards, SHOW_TO = window.Timing.science.handoff;
  var MAP = window.SceneMap(window.Timing.science.sceneWeights); window.SceneMaps["science-journey"] = MAP;   // shares the track's scroll out by scene weight
  var sp = window.SmoothProgress ? window.SmoothProgress({ maxSpeed: 1e9, follow: CARDS.smooth.follow }) : null;   // light camera smoothing only
  // a card with data-wait="flag" stays hidden until the world's state has that flag (e.g. the data frame has filed)
  var waits = cards.map(function (c) { return c.getAttribute("data-wait"); });
  var froms = cards.map(function (c) { var v = c.getAttribute("data-from"); return v == null ? null : parseFloat(v); });
  var current = -1, visible = false;

  function show(i) {
    if (i === current) return;
    cards.forEach(function (c, k) { c.classList.toggle("is-on", k === i); c.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    if (i >= 0) dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
    current = i;
  }
  // map card progress (0..6) to world progress (0..5): MemSurf card takes the first screen, the world starts half-way through it
  function apply(p, settled) {
    if (world) world.setProgress(Math.max(0, p - 1));
    var i = Math.floor(p), f = p - i;
    root.classList.toggle("sj-moving", !settled);
    var from = froms[i] != null ? froms[i] : CARDS.showFrom;
    var want = f > from && f < (i === N - 1 ? 0.97 : SHOW_TO) ? i : -1;   // the last card stays to the end of the track
    // the neurons fade up behind the MemSurf card, then stay
    var NF = window.Timing.science.neuronsFade; root.style.setProperty("--sj-in", i === 0 ? String(Math.max(0, Math.min(1, (f - NF[0]) / (NF[1] - NF[0])))) : "1");
    if (want >= 0 && waits[want] && !(world && world.state()[waits[want]])) want = -1;
    show(want);
  }
  var lastP = 0, HOLD = N - 1 + window.Timing.science.data.holdAt;   // the page waits here while the data frame fills
  function update() {
    var r = root.getBoundingClientRect(), vh = window.innerHeight;
    var p = MAP.toP((-r.top) / (r.height - vh));
    root.classList.toggle("sj-pending", r.top > 0.5);   // the section overlaps the phone section's last screen: stay hidden until our stage pins
    if (world && p > HOLD && (world.state().dataHolding || (world.state().scene === 4 && !world.state().dataFiled && p > HOLD))) {
      var hb = document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, window.scrollY + r.top + (r.height - vh) * MAP.toFrac(HOLD)); document.documentElement.style.scrollBehavior = hb; p = HOLD;
    }
    lastP = p;
    if (sp) sp.target(p); else apply(p, true);
    var nowVisible = r.bottom > 0 && r.top < vh;
    if (nowVisible !== visible) { visible = nowVisible; if (!visible) show(-1); if (world) world.setVisible(visible); }
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  if (sp) sp.onFrame(function (v, settled) { if (visible) apply(v, settled); });
  dots.forEach(function (d, k) { d.addEventListener("click", function () { var r = root.getBoundingClientRect(), vh = window.innerHeight; window.scrollTo({ top: window.scrollY + r.top + (r.height - vh) * MAP.toFrac(k + 0.5), behavior: "smooth" }); }); });

  // the paper card waits for an action potential to reach its terminal before it "starts";
  // the data card (data-wait) only appears once the points have filed into the frame — both are polled here
  var paper = root.querySelector(".sj-card--paper"), fired = false;
  (function tick() {
    if (world && paper && current === 2 && !fired && world.state().terminalHit) { fired = true; paper.classList.add("sj-paper-started"); }
    if (current !== 2) fired = false;
    if (!sp && visible) apply(lastP, true);            // without the smoother, keep re-checking the waits
    requestAnimationFrame(tick);
  })();
  update();
})();
