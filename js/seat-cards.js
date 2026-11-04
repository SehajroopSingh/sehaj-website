/* "Who I am" cards (homepage): each card's entrance is driven by scroll.
   As a card rises from the bottom of the screen to a little above the
   middle, its box slides in from its side as a rounded square making a
   quarter-turn, stretches into the full rectangle, then the text fades in.
   The animation only moves while you scroll (stop and it holds), so it is
   always finished before the card reaches comfortable reading height.
   Once a card has played all the way through it stays finished: scrolling
   back up doesn't undo it. Before that, scrolling up rewinds it.

   Uses the Web Animations API with paused animations whose time is set
   from the scroll position, no library. Left/right comes from the
   seat-card--left / --right class. */
(function () {
  var stack = document.querySelector(".seat-stack");
  if (!stack || !Element.prototype.animate) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Scroll window, as fractions of the viewport height at the card's top
  // edge: the entrance starts when the top passes START and is done by END.
  var START = 0.98, END = 0.38;
  // How the entrance is split along that window: slide, stretch, text.
  var SLIDE = 420, GROW = 380, TEXT = 200, TOTAL = SLIDE + GROW + TEXT;
  var EASE = "cubic-bezier(0.45, 0, 0.25, 1)";
  // Share of the remaining gap the shown progress closes each frame, so
  // wheel steps glide instead of jumping.
  var SMOOTH = 0.16;

  stack.classList.add("seat-anim");

  var cards = [].map.call(stack.querySelectorAll(".seat-card"), function (el) {
    return {
      el: el,
      bg: el.querySelector(".seat-bg"),
      content: el.querySelector(".seat-content"),
      anims: [],
      target: 0,      // progress the scroll position asks for (0 to 1)
      shown: 0,       // progress currently drawn, easing toward target
      locked: false,  // reached the end once: target stays at 1
      done: false     // finished and handed back to plain CSS
    };
  });

  function progressFor(c) {
    var vh = window.innerHeight;
    var top = c.el.getBoundingClientRect().top;
    var p = (START * vh - top) / ((START - END) * vh);
    return Math.min(Math.max(p, 0), 1);
  }

  function seek(c) {
    var t = c.shown * TOTAL;
    c.anims.forEach(function (a) { a.currentTime = t; });
  }

  function build(c) {
    c.anims.forEach(function (a) { a.cancel(); });
    var fromLeft = c.el.classList.contains("seat-card--left");
    var w = c.el.offsetWidth, h = c.el.offsetHeight;
    var off = (fromLeft ? -1 : 1) * Math.round(window.innerWidth * 0.55);
    var turn = fromLeft ? -90 : 90;
    function timing(delay, duration) {
      return { delay: delay, duration: duration, easing: EASE, fill: "both" };
    }
    c.anims = [
      // 1. square slides in from the side, turning 90deg
      c.bg.animate([
        { transform: "translateX(" + off + "px) rotate(" + turn + "deg)", opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { transform: "none", opacity: 1 }
      ], timing(0, SLIDE)),
      // 2. square stretches into the full rectangle
      c.bg.animate([{ width: h + "px" }, { width: w + "px" }], timing(SLIDE, GROW)),
      // 3. text fills in
      c.content.animate([
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "none" }
      ], timing(SLIDE + GROW, TEXT))
    ];
    c.anims.forEach(function (a) { a.pause(); });
    c.el.classList.add("seat-done");   // our keyframes own visibility from here
    seek(c);
  }

  function finish(c) {
    c.done = true;
    c.anims.forEach(function (a) { a.cancel(); });
    c.anims = [];
    c.el.classList.add("seat-done");   // plain CSS: box and text fully shown
  }

  var ticking = false;
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  function frame() {
    ticking = false;
    var moving = false;
    cards.forEach(function (c) {
      if (c.done) return;
      if (!c.locked) {
        c.target = progressFor(c);
        if (c.target >= 1) c.locked = true;
      }
      var gap = c.target - c.shown;
      c.shown = Math.abs(gap) < 0.002 ? c.target : c.shown + gap * SMOOTH;
      if (c.shown >= 1) { finish(c); return; }
      seek(c);
      if (c.shown !== c.target) moving = true;
    });
    if (cards.every(function (c) { return c.done; })) {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      return;
    }
    if (moving) request();
  }

  function onResize() {
    cards.forEach(function (c) { if (!c.done) build(c); });
    request();
  }

  // Start each card where the current scroll position puts it, so a page
  // that loads (or reloads) partway down doesn't replay cards above.
  cards.forEach(function (c) {
    c.target = c.shown = progressFor(c);
    if (c.target >= 1) finish(c);
    else build(c);
  });

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", onResize);
})();
