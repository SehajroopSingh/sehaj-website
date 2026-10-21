/* ============================================================
   Projects Cover Flow
   ------------------------------------------------------------
   Builds the iTunes-style album-art carousel on projects.html.

   Each section on projects.html has a <div class="coverflow"
   data-group="..."> and shows only the projects with that group.

   TO ADD OR EDIT A PROJECT: change the PROJECTS list below.
   Each entry needs a group (matching a section's data-group),
   a title, a short label, a summary, a link and an `art` key
   that picks one of the cover drawings in ART.
   Colours are the cover's background gradient (top, bottom) and
   its accent.

   Controls: arrow keys, mouse wheel / trackpad, drag or swipe,
   click a side cover to bring it forward, click the centre cover
   (or the button below) to open the project.
   ============================================================ */
(function () {
  "use strict";

  var BASE = "grad-projects/projects/";

  var PROJECTS = [
    { group: "robotics", slug: "solar-system-particle-filter", title: "Solar System", sub: "Particle filter", kind: "Live demo",
      tags: "AI for Robotics · localization", art: "particles", bg: ["#0b1530", "#03060f"], accent: "#7cc4ff",
      summary: "A satellite lost in a solar system can only measure how hard gravity is pulling. A particle filter turns that one number, read over and over, into a position." },
    { group: "robotics", slug: "hopscotch-kalman-filter", title: "HopScotch", sub: "Kalman filter", kind: "Live demo",
      tags: "AI for Robotics · tracking", art: "asteroids", bg: ["#2a1240", "#0c0514"], accent: "#ffd166",
      summary: "Dozens of asteroids drift past with noisy positions. One Kalman filter per rock predicts where each will be next, so the ship can jump without missing." },
    { group: "robotics", slug: "drone-pid-control", title: "Drone Control", sub: "PID + Twiddle", kind: "Live demo",
      tags: "AI for Robotics · control", art: "pid", bg: ["#0f2a2a", "#041010"], accent: "#3ddc97",
      summary: "A two-rotor drone has to reach a target without overshooting or wobbling. PID controllers do the flying; Twiddle finds the gains automatically." },
    { group: "robotics", slug: "indiana-drones-slam", title: "Indiana Drones", sub: "Graph SLAM", kind: "Live demo",
      tags: "AI for Robotics · mapping", art: "forest", bg: ["#13301b", "#050f07"], accent: "#ffd166",
      summary: "A drone lands in an unknown forest with no GPS. It maps the trees, keeps track of itself within that map, and flies to a treasure without crashing." },
    { group: "robotics", slug: "warehouse-search", title: "Warehouse", sub: "A* + value iteration", kind: "Live demo",
      tags: "AI for Robotics · planning", art: "grid", bg: ["#3a1d0c", "#120804"], accent: "#ff9b54",
      summary: "Deliver boxes through a cluttered warehouse with A* search, then plan a full policy that still works when the robot's wheels slip." },
    { group: "systems", slug: "aos-vm-resource-manager", title: "vCPU Scheduler", sub: "Memory coordinator", kind: "Walkthrough",
      tags: "Advanced OS · C · libvirt · KVM", art: "cores", bg: ["#101b3a", "#04070f"], accent: "#ff8a5b",
      summary: "Two programs that keep eight virtual machines balanced across four cores and fed with memory, explained step by step with charts from the real test logs." },
    { group: "systems", slug: "infos-kernel-tasks", title: "InfOS Kernel", sub: "Scheduler · allocator · cache", kind: "Walkthrough",
      tags: "Operating systems · C++", art: "buddy", bg: ["#2d0f1f", "#0e0409"], accent: "#ff6b9a",
      summary: "Three pieces of a teaching kernel: a priority scheduler, a buddy page allocator and a disk block cache, with a live allocator you can play with." },
    { group: "mobile", slug: "muc-screen-time-app", title: "Screen Time", sub: "iOS monitor", kind: "Walkthrough",
      tags: "Mobile computing · Swift", art: "phone", bg: ["#1b1b3d", "#07071a"], accent: "#a78bfa",
      summary: "An iPhone app that tracks app usage and movement through Apple's Screen Time and Core Motion frameworks, built around iOS's privacy rules." },
    { group: "games", slug: "unity-video-game-design", title: "Project Void", sub: "Unity · enemy AI", kind: "Walkthrough + video",
      tags: "Video game design · C#", art: "fsm", bg: ["#3b0d0d", "#110303"], accent: "#ff5c5c",
      summary: "Four Unity milestones and the team game where I built the enemy AI: a finite state machine with patrol, chase, attack, search and retreat." },
    { group: "bio", slug: "bioinformatics-autism-genes", title: "Autism Genes", sub: "Database to network", kind: "Walkthrough",
      tags: "Bioinformatics · Python", art: "network", bg: ["#0b2d33", "#020c0e"], accent: "#63e6be",
      summary: "The SFARI autism gene list taken through PubMed, Gene Ontology and a protein network that splits into a synapse cluster and a chromatin cluster." },
    { group: "data", slug: "world-dataset-education", title: "World DataSet", sub: "Education predictors", kind: "Walkthrough",
      tags: "Data science · pandas · PCA", art: "scatter", bg: ["#2b2508", "#0d0b02"], accent: "#f2c94c",
      summary: "Eight public sources merged into two curated world datasets, then PCA and regression on what predicts how long a country's children stay in school." },
  ];


  /* ---------- tiny seeded random so each cover looks the same every visit ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h; }

  /* ---------- cover drawings: each returns SVG markup for a 300×300 square ---------- */
  var ART = {
    particles: function (a, r) {
      var s = "";
      for (var i = 1; i <= 4; i++) s += '<circle cx="150" cy="130" r="' + i * 30 + '" fill="none" stroke="' + a + '" stroke-opacity=".18"/>';
      s += '<circle cx="150" cy="130" r="9" fill="#ffd166"/>';
      for (var j = 0; j < 260; j++) { var ang = r() * 6.283, d = 70 + (r() - 0.5) * 18 + (r() < 0.3 ? (r() - 0.5) * 120 : 0); s += '<circle cx="' + (150 + Math.cos(ang) * d) + '" cy="' + (130 + Math.sin(ang) * d * 0.95) + '" r="1.4" fill="' + a + '" opacity="' + (0.35 + r() * 0.6) + '"/>'; }
      s += '<circle cx="' + (150 + 70) + '" cy="130" r="5" fill="#ff6b6b"/>';
      return s;
    },
    asteroids: function (a, r) {
      var s = "";
      for (var i = 0; i < 14; i++) {
        var x = 30 + r() * 240, y = 25 + r() * 170, rad = 5 + r() * 12;
        s += '<ellipse cx="' + (x + 10) + '" cy="' + (y - 8) + '" rx="' + (rad + 6) + '" ry="' + (rad + 3) + '" fill="none" stroke="' + a + '" stroke-dasharray="3 3" opacity=".7"/>';
        s += '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" fill="#8a8f9c" opacity=".85"/>';
      }
      s += '<path d="M40,200 Q100,120 160,140 T270,60" fill="none" stroke="#3ddc97" stroke-width="2"/>';
      return s;
    },
    pid: function (a) {
      var p = "M20,190";
      for (var x = 0; x <= 260; x += 4) { var t = x / 40; p += " L" + (20 + x) + "," + (110 + 80 * Math.exp(-t * 0.55) * Math.cos(t * 2.2)); }
      return '<line x1="20" y1="110" x2="280" y2="110" stroke="#fff" stroke-opacity=".25" stroke-dasharray="4 4"/>' +
        '<path d="' + p + '" fill="none" stroke="' + a + '" stroke-width="3"/>' +
        '<g transform="translate(150,48)"><rect x="-34" y="-4" width="68" height="8" rx="4" fill="#e6ebf2"/><rect x="-44" y="-12" width="22" height="4" rx="2" fill="' + a + '"/><rect x="22" y="-12" width="22" height="4" rx="2" fill="' + a + '"/><rect x="-10" y="-2" width="20" height="14" rx="3" fill="#e6ebf2"/></g>';
    },
    forest: function (a, r) {
      var s = "", pts = [];
      for (var i = 0; i < 26; i++) { var x = 20 + r() * 260, y = 20 + r() * 180, rr = 6 + r() * 9; s += '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="#3ddc97" opacity=".55"/><circle cx="' + x + '" cy="' + y + '" r="' + (rr + 5) + '" fill="none" stroke="#3ddc97" stroke-opacity=".25"/>'; }
      var path = "M30,190 C80,150 70,90 130,100 S210,60 250,40";
      s += '<path d="' + path + '" fill="none" stroke="' + a + '" stroke-width="2.5" stroke-dasharray="6 4"/>';
      s += '<polygon points="250,28 258,44 242,44" fill="' + a + '"/><circle cx="30" cy="190" r="6" fill="#ff6b6b"/>';
      return s;
    },
    grid: function (a, r) {
      var s = "", n = 10, c = 26, ox = 20, oy = 10;
      for (var i = 0; i < n; i++) for (var j = 0; j < 8; j++) {
        var wall = r() < 0.18;
        s += '<rect x="' + (ox + i * c + 1) + '" y="' + (oy + j * c + 1) + '" width="' + (c - 2) + '" height="' + (c - 2) + '" rx="3" fill="' + (wall ? "#56627a" : "#ffffff") + '" opacity="' + (wall ? 0.9 : 0.06) + '"/>';
      }
      s += '<path d="M33,192 L59,166 L85,166 L111,140 L137,114 L163,114 L189,88 L215,62 L241,36" fill="none" stroke="' + a + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
      s += '<rect x="228" y="23" width="26" height="26" rx="4" fill="' + a + '"/><circle cx="33" cy="192" r="8" fill="#3ddc97"/>';
      return s;
    },
    cores: function (a) {
      var s = "", h = [0.92, 0.95, 0.9, 0.96], cols = ["#ff8a5b", "#74c0fc", "#63e6be", "#e599f7"];
      for (var i = 0; i < 4; i++) {
        var x = 40 + i * 58;
        s += '<rect x="' + x + '" y="30" width="44" height="160" rx="6" fill="#ffffff" opacity=".06"/>';
        s += '<rect x="' + x + '" y="' + (30 + 160 * (1 - h[i])) + '" width="44" height="' + 160 * h[i] + '" rx="6" fill="' + cols[i] + '" opacity=".85"/>';
        s += '<rect x="' + (x + 6) + '" y="150" width="14" height="10" rx="2" fill="#0b0f17" opacity=".6"/><rect x="' + (x + 24) + '" y="150" width="14" height="10" rx="2" fill="#0b0f17" opacity=".6"/>';
      }
      return s;
    },
    buddy: function (a) {
      var s = "", rows = [[1], [0.5, 0.5], [0.25, 0.25, 0.5], [0.125, 0.125, 0.25, 0.5]], used = [[0], [0], [1], [0, 2]];
      rows.forEach(function (row, ri) {
        var x = 30;
        row.forEach(function (w, ci) {
          var ww = w * 240;
          s += '<rect x="' + (x + 2) + '" y="' + (30 + ri * 44) + '" width="' + (ww - 4) + '" height="34" rx="5" fill="' + (used[ri].indexOf(ci) >= 0 ? a : "#ffffff") + '" opacity="' + (used[ri].indexOf(ci) >= 0 ? 0.9 : 0.1) + '"/>';
          x += ww;
        });
      });
      return s;
    },
    phone: function (a) {
      var s = '<rect x="95" y="16" width="110" height="196" rx="20" fill="#0b0f17" stroke="#e6ebf2" stroke-opacity=".5" stroke-width="3"/>';
      var w = [0.8, 0.55, 0.4, 0.25, 0.15];
      for (var i = 0; i < 5; i++) {
        s += '<rect x="110" y="' + (50 + i * 30) + '" width="80" height="8" rx="4" fill="#ffffff" opacity=".1"/>';
        s += '<rect x="110" y="' + (50 + i * 30) + '" width="' + 80 * w[i] + '" height="8" rx="4" fill="' + a + '"/>';
      }
      s += '<rect x="130" y="24" width="40" height="6" rx="3" fill="#e6ebf2" opacity=".4"/>';
      return s;
    },
    fsm: function (a) {
      var nodes = [[60, 70, "PATROL"], [150, 40, "CHASE"], [240, 70, "ATTACK"], [110, 165, "SEARCH"], [200, 165, "RETREAT"]];
      var edges = [[0, 1], [1, 2], [2, 4], [1, 3], [3, 0], [4, 0], [2, 1]];
      var s = "";
      edges.forEach(function (e) { var p = nodes[e[0]], q = nodes[e[1]]; s += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="#ffffff" stroke-opacity=".3" stroke-width="2"/>'; });
      nodes.forEach(function (n, i) {
        s += '<circle cx="' + n[0] + '" cy="' + n[1] + '" r="26" fill="' + (i === 1 ? a : "#1d1d24") + '" stroke="' + a + '" stroke-width="2"/>';
        s += '<text x="' + n[0] + '" y="' + (n[1] + 3.5) + '" text-anchor="middle" font-family="ui-monospace,monospace" font-size="8.5" font-weight="700" fill="' + (i === 1 ? "#110303" : "#f3f3f3") + '">' + n[2] + "</text>";
      });
      return s;
    },
    network: function (a, r) {
      var s = "", A = [], B = [];
      for (var i = 0; i < 16; i++) A.push([90 + (r() - 0.5) * 110, 110 + (r() - 0.5) * 120]);
      for (var j = 0; j < 13; j++) B.push([215 + (r() - 0.5) * 100, 110 + (r() - 0.5) * 110]);
      function link(set, col) { set.forEach(function (p, i) { for (var k = 0; k < 3; k++) { var q = set[Math.floor(r() * set.length)]; if (q !== p) s += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="' + col + '" stroke-opacity=".28"/>'; } }); }
      link(A, "#74c0fc"); link(B, a);
      s += '<line x1="' + A[0][0] + '" y1="' + A[0][1] + '" x2="' + B[0][0] + '" y2="' + B[0][1] + '" stroke="#fff" stroke-opacity=".3" stroke-dasharray="3 3"/>';
      A.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 0 ? 8 : 4.5) + '" fill="#74c0fc"/>'; });
      B.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 0 ? 8 : 4.5) + '" fill="' + a + '"/>'; });
      return s;
    },
    scatter: function (a, r) {
      var s = '<line x1="30" y1="200" x2="280" y2="200" stroke="#fff" stroke-opacity=".25"/><line x1="30" y1="20" x2="30" y2="200" stroke="#fff" stroke-opacity=".25"/>';
      var cols = ["#ff6b6b", "#f2c94c", "#63e6be", "#74c0fc"];
      for (var i = 0; i < 60; i++) {
        var t = r(), x = 40 + t * 230, y = 40 + t * 140 + (r() - 0.5) * 70;
        y = Math.max(28, Math.min(192, y));
        s += '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="' + cols[Math.min(3, Math.floor((1 - t) * 4 + (r() - 0.5)))] + '" opacity=".85"/>';
      }
      s += '<line x1="40" y1="45" x2="275" y2="185" stroke="' + a + '" stroke-width="2" stroke-dasharray="6 4"/>';
      return s;
    },
  };

  function coverSVG(p, uid) {
    var r = rng(hash(p.slug));
    var id = "cfg-" + uid;
    return '<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.bg[0] + '"/><stop offset="1" stop-color="' + p.bg[1] + '"/></linearGradient></defs>' +
      '<rect width="300" height="300" fill="url(#' + id + ')"/>' +
      '<g>' + ART[p.art](p.accent, r) + '</g>' +
      '<rect x="0" y="226" width="300" height="74" fill="#000" opacity=".35"/>' +
      '<text x="20" y="258" font-family="Playfair Display, Georgia, serif" font-size="26" font-weight="700" fill="#fff">' + p.title + '</text>' +
      '<text x="20" y="282" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="13" letter-spacing=".5" fill="' + p.accent + '">' + p.sub.toUpperCase() + '</text>' +
      '</svg>';
  }

  /* ---------- build one carousel per section ---------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init(root) {
    var list = PROJECTS.filter(function (p) { return p.group === root.getAttribute("data-group"); });
    if (!list.length) return;
    var stage = root.querySelector(".cf-stage");
    var info = {
      kind: root.querySelector(".cf-kind"),
      title: root.querySelector(".cf-title"),
      tags: root.querySelector(".cf-tags"),
      summary: root.querySelector(".cf-summary"),
      open: root.querySelector(".cf-open"),
      count: root.querySelector(".cf-count"),
    };
    var slider = root.querySelector(".cf-slider");
    if (list.length === 1) root.classList.add("cf-single");
    if (slider) slider.max = list.length - 1;

    var current = Math.floor((list.length - 1) / 2);   // start in the middle
    var dragMoved = false;

    var covers = list.map(function (p, i) {
      var a = document.createElement("a");
      a.className = "cf-cover";
      a.href = BASE + p.slug + "/index.html";
      a.setAttribute("aria-label", p.title + ": " + p.sub);
      a.innerHTML = '<div class="cf-art">' + coverSVG(p, p.slug) + '</div><div class="cf-reflect" aria-hidden="true">' + coverSVG(p, p.slug + "-r") + "</div>";
      a.addEventListener("click", function (e) {
        if (dragMoved) { e.preventDefault(); return; }
        if (i !== current) { e.preventDefault(); go(i); }
      });
      stage.appendChild(a);
      return a;
    });

    function layout() {
      var w = root.clientWidth;
      var size = w < 520 ? 170 : w < 900 ? 210 : 240;
      var gap = size * 0.30;      // spacing between side covers
      var push = size * 0.78;     // extra offset of the first side cover
      root.style.setProperty("--cf-size", size + "px");
      covers.forEach(function (c, i) {
        var d = i - current, ad = Math.abs(d), side = d < 0 ? -1 : 1;
        var x = d === 0 ? 0 : side * (push + (ad - 1) * gap);
        var rot = d === 0 ? 0 : -side * 65;
        var z = d === 0 ? 60 : -size * 0.45 - ad * 4;
        c.style.transform = "translateX(" + x + "px) translateZ(" + z + "px) rotateY(" + rot + "deg)";
        c.style.zIndex = String(100 - ad);
        c.classList.toggle("is-current", d === 0);
        c.tabIndex = d === 0 ? 0 : -1;
      });
      var p = list[current];
      info.kind.textContent = p.kind;
      info.title.textContent = p.title + " · " + p.sub;
      info.tags.textContent = p.tags;
      info.summary.textContent = p.summary;
      info.open.href = BASE + p.slug + "/index.html";
      info.open.textContent = p.kind.indexOf("demo") >= 0 ? "Play the demo" : "Read the walkthrough";
      if (info.count) info.count.textContent = (current + 1) + " / " + list.length;
      if (slider) slider.value = current;
    }
    function go(i) { current = Math.max(0, Math.min(list.length - 1, i)); layout(); }

    if (list.length > 1) {
      root.querySelector(".cf-prev").addEventListener("click", function () { go(current - 1); });
      root.querySelector(".cf-next").addEventListener("click", function () { go(current + 1); });
      slider.addEventListener("input", function () { go(Number(slider.value)); });
      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { go(current - 1); e.preventDefault(); }
        else if (e.key === "ArrowRight") { go(current + 1); e.preventDefault(); }
      });

      // Trackpad / wheel: sideways swipes flip covers; vertical scrolling still scrolls the page.
      var wheelAcc = 0, wheelLock = 0;
      stage.addEventListener("wheel", function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        var now = Date.now();
        wheelAcc += e.deltaX;
        if (Math.abs(wheelAcc) > 50 && now > wheelLock) { go(current + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; wheelLock = now + 140; }
      }, { passive: false });

      // Drag / swipe
      var startX = null, startIdx = 0;
      stage.addEventListener("pointerdown", function (e) { startX = e.clientX; startIdx = current; dragMoved = false; });
      window.addEventListener("pointermove", function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX, step = (parseFloat(root.style.getPropertyValue("--cf-size")) || 240) * 0.30;
        if (Math.abs(dx) > 6) dragMoved = true;
        var target = startIdx - Math.round(dx / step);
        if (target !== current) go(target);
      });
      window.addEventListener("pointerup", function () { startX = null; setTimeout(function () { dragMoved = false; }, 0); });
    }

    window.addEventListener("resize", layout);
    if (reduce) root.classList.add("cf-reduced");
    layout();
    root.classList.add("cf-ready");
  }

  Array.prototype.forEach.call(document.querySelectorAll(".coverflow[data-group]"), init);
})();
