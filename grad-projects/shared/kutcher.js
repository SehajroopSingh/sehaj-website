/* Kutcher layer: cards and figures rise in as they scroll into view. */
(function () {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var els = document.querySelectorAll(".tldr, figure, .step, .stat, .callout, .gloss div, .tl-card, .card, .note, .stats, .rules");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("k-in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("k-rise"); io.observe(el); } });
})();

/* All-projects menu: replaces the row of page pills with one button and a grouped, colorful panel */
(function () {
  var nav = document.querySelector('.topnav'); if (!nav) return;
  var links = [].slice.call(nav.querySelectorAll('a'));
  var groups = [
    ['Robotics', ['Particle filter', 'Kalman', 'PID', 'SLAM', 'Search']],
    ['Systems', ['VM scheduler', 'InfOS kernel', 'MIPS sim']],
    ['Apps & games', ['iOS app', 'Unity']],
    ['Data & biology', ['Autism genes', 'World data']],
    ['Computer vision', ['Hybrid images', 'SIFT', 'RANSAC', 'Scene CNN']]
  ];
  var nice = { 'Particle filter': 'Solar System', 'Kalman': 'HopScotch', 'PID': 'Drone Control', 'SLAM': 'Indiana Drones', 'Search': 'Warehouse Robot', 'VM scheduler': 'VM Scheduler', 'InfOS kernel': 'InfOS Kernel', 'MIPS sim': 'MIPS Simulator', 'iOS app': 'Screen Time App', 'Unity': 'Project Void', 'Autism genes': 'Autism Genes', 'World data': 'World DataSet', 'Hybrid images': 'Hybrid Images', 'SIFT': 'Feature Matching', 'RANSAC': 'Camera Geometry', 'Scene CNN': 'Scene Recognition' };
  var desc = { 'Particle filter': 'Particle filter', 'Kalman': 'Kalman filter', 'PID': 'PID control', 'SLAM': 'Graph SLAM', 'Search': 'A* + value iteration', 'VM scheduler': 'KVM · libvirt', 'InfOS kernel': 'C++ kernel', 'MIPS sim': 'Multicycle CPU', 'iOS app': 'SwiftUI · Screen Time', 'Unity': 'Enemy AI · Unity', 'Autism genes': 'Gene networks', 'World data': '198 countries', 'Hybrid images': 'Convolution · filters', 'SIFT': 'Harris · SIFT', 'RANSAC': 'RANSAC · odometry', 'Scene CNN': 'CNN · ResNet-18' };
  var by = {}; links.forEach(function (a) { by[a.textContent.trim()] = a; });
  var active = links.filter(function (a) { return a.classList.contains('active'); })[0];
  var activeName = active ? active.textContent.trim() : null, activeGroup = null;
  groups.forEach(function (g) { if (g[1].indexOf(activeName) >= 0) activeGroup = g[0]; });
  function item(n, j) {
    var a = by[n]; if (!a) return '';
    return '<a style="--j:' + j + '" href="' + a.getAttribute('href') + '"' + (n === activeName ? ' class="on" aria-current="page"' : '') + '><span class="kn-t">' + nice[n] + '</span><span class="kn-d">' + desc[n] + '</span></a>';
  }
  var wrap = document.createElement('div'); wrap.className = 'kn';
  wrap.innerHTML = (activeName ? '<span class="kn-now">' + activeGroup + '<b>/</b>' + nice[activeName] + '</span>' : '') +
    '<button class="kn-btn" type="button" aria-expanded="false" aria-controls="kn-panel"><i></i><i></i>All projects</button>' +
    '<div class="kn-panel" id="kn-panel">' + groups.map(function (g, i) {
      return '<div class="kn-col" style="--i:' + i + '"><h6><em>' + String(i + 1).padStart(2, '0') + '</em>' + g[0] + '</h6>' + g[1].map(item).join('') + '</div>';
    }).join('') + '</div>';
  nav.replaceWith(wrap);
  var scrim = document.createElement('div'); scrim.className = 'kn-scrim'; document.body.appendChild(scrim);
  var btn = wrap.querySelector('.kn-btn');
  function set(o) { wrap.classList.toggle('open', o); document.documentElement.classList.toggle('kn-open', o); btn.setAttribute('aria-expanded', o); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(!wrap.classList.contains('open')); });
  scrim.addEventListener('click', function () { set(false); });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
