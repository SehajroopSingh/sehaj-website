/* ============================================================
   Science journey · the brain that draws itself (projects.html)
   A flat, pen-drawn brain on a canvas sprite: a cream line traces the
   outline, the folds, the cerebellum and the stem, a small glowing nib
   leads the line, then the shape fills with soft periwinkle.
   Built by js/science/assets.js (A.brain2d) and driven from
   js/science/scenes.js → zoom(): set(draw 0..1, fill 0..1).
   Timing: Timing.science.zoom.brainDraw / brainFill (js/timing.js).
   ============================================================ */
window.SciBrain2D = function (T, scene) {
  "use strict";
  var W = 1024, H = 860, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  var g = cv.getContext("2d");
  var LINE = "#FFF8F3", FILL = "rgba(170,179,230,ALPHA)", FILL2 = "rgba(205,235,221,ALPHA)", NIB = "#F3E27A";

  // ---- the drawing, as polylines in canvas pixels ----
  function lumpy(cx, cy, rx, ry, bumps, amp, from, to, n, flatBottom) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var th = from + (to - from) * (i / n), r = 1 + amp * Math.sin(th * bumps), y = Math.sin(th);
      if (flatBottom && y > 0) r *= 1 - 0.28 * y * y;
      pts.push([cx + Math.cos(th) * rx * r, cy + y * ry * r]);
    }
    return pts;
  }
  function squiggle(pts, n) {   // a smooth curve through a few control points (Catmull-Rom)
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var k = 0; k < n; k++) { var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
    }
    out.push(pts[pts.length - 1]); return out;
  }
  function fold(x0, y0, x1, y1, amp, waves) {   // a soft wavy fold line
    var pts = [], n = 60, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (var i = 0; i <= n; i++) { var t = i / n, w = Math.sin(t * Math.PI * waves) * amp * Math.sin(t * Math.PI); pts.push([x0 + dx * t + nx * w, y0 + dy * t + ny * w]); }
    return pts;
  }
  var cerebrum = lumpy(470, 380, 360, 265, 11, 0.032, Math.PI * 0.62, Math.PI * 2.62, 280, true);
  var cereb = lumpy(650, 612, 140, 80, 8, 0.045, Math.PI * 1.05, Math.PI * 3.05, 140, false);
  var strokes = [   // just the outline: no folds inside, so nothing competes with the neurons
    cerebrum,
    cereb,
    fold(568, 600, 585, 800, 8, 1),
    fold(640, 660, 640, 800, 6, 1),
  ];
  var lens = strokes.map(function (s) { var L = 0; for (var i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; });
  var TOTAL = lens.reduce(function (a, b) { return a + b; }, 0);

  function path(pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); }
  function render(draw, fill) {
    g.clearRect(0, 0, W, H);
    if (fill > 0) {   // the soft fill, under the line
      path(cerebrum); g.closePath(); g.fillStyle = FILL.replace("ALPHA", (0.5 * fill).toFixed(3)); g.fill();
      path(cereb); g.closePath(); g.fillStyle = FILL2.replace("ALPHA", (0.6 * fill).toFixed(3)); g.fill();
      g.beginPath(); g.ellipse(360, 250, 70, 34, -0.5, 0, 6.283); g.fillStyle = "rgba(255,255,255," + (0.25 * fill).toFixed(3) + ")"; g.fill();   // a soft shine
    }
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 14;
    var left = draw * TOTAL, tip = null;
    for (var s = 0; s < strokes.length && left > 0; s++) {
      var pts = strokes[s]; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) {
        var seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (seg >= left) { var k = left / seg, x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k; g.lineTo(x, y); tip = [x, y]; left = 0; break; }
        g.lineTo(pts[i][0], pts[i][1]); left -= seg;
      }
      g.stroke();
    }
    if (tip && draw < 1) {   // the pen nib leading the line
      var gr = g.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], 46); gr.addColorStop(0, "rgba(243,226,122,.9)"); gr.addColorStop(1, "rgba(243,226,122,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(tip[0], tip[1], 46, 0, 6.283); g.fill();
      g.fillStyle = NIB; g.beginPath(); g.arc(tip[0], tip[1], 11, 0, 6.283); g.fill();
    }
    tex.needsUpdate = true;
  }

  var tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding;
  var sprite = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(4, 4 * H / W, 1); sprite.renderOrder = 1; sprite.visible = false; scene.add(sprite);
  var lastD = -1, lastF = -1;
  return {
    sprite: sprite,
    geo: { W: W, H: H, cx: 470, cy: 380, rx: 360, ry: 265 },   // the cerebrum's outline in canvas pixels (used to fit it around the neurons)
    set: function (draw, fill) {
      draw = Math.round(Math.max(0, Math.min(1, draw)) * 400) / 400; fill = Math.round(Math.max(0, Math.min(1, fill)) * 100) / 100;
      if (draw === lastD && fill === lastF) return; lastD = draw; lastF = fill; render(draw, fill);
    },
  };
};
