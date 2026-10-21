/* ============================================================
   SmoothProgress · shared by the pinned sections
   ------------------------------------------------------------
   Turns a raw scroll position into a value that moves at a capped
   speed, so flinging past a section still plays every scene in
   order instead of jumping. Also keeps a "settled" flag that cards
   use to wait until the camera has stopped before appearing.

     var sp = SmoothProgress({ maxSpeed: 1.2 });   // units per second
     sp.target(p);        // from the scroll handler
     sp.value             // smoothed value, updated every frame
     sp.settled           // true while |target - value| is small
     sp.onFrame(fn)       // called every animation frame
   ============================================================ */
window.SmoothProgress = function (opts) {
  "use strict";
  opts = opts || {};
  var maxSpeed = opts.maxSpeed || 1.2, follow = opts.follow || 6;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var api = { value: 0, target: setTarget, settled: true, onFrame: function (fn) { subs.push(fn); } };
  var tgt = 0, subs = [], last = performance.now(), init = false;
  function setTarget(p) { tgt = p; if (!init) { api.value = p; init = true; } }
  function frame(t) {
    var dt = Math.min(0.1, (t - last) / 1000); last = t;
    var d = tgt - api.value;
    if (reduce) api.value = tgt;
    else {
      // exponential chase, but never faster than maxSpeed units per second
      var step = d * Math.min(1, dt * follow), cap = maxSpeed * dt;
      if (Math.abs(step) > cap) step = cap * Math.sign(step);
      if (Math.abs(d) < 0.0005) api.value = tgt; else api.value += step;
    }
    api.settled = Math.abs(tgt - api.value) < 0.04;
    for (var i = 0; i < subs.length; i++) subs[i](api.value, api.settled);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return api;
};

/* ------------------------------------------------------------
   SceneMap · shares a pinned track's scroll out between scenes
   by weight (Timing.*.sceneWeights), so some scenes can take
   more scrolling than others. Registered per track id so the
   dots and the project picker can scroll to a given scene.
     var m = SceneMap(weights); m.toP(frac) → scene progress 0..N
     m.toFrac(p) → scroll fraction 0..1
   ------------------------------------------------------------ */
window.SceneMap = function (weights) {
  "use strict";
  var N = weights.length, total = weights.reduce(function (a, b) { return a + b; }, 0), cum = [0];
  weights.forEach(function (w, i) { cum.push(cum[i] + w / total); });
  return {
    N: N,
    toP: function (frac) { frac = Math.max(0, Math.min(1, frac)); for (var i = 0; i < N; i++) if (frac < cum[i + 1] || i === N - 1) return Math.min(N - 0.001, i + (frac - cum[i]) / (cum[i + 1] - cum[i])); return N - 0.001; },
    toFrac: function (p) { var i = Math.max(0, Math.min(N - 1, Math.floor(p))); return cum[i] + (p - i) * (cum[i + 1] - cum[i]); },
  };
};
window.SceneMaps = window.SceneMaps || {};
