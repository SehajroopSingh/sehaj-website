/* ============================================================
   Robotics journey · scroll controller (projects.html)
   ------------------------------------------------------------
   The section is five screens tall. A sticky stage holds the 3D
   world (world3d.js) and one card per scene. As the page scrolls,
   progress p = 0..5 drives the world, and the card for the current
   scene fades in; the mini demos (mini-*.js) run only while shown.

   TO CHANGE A SCENE'S TEXT: edit its .rj-card in projects.html.
   TO CHANGE THE 3D ACTION: js/robotics/scenes.js (numbers in js/timing.js).
   TO CHANGE WHEN CARDS SHOW / HOW THE PAGE PACES: js/timing.js.
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("robotics-journey");
  if (!root) return;
  var canvas = root.querySelector(".rj-canvas");
  var cards = Array.prototype.slice.call(root.querySelectorAll(".rj-card"));
  var dots = Array.prototype.slice.call(root.querySelectorAll(".rj-dot"));
  var readouts = cards.map(function (c) { return c.querySelector(".rj-readout"); });
  var froms = cards.map(function (c) { var v = c.getAttribute("data-from"); return v == null ? null : parseFloat(v); });
  var tos = cards.map(function (c) { var v = c.getAttribute("data-to"); return v == null ? null : parseFloat(v); });
  var N = cards.length;
  var MAP = window.SceneMap(window.Timing.robotics.sceneWeights); window.SceneMaps["robotics-journey"] = MAP;
  var world = window.RoboWorld ? window.RoboWorld.create(canvas) : null;
  if (!world) { root.classList.add("rj-no3d"); }

  // minis attached to cards that have a <canvas data-mini="...">
  var minis = cards.map(function (c) {
    var mc = c.querySelector("[data-mini]");
    var fn = mc && window.RoboMini && window.RoboMini[mc.getAttribute("data-mini")];
    return fn ? fn(mc, world) : null;
  });

  var current = -1, lastShown = 0, visible = false;
  // with the wheel pacer (js/scroll-pace.js) the page itself moves at a capped speed, so the world can follow it closely;
  // without it (touch) the smoothing is what keeps a fling from skipping scenes
  var CARDS = window.Timing.cards, SHOW_TO = window.Timing.robotics.handoff;
  var sp = window.SmoothProgress ? window.SmoothProgress({ maxSpeed: 1e9, follow: CARDS.smooth.follow }) : null;   // light camera smoothing only
  function show(i) {
    if (i === current) return;
    cards.forEach(function (c, k) { c.classList.toggle("is-on", k === i); c.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    if (i >= 0) dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
    minis.forEach(function (m, k) { if (m) (k === i ? m.start() : m.stop()); });
    current = i;
    if (i >= 0) lastShown = i;
  }

  var exitCanvas = root.querySelector(".rj-exit"), exit = exitCanvas && window.RoboExit ? window.RoboExit(exitCanvas) : null;
  function apply(p, settled) {
    if (world) world.setProgress(p);
    if (exit) exit.set(p >= N - 1 ? p - (N - 1) : null);   // the last scene is the exit into the chip
    root.classList.toggle("rj-exiting", p >= N - 1);
    var i = Math.floor(p), f = p - i;
    // a card is readable for most of its scene and fades only during the hand-off to the next one
    root.classList.toggle("rj-moving", !settled);
    var from = froms[i] != null ? froms[i] : CARDS.showFrom, to = tos[i] != null ? tos[i] : SHOW_TO;   // a card may wait longer (data-from) or stay longer (data-to)
    show(f > from && f < to ? i : -1);
  }
  function update() {
    var r = root.getBoundingClientRect(), vh = window.innerHeight;
    var p = MAP.toP((-r.top) / (r.height - vh));   // scroll fraction → scene progress (scenes weighted: Timing.robotics.sceneWeights)
    if (sp) sp.target(p); else apply(p, true);
    var nowVisible = r.bottom > 0 && r.top < vh;
    if (nowVisible !== visible) { visible = nowVisible; if (!visible) show(-1); if (world) world.setVisible(visible); if (!visible) minis.forEach(function (m) { m && m.stop(); }); else if (minis[current]) minis[current].start(); }
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  if (sp) sp.onFrame(function (v, settled) { if (visible) apply(v, settled); });

  dots.forEach(function (d, k) {
    d.addEventListener("click", function () {
      var r = root.getBoundingClientRect(), vh = window.innerHeight;
      window.scrollTo({ top: window.scrollY + r.top + (r.height - vh) * MAP.toFrac(k + 0.5), behavior: "smooth" });
    });
  });

  // live readout from the 3D world (+ mission clock on the launch console)
  var clock = root.querySelector(".rj-clock"), t0 = null;
  (function tick() {
    var el = readouts[lastShown];
    if (world && el && visible) { var s = world.readout(); if (el.textContent !== s) el.textContent = s; }
    if (clock) { if (lastShown === 3) { if (t0 === null) t0 = performance.now(); var e = (performance.now() - t0) / 1000; clock.textContent = "T+ " + ("0" + Math.floor(e / 60)).slice(-2) + ":" + ("0" + Math.floor(e % 60)).slice(-2); } else t0 = null; }
    requestAnimationFrame(tick);
  })();
  update();
})();
