/* ============================================================
   Robotics journey · the exit (scene 6, no card). Over the 3D
   world the stars settle in, three of them brighten and reach in
   toward the centre, and the board's dark blue comes up under
   them, so the page scrolls straight on into the OS chip with the
   same picture (js/constellation.js) waiting there.
   Driven by journey.js: RoboExit(canvas).set(f) with f 0..1 of
   the scene, or set(null) to hide.
   ============================================================ */
window.RoboExit = function (canvas) {
  "use strict";
  var ctx = canvas.getContext("2d"), W = 0, H = 0, f = null, X = window.Timing.robotics.exit;
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function win(x, w) { return ease((x - w[0]) / (w[1] - w[0])); }
  function size() {
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h;
  }
  function frame() {
    if (f !== null && X.fadeIn) {
      size(); ctx.clearRect(0, 0, W, H);
      window.Constellation.draw(ctx, W, H, { alpha: win(f, X.fadeIn), stars: 1, bg: 1 }, W < 760);   // the same flat sky and stars the board starts with
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { set: function (v) { if (v === null && f !== null) { size(); ctx.clearRect(0, 0, W, H); } f = v; canvas.style.visibility = v === null || !X.fadeIn ? "hidden" : "visible"; } };
};
