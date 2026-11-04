/* See-through header that collapses into a menu pill (Projects page).
   At the top of the page the header is transparent over the scene. Once
   the page scrolls past 80px, the brand and links fade out and a pill
   appears top-right; clicking it opens the links as a small panel.
   Desktop only — phones keep the normal Menu toggle from main.js. */
(function () {
  var header = document.querySelector(".site-header--glass");
  if (!header) return;
  var pill = header.querySelector(".nav-pill");
  var desktop = window.matchMedia("(min-width: 901px)");

  function setOpen(open) {
    header.classList.toggle("menu-open", open);
    if (pill) {
      pill.setAttribute("aria-expanded", open ? "true" : "false");
      pill.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }
  function update() {
    var collapsed = desktop.matches && window.scrollY > 80;
    header.classList.toggle("is-collapsed", collapsed);
    document.documentElement.classList.toggle("hdr-collapsed", collapsed);   // the project picker (top left) only shows once the bar has tucked away
    if (!collapsed) setOpen(false);
  }

  if (pill) {
    pill.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!header.classList.contains("menu-open"));
    });
  }
  document.addEventListener("click", function (e) {
    if (header.classList.contains("menu-open") && !header.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("menu-open")) { setOpen(false); if (pill) pill.focus(); }
  });

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
  }, { passive: true });
  if (desktop.addEventListener) desktop.addEventListener("change", update);
  update();
})();
