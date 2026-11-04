/* ============================================================
   Mobile section · zoom out from the chip to the phone
   (projects.html). Shares the pinned stage with the OS board:
   the wrapper is four screens tall, the first screen is the board
   itself, the remaining three are this zoom. Progress p (0..1)
   over those three screens drives four phases:

     0.00–0.45  zoom out: the chip shrinks, the phone's edges close
                in from outside the screen
     0.35–0.55  the screen slides over the chip (we pass it in z)
     0.55–0.75  the phone tilts into 3D
     0.50–0.68  two app cards pop out of the phone: Screen Time
                first, then MemSurf to the right
     0.70–1.00  the hand-off: the phone and Screen Time glide off
                to the left while MemSurf grows and settles in the
                centre of the screen — the full card the science
                journey then takes over on the very same box

   Everything is CSS transforms set from here; the look lives in
   css/phone-zoom.css and the markup in projects.html.
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("phone-zoom"), wrap = document.getElementById("osb-wrap"), board = document.getElementById("os-board");
  if (!root || !wrap || !board) return;
  var chip = board.querySelector(".osb-canvas"), phone = root.querySelector(".pz-phone"), screen = root.querySelector(".pz-screen");
  var PH = window.Timing.phone, BOARD_SHARE = PH.boardShare;   // the first part of the track is the board on its own (all numbers: js/timing.js)
  var apps = Array.prototype.slice.call(root.querySelectorAll(".pz-app"));
  var label = board.querySelector(".pz-label") || root.querySelector(".pz-label");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // where the expanded MemSurf card ends up — the science journey's first card is placed on exactly the same box
  function memsurfGeometry(vw, vh) {
    var w = vw < 760 ? Math.min(300, vw * 0.86) : Math.min(1000, vw - 96);   // centred on the screen; on desktop it only grows wider (the extra text opens in a second column)
    return { w: w, right: vw / 2 + w / 2, ty: 0 };
  }
  window.MemSurfGeometry = memsurfGeometry;
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function smoother(x) { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); }   // smootherstep: starts and ends even more gently

  var lastP = -1;
  var sp = window.SmoothProgress ? window.SmoothProgress({ maxSpeed: 1e9, follow: PH.smooth.follow }) : null;
  function update() {
    var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
    var p = clamp01(((-r.top) / (r.height - vh) - BOARD_SHARE) / (1 - BOARD_SHARE));
    if (sp) sp.target(p); else render(p);
  }
  function render(p) {
    if (reduce) p = p < 0.5 ? 0 : 1;
    if (p === lastP) return; lastP = p;

    function win(w) { return ease((p - w[0]) / (w[1] - w[0])); }
    var zoom = ease(p / PH.zoom);                    // 0 = chip fills the view, 1 = phone fits the view
    var pass = win(PH.pass);                         // screen passing over the chip
    var tilt = win(PH.tilt);
    var out = win(PH.apps);
    var exp = smoother((p - PH.expand[0]) / (PH.expand[1] - PH.expand[0]));   // the hand-off: phone + Screen Time glide off left, MemSurf grows to the centre (a softer curve than the other phases)

    // the phone starts scaled so its screen is exactly as wide as the view (its edges off screen) and shrinks to 1×;
    // the board shrinks by the very same factor, so the chip and its nodes always sit inside the phone's screen
    var s0 = root.clientWidth / Math.max(1, screen.offsetWidth), s = s0 - (s0 - 1) * zoom, narrowView = root.clientWidth < 760;
    // on phones the device tilts less and drops back so the cards sit cleanly in front of it
    var vw = root.clientWidth, vh = root.clientHeight, cx = vw / 2;
    var leave = narrowView ? "translateY(" + (-exp * (vh * 0.5 + 420)) + "px) " : "translateX(" + (-exp * (cx + 320)) + "px) ";
    phone.style.transform = "translate(-50%, -50%) " + leave + "translateZ(" + (narrowView ? -140 * out : 0) + "px) scale(" + s + ") rotateY(" + (-22 * tilt * (narrowView ? 0.35 : 1)) + "deg) rotateX(" + (8 * tilt * (narrowView ? 0.35 : 1)) + "deg)";
    chip.style.transform = "scale(" + (s / s0) + ")";
    chip.style.opacity = String(1 - pass);
    board.classList.toggle("osb-zooming", p > 0.02);
    screen.style.opacity = String(pass);
    screen.style.transform = "translateZ(" + (40 - 40 * pass) + "px)";
    root.classList.toggle("pz-screen-on", pass > 0.5);
    root.classList.toggle("pz-tilted", tilt > 0.2);

    apps.forEach(function (a, i) {
      var k = ease((out - i * 0.4) / 0.6), dir = i === 0 ? -1 : 1, narrow = narrowView;   // Screen Time first, MemSurf after it
      var tx = narrow ? 0 : dir * (120 + 210 * k), ty = narrow ? dir * 150 * k : -20 + 10 * i, sc = narrow ? 0.78 : 1, w = 300, tz = narrow ? 40 : 160;
      if (i === 0) {                                     // Screen Time goes off with the phone
        if (narrow) ty -= exp * (vh * 0.5 + 420); else tx -= exp * (cx + 320);
      } else {                                           // MemSurf grows into the full card, centred on the screen
        var geo = memsurfGeometry(vw, vh);
        w = 300 + (geo.w - 300) * exp; ty = ty * (1 - exp) + geo.ty * exp; tz = tz * (1 - exp); sc = sc + (1 - sc) * exp;
        tx = narrow ? 0 : (geo.right - cx) - w / 2;
        if (!narrow) tx = 330 * (1 - exp) + tx * exp;
        a.style.width = w + "px"; a.style.setProperty("--exp", String(exp));
      }
      a.style.transform = "translate(-50%, -50%) translateX(" + tx + "px) translateY(" + ty + "px) translateZ(" + tz + "px) scale(" + (0.2 + (sc - 0.2) * k) + ")";
      a.style.opacity = String(k);
      a.style.pointerEvents = k > 0.9 ? "auto" : "none";
      a.setAttribute("aria-hidden", k > 0.9 ? "false" : "true");
    });
    // the caption and the "keep scrolling" hint go with the phone; the MemSurf card is all that is left
    var cap = board.querySelector(".osb-label"), hint = board.querySelector(".osb-hint");
    if (cap) cap.style.opacity = exp > 0 ? String(1 - exp) : ""; if (hint) hint.style.opacity = exp > 0 ? String(1 - exp) : "";
    if (label) label.textContent = p < PH.labels[0] ? "zooming out from the chip" : p < PH.labels[1] ? "the phone it lives in" : p < PH.labels[2] ? "turning it over" : exp > 0.5 ? "MemSurf" : "two apps built for it";
    root.style.visibility = p > 0 ? "visible" : "hidden";
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", function () { lastP = -1; update(); });
  if (sp) sp.onFrame(function (v) { render(v); });
  update();
})();
