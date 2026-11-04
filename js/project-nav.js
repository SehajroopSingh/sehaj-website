/* ============================================================
   Project picker (projects.html) · a dropdown pinned at the right
   while you're inside the projects. It shows which project you're
   on (from the scroll position) and jumps to any other.
     data-track / data-idx + data-n   → scroll to a third of the way into that scene
     data-track / data-at             → scroll to that fraction of the track
     data-range="lo-hi"               → the project is "current" while the track's
                                        progress (0..1) is inside this range
     data-multi + group data-label    → several projects share a stop; the group label is shown
   ============================================================ */
(function () {
  "use strict";
  var nav = document.querySelector(".pj-jump"); if (!nav) return;
  var btn = nav.querySelector(".pj-jump-btn"), menu = nav.querySelector(".pj-jump-menu"), nameEl = nav.querySelector(".pj-jump-name");
  var links = Array.prototype.slice.call(menu.querySelectorAll("a[data-track]"));
  // split "Name · detail" into a title and a small grey line; keep the plain name for the button
  links.forEach(function (a) {
    var t = a.textContent.trim(), parts = t.split(" · ");
    a.setAttribute("data-name", parts[0]);
    a.innerHTML = '<span class="pj-t"></span>' + (parts[1] ? '<span class="pj-d"></span>' : '');
    a.querySelector(".pj-t").textContent = parts[0]; if (parts[1]) a.querySelector(".pj-d").textContent = parts.slice(1).join(" · ");
  });
  Array.prototype.forEach.call(menu.querySelectorAll(".pj-nav-group"), function (g, i) {
    g.style.setProperty("--i", i);
    Array.prototype.forEach.call(g.querySelectorAll("a"), function (a, j) { a.style.setProperty("--j", j); });
    var b = g.querySelector("b"); if (b) b.insertAdjacentHTML("afterbegin", "<em>" + ("0" + (i + 1)).slice(-2) + "</em>");
  });
  var section = document.querySelector(".cf-section");
  var tracks = {};
  links.forEach(function (a) { var id = a.getAttribute("data-track"); if (!tracks[id]) tracks[id] = document.getElementById(id); });

  function open(o) { menu.hidden = !o; btn.setAttribute("aria-expanded", o ? "true" : "false"); nav.classList.toggle("is-open", o); }
  btn.addEventListener("click", function () { open(menu.hidden); });
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) open(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });

  menu.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-track]"); if (!a) return;
    var el = tracks[a.getAttribute("data-track")]; if (!el) return;
    e.preventDefault(); open(false);
    var r = el.getBoundingClientRect(), vh = window.innerHeight, top = window.scrollY + r.top, span = r.height - vh, at;
    var map = window.SceneMaps && window.SceneMaps[a.getAttribute("data-track")];
    if (a.hasAttribute("data-idx")) { var pi = parseInt(a.getAttribute("data-idx"), 10) + 0.3; at = map ? map.toFrac(pi) : pi / parseInt(a.getAttribute("data-n"), 10); }
    else at = parseFloat(a.getAttribute("data-at"));
    window.__pjJumpUntil = Date.now() + 2000;   // a picker jump isn't held by the Project Void pause
    window.scrollTo({ top: top + span * at, behavior: "smooth" });
  });

  // which project is on screen right now
  var current = null;
  function update() {
    var vh = window.innerHeight, sr = section.getBoundingClientRect();
    nav.classList.toggle("is-here", sr.top < vh * 0.5 && sr.bottom > vh * 0.5);
    var found = null, label = null;
    Object.keys(tracks).forEach(function (id) {
      var el = tracks[id], r = el.getBoundingClientRect(), span = r.height - vh, p = (-r.top) / span, map = window.SceneMaps && window.SceneMaps[id];
      if (p < -0.003 || p > 1.003) return; p = Math.max(0, Math.min(1, p));   // (a hair of tolerance: scroll positions are whole pixels)
      if (map) p = map.toP(p) / map.N;   // ranges are written in even scene shares; undo the scene weighting
      links.forEach(function (a) {
        if (found || a.getAttribute("data-track") !== id) return;
        var rg = a.getAttribute("data-range").split("-").map(parseFloat);
        if (p >= rg[0] && p < rg[1]) { found = a; var g = a.closest(".pj-nav-group"); label = a.hasAttribute("data-multi") && g.getAttribute("data-label") ? g.getAttribute("data-label").split(" · ")[0] : a.getAttribute("data-name"); }
      });
    });
    if (found !== current) {
      current = found;
      links.forEach(function (a) { a.classList.toggle("is-current", !!found && (a === found || (a.hasAttribute("data-multi") && found.hasAttribute("data-multi") && a.closest(".pj-nav-group") === found.closest(".pj-nav-group")))); });
      nameEl.textContent = label || "Jump to a project";
      nav.querySelector(".pj-jump-now").textContent = found ? "Now viewing" : "Projects";
    }
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
