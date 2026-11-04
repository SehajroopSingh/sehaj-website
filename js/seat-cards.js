/* "Who I am" cards (homepage). Each card comes in the same way: its box
   slides in from its side as a rounded square making a quarter-turn,
   stretches into the full rectangle, then the text fades in. The
   entrance is driven by scroll, not a timer.

   Large screens (pinned): the section sticks to the screen. Scrolling
   moves its content as normal until a card reaches the middle, then the
   page holds still while your scrolling plays that card in; once it has
   finished, the page moves on to the next card. A finished card's hold is
   removed (with the scroll position adjusted so nothing jumps), so
   scrolling back up is ordinary scrolling and never undoes a card.
   After the last card, the section goes back to a normal layout.

   Small screens: no pinning; each card plays in as it rises from the
   bottom of the screen to a little above the middle, and stays finished
   once it has played through.

   Uses the Web Animations API with paused animations whose time is set
   from the scroll position, no library. Left/right comes from the
   seat-card--left / --right class. Without JS, or with reduced motion,
   the cards simply show. */
(function () {
  var section = document.querySelector(".seats");
  var stack = section && section.querySelector(".seat-stack");
  if (!stack || !Element.prototype.animate) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // How each entrance is split: slide, stretch, text.
  var SLIDE = 420, GROW = 380, TEXT = 200, TOTAL = SLIDE + GROW + TEXT;
  var EASE = "cubic-bezier(0.45, 0, 0.25, 1)";
  // Share of the remaining gap the drawn progress closes each frame, so
  // wheel steps glide instead of jumping.
  var SMOOTH = 0.22;
  // Pinned: scroll spent on each card while the page holds, in screen
  // heights. The card is fully in by PLAY of the way through; the rest is
  // a short rest so its glide settles before the page moves on.
  var HOLD = 0.6, PLAY = 0.8;
  // Small screens: scroll window at the card's top edge, in screen heights.
  var START = 0.98, END = 0.38;

  var pinned = window.innerWidth > 900 && window.innerHeight > 640;
  var root = document.documentElement;

  stack.classList.add("seat-anim");

  var cards = [].map.call(stack.querySelectorAll(".seat-card"), function (el) {
    return {
      el: el,
      bg: el.querySelector(".seat-bg"),
      content: el.querySelector(".seat-content"),
      anims: [],
      target: 0,         // progress the scroll position asks for (0 to 1)
      shown: 0,          // progress currently drawn, easing toward target
      locked: false,     // reached the end once: target stays at 1
      done: false,       // animation finished and handed back to plain CSS
      collapsed: false   // pinned: its hold has been removed from the page
    };
  });

  /* ---------- the entrance animation, scrubbed by progress ---------- */

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

  // Jump the page without the site-wide smooth scrolling kicking in.
  function scrollInstantly(y) {
    var behaviour = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    root.style.scrollBehavior = behaviour;
  }

  /* ---------- pinned mode (large screens) ---------- */

  var header = document.querySelector(".site-header");
  var viewport, track, vh = 0, maxV = 0, holds = [], idleTimer = null;

  function pin() {
    var cs = getComputedStyle(section);
    viewport = document.createElement("div");
    viewport.className = "seats-viewport";
    track = document.createElement("div");
    track.className = "seats-track";
    track.style.paddingTop = cs.paddingTop;
    track.style.paddingBottom = cs.paddingBottom;
    while (section.firstChild) track.appendChild(section.firstChild);
    viewport.appendChild(track);
    section.appendChild(viewport);
    section.classList.add("seats--pin");
  }

  function runway() {
    return holds.reduce(function (sum, h) { return sum + h.len; }, vh + maxV);
  }

  // Where each card's hold sits: the content offset (at) that puts the
  // card in the middle of the screen below the header.
  function measure() {
    vh = window.innerHeight;
    viewport.style.height = vh + "px";
    var headerH = header ? Math.min(header.offsetHeight, vh / 4) : 0;
    var middle = headerH + (vh - headerH) / 2;
    maxV = Math.max(0, track.offsetHeight - vh);
    var trackTop = track.getBoundingClientRect().top;
    var len = Math.round(vh * HOLD);
    holds = [];
    cards.forEach(function (c) {
      if (c.collapsed) return;
      var r = c.el.getBoundingClientRect();
      var at = Math.min(Math.max(r.top - trackTop + r.height / 2 - middle, 0), maxV);
      if (holds.length) at = Math.max(at, holds[holds.length - 1].at);
      holds.push({ card: c, at: at, len: len, start: 0 });
    });
    section.style.height = runway() + "px";
  }

  function scrolled() {
    return Math.min(Math.max(-section.getBoundingClientRect().top, 0), section.offsetHeight - vh);
  }

  // Map the scroll into the section to a content offset: content moves
  // 1:1 with the scroll, except inside a hold, where it stays put and the
  // scroll drives that card instead.
  function place() {
    var r = scrolled(), acc = 0, prev = 0, v = null;
    holds.forEach(function (h) {
      h.start = acc + (h.at - prev);
      if (v === null) {
        if (r < h.start) v = prev + (r - acc);
        else if (r < h.start + h.len) v = h.at;
      }
      if (!h.card.locked) h.card.target = Math.min(Math.max((r - h.start) / (h.len * PLAY), 0), 1);
      acc = h.start + h.len;
      prev = h.at;
    });
    if (v === null) v = Math.min(prev + (r - acc), maxV);
    track.style.transform = "translateY(" + (-v) + "px)";
  }

  // Remove the holds of cards that have finished, shifting the scroll by
  // however much of those holds is behind us so the screen doesn't move.
  function collapse() {
    place();
    var r = scrolled(), shift = 0, removed = false;
    holds = holds.filter(function (h) {
      if (!h.card.locked) return true;
      shift += Math.min(Math.max(r - h.start, 0), h.len);
      h.card.collapsed = true;
      removed = true;
      return false;
    });
    if (!removed) return;
    if (!holds.length) { unpin(); return; }
    root.style.overflowAnchor = "none";
    section.style.height = runway() + "px";
    if (shift) scrollInstantly(window.scrollY - shift);
    void root.offsetHeight;            // settle layout before anchoring returns
    root.style.overflowAnchor = "";
    place();
  }

  // Every card is in: back to a normal section, keeping the content where
  // it is on screen.
  function unpin() {
    var first = track.firstElementChild;
    var before = first.getBoundingClientRect().top;
    root.style.overflowAnchor = "none";
    section.classList.remove("seats--pin");
    section.style.height = "";
    viewport.style.height = "";
    track.style.transform = "";
    track.style.paddingTop = "";
    track.style.paddingBottom = "";
    var after = first.getBoundingClientRect().top;
    if (after !== before) scrollInstantly(window.scrollY + (after - before));
    void root.offsetHeight;
    root.style.overflowAnchor = "";
    pinned = false;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
  }

  /* ---------- small screens ---------- */

  function progressFor(c) {
    var h = window.innerHeight;
    var top = c.el.getBoundingClientRect().top;
    return Math.min(Math.max((START * h - top) / ((START - END) * h), 0), 1);
  }

  /* ---------- the loop ---------- */

  var ticking = false;
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  function step(c, settle) {
    if (c.done) return false;
    if (!c.locked) {
      if (!pinned) c.target = progressFor(c);
      if (c.target >= 1) c.locked = true;
    }
    var gap = c.target - c.shown;
    c.shown = settle || Math.abs(gap) < 0.002 ? c.target : c.shown + gap * SMOOTH;
    if (c.shown >= 1) { finish(c); return false; }
    seek(c);
    return c.shown !== c.target;
  }

  function frame() {
    ticking = false;
    if (pinned) place();
    var moving = false;
    cards.forEach(function (c) { if (step(c)) moving = true; });
    if (!pinned && cards.every(function (c) { return c.done; })) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      return;
    }
    if (moving) request();
  }

  function onScroll() {
    request();
    if (pinned) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (pinned && cards.some(function (c) { return c.locked && !c.collapsed; })) collapse();
      }, 180);
    }
  }

  function onResize() {
    cards.forEach(function (c) { if (!c.done) build(c); });
    if (pinned) measure();
    request();
  }

  /* ---------- start ---------- */

  cards.forEach(build);
  if (pinned) { pin(); measure(); place(); }
  // Start each card where the current scroll puts it, so a page that loads
  // (or reloads) partway down doesn't replay cards above.
  cards.forEach(function (c) { step(c, true); });
  if (pinned && cards.some(function (c) { return c.locked; })) collapse();

  if (cards.some(function (c) { return !c.done; }) || pinned) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
  }
})();
