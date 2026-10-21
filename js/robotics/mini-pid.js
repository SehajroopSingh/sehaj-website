/* ============================================================
   Mini PID strip chart (robotics journey, scene 3)
   Plots the drone's altitude against its target, fed live from
   the 3D world (world.state()). Returns { start(), stop() }.
   ============================================================ */
window.RoboMini = window.RoboMini || {};
window.RoboMini.pid = function (canvas, world) {
  "use strict";
  var ctx = canvas.getContext("2d"), N = 240, alt = [], goal = [], running = false, acc = 0, last = 0;
  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; acc += dt;
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr)) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var st = world ? world.state() : null;
    if (st && acc > 0.04) { acc = 0; alt.push(st.alt); goal.push(st.goal); if (alt.length > N) { alt.shift(); goal.shift(); } }
    ctx.fillStyle = "#070a12"; ctx.fillRect(0, 0, w, h);
    var L = 30, y = function (v) { return h - 14 - (v / 5.5) * (h - 26); };
    ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1;
    for (var m = 0; m <= 5; m++) { ctx.beginPath(); ctx.moveTo(L, y(m)); ctx.lineTo(w - 6, y(m)); ctx.stroke(); ctx.fillStyle = "#6b7383"; ctx.font = "9px ui-monospace, Menlo, monospace"; ctx.textAlign = "right"; ctx.fillText(m + "m", L - 4, y(m) + 3); }
    function line(arr, col, dash) { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash(dash || []); ctx.beginPath(); arr.forEach(function (v, i) { var x = L + (i / (N - 1)) * (w - L - 6); i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); }); ctx.stroke(); ctx.setLineDash([]); }
    line(goal, "#ffd166", [4, 3]); line(alt, "#3ddc97");
    if (alt.length) { var lx = L + ((alt.length - 1) / (N - 1)) * (w - L - 6); ctx.fillStyle = "#3ddc97"; ctx.beginPath(); ctx.arc(lx, y(alt[alt.length - 1]), 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#9aa4b2"; ctx.font = "9.5px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
    ctx.fillText("ALT", L + 4, 11); ctx.fillStyle = "#ffd166"; ctx.fillText("TARGET", L + 34, 11);
    requestAnimationFrame(frame);
  }
  return { start: function () { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }, stop: function () { running = false; } };
};
