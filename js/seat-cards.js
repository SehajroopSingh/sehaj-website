/* "Who I am" cards (homepage): as each card scrolls into view, its box
   slides in from its side as a rounded square making a quarter-turn,
   stretches into the full rectangle, then the text fades in. Easing is
   anime.js's inOutExpo. Uses the browser's Web Animations API — no library.
   Left/right comes from the seat-card--left / --right class. */
(function () {
  var stack = document.querySelector(".seat-stack");
  if (!stack || !("IntersectionObserver" in window) || !Element.prototype.animate) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var EXPO = "cubic-bezier(0.87, 0, 0.13, 1)";      // inOutExpo
  stack.classList.add("seat-anim");

  function run(card) {
    var bg = card.querySelector(".seat-bg");
    var content = card.querySelector(".seat-content");
    var fromLeft = card.classList.contains("seat-card--left");
    var w = card.offsetWidth, h = card.offsetHeight;
    var off = (fromLeft ? -1 : 1) * Math.round(window.innerWidth * 0.55);
    var turn = fromLeft ? -90 : 90;

    card.classList.add("seat-done");                 // let our keyframes own visibility
    bg.style.width = h + "px";
    content.style.opacity = "0";

    // 1. square slides in from the side, turning 90deg
    var slide = bg.animate([
      { transform: "translateX(" + off + "px) rotate(" + turn + "deg)", opacity: 0 },
      { opacity: 1, offset: 0.25 },
      { transform: "none", opacity: 1 }
    ], { duration: 950, easing: EXPO, fill: "forwards" });

    slide.finished.then(function () {
      // 2. square stretches into the full rectangle
      var grow = bg.animate([{ width: h + "px" }, { width: w + "px" }],
                            { duration: 850, easing: EXPO, fill: "forwards" });
      return grow.finished;
    }).then(function () {
      bg.style.width = ""; bg.getAnimations().forEach(function (a) { a.cancel(); });
      // 3. text fills in
      content.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
                      { duration: 450, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" })
        .finished.then(function () { content.style.opacity = ""; });
    });
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
    });
  }, { threshold: 0.35 });
  stack.querySelectorAll(".seat-card").forEach(function (c) { io.observe(c); });
})();
