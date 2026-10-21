/* ============================================================
   Constellation · the hand-off from the robotics journey to the
   Operating Systems chip. Drawn identically on two canvases:
     · the robotics stage, at the end of its last scene: the
       camera tilts down to the stars, three stars brighten and
       their lines reach in toward the centre (where the chip is)
     · the OS board, as it powers on: the same stars fade away and
       leave the three project nodes right where the stars were.
   Everything is in normalised coordinates, seeded, so both draw
   the very same picture at any viewport size.

     Constellation.draw(ctx, W, H, { stars, nodes, lines, chip, bg, alpha }, mobile)
       stars 0..1  how visible the star field is
       nodes 0..1  how far the three node-stars have brightened
       lines 0..1  how far their lines have grown toward the chip
       chip  0..1  faint chip outline at the centre
       bg    0..1  the board's dark blue behind everything
       alpha 0..1  overall opacity
   ============================================================ */
window.Constellation = (function () {
  "use strict";
  var NODES_DESK = [[0.11, 0.3], [0.14, 0.76], [0.89, 0.58]], NODES_PHONE = [[0.24, 0.17], [0.76, 0.17], [0.5, 0.86]];   // = os-board.js NODES
  var BG = "#05091a", seed = 9119, stars = [];
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (var i = 0; i < 320; i++) stars.push([rnd(), rnd(), 0.4 + rnd() * 1.3, 0.35 + rnd() * 0.65, rnd() * 6.28]);
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function draw(ctx, W, H, o, mobile) {
    var a = o.alpha == null ? 1 : o.alpha; if (a <= 0) return;
    var t = performance.now() / 1000, nodes = mobile ? NODES_PHONE : NODES_DESK;
    ctx.save(); ctx.globalAlpha = a;
    if (o.bg > 0) { ctx.globalAlpha = a * o.bg; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a; }   // one flat colour on both canvases, so the join is invisible
    if (o.stars > 0) {
      stars.forEach(function (s) {
        var tw = 0.75 + 0.25 * Math.sin(t * 1.3 + s[4]);
        ctx.fillStyle = "rgba(225,235,255," + (s[3] * tw * o.stars) + ")";
        ctx.beginPath(); ctx.arc(s[0] * W, s[1] * H, s[2], 0, 7); ctx.fill();
      });
    }
    var k = ease(o.nodes || 0), ln = ease(o.lines || 0), cx = W / 2, cy = H / 2;
    if (ln > 0) {
      ctx.lineCap = "round";
      nodes.forEach(function (n, i) {
        var x = n[0] * W, y = n[1] * H, kk = ease((ln - i * 0.12) / 0.76);
        if (kk <= 0) return;
        var ex = x + (cx - x) * kk, ey = y + (cy - y) * kk;
        ctx.strokeStyle = "rgba(120,180,255," + (0.35 + 0.4 * kk) + ")"; ctx.lineWidth = 2; ctx.shadowColor = "#4fc3ff"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, 7); ctx.fill();
      });
    }
    if (k > 0) {
      nodes.forEach(function (n, i) {
        var x = n[0] * W, y = n[1] * H, kk = ease((k - i * 0.18) / 0.64), r = 3 + 7 * kk;
        if (kk <= 0) return;
        var gl = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        gl.addColorStop(0, "rgba(160,210,255," + (0.55 * kk) + ")"); gl.addColorStop(1, "rgba(160,210,255,0)");
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(235,245,255," + kk + ")"; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(160,210,255," + (0.8 * kk) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
      });
    }
    if (o.chip > 0) {
      var S = Math.round(Math.min(W, H) * (mobile ? 0.34 : 0.27)), c = ease(o.chip);
      ctx.strokeStyle = "rgba(160,200,255," + (0.6 * c) + ")"; ctx.lineWidth = 1.5; ctx.shadowColor = "#3aa0ff"; ctx.shadowBlur = 18 * c;
      ctx.strokeRect(cx - S / 2, cy - S / 2, S, S); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  return { draw: draw, BG: BG };
})();
