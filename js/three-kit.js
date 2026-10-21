/* ============================================================
   ThreeKit · shared quality helpers for the 3D sections
   (needs THREE r128 loaded first). Lighting rig with shadows,
   PBR materials, procedural canvas textures, and small model
   builders used by js/robotics/world3d.js and js/science/world.js.
   ============================================================ */
window.ThreeKit = (function () {
  "use strict";
  var T = window.THREE;
  if (!T) return null;

  function setupRenderer(renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.physicallyCorrectLights = false;
  }

  // three-point rig: warm key with shadows, cool fill, rim from behind
  function lights(scene, opts) {
    opts = opts || {};
    var hemi = new T.HemisphereLight(opts.sky || 0xdfefff, opts.ground || 0x3c5a2e, opts.hemi == null ? 0.55 : opts.hemi); scene.add(hemi);
    var key = new T.DirectionalLight(opts.keyColor || 0xfff2dc, opts.key == null ? 1.1 : opts.key); key.position.set(8, 14, 10);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 1; key.shadow.camera.far = 80;
    key.shadow.camera.left = key.shadow.camera.bottom = -24; key.shadow.camera.right = key.shadow.camera.top = 24; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
    scene.add(key); scene.add(key.target);
    var fill = new T.DirectionalLight(opts.fillColor || 0x9fc4ff, opts.fill == null ? 0.35 : opts.fill); fill.position.set(-10, 6, -4); scene.add(fill);
    var rim = new T.DirectionalLight(0xffffff, opts.rim == null ? 0.6 : opts.rim); rim.position.set(-4, 8, -14); scene.add(rim);
    return { hemi: hemi, key: key, fill: fill, rim: rim };
  }

  /* ---------- procedural textures ---------- */
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    if (repeat) { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(repeat, repeat); }
    return tex;
  }
  function noise(ctx, w, h, alpha, n) { for (var i = 0; i < n; i++) { ctx.fillStyle = "rgba(" + (Math.random() < 0.5 ? "0,0,0," : "255,255,255,") + alpha * Math.random() + ")"; ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } }
  function grassTex() { return canvasTex(512, 512, function (ctx, w, h) { ctx.fillStyle = "#6f9a4a"; ctx.fillRect(0, 0, w, h); for (var i = 0; i < 6000; i++) { ctx.strokeStyle = "rgba(" + (60 + Math.random() * 60) + "," + (120 + Math.random() * 70) + "," + (40 + Math.random() * 40) + ",.55)"; var x = Math.random() * w, y = Math.random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 3 - Math.random() * 6); ctx.stroke(); } }, 24); }
  function concreteTex() { return canvasTex(512, 512, function (ctx, w, h) { ctx.fillStyle = "#8d9299"; ctx.fillRect(0, 0, w, h); noise(ctx, w, h, 0.12, 9000); ctx.strokeStyle = "rgba(40,44,52,.35)"; ctx.lineWidth = 3; for (var i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(w, i * 128); ctx.stroke(); } ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 8; ctx.setLineDash([40, 24]); ctx.strokeRect(24, 24, w - 48, h - 48); }, 3); }
  function metalTex(base) { return canvasTex(256, 256, function (ctx, w, h) { ctx.fillStyle = base || "#cfd4dc"; ctx.fillRect(0, 0, w, h); for (var i = 0; i < 1200; i++) { ctx.strokeStyle = "rgba(255,255,255," + Math.random() * 0.12 + ")"; var y = Math.random() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 2); ctx.stroke(); } noise(ctx, w, h, 0.06, 2000); }, 2); }
  function earthTex() {
    // fractal value noise → land mask; per-pixel colours for ocean depth, lowlands, highlands, snow
    var W = 1024, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d"), img = ctx.createImageData(W, H), d = img.data;
    var seed = 1337; function r() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var G = 64, grid = []; for (var i = 0; i < G * G; i++) grid.push(r());
    function val(x, y) { var xi = Math.floor(x) % G, yi = Math.floor(y) % G, xf = x - Math.floor(x), yf = y - Math.floor(y); xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
      var a = grid[yi * G + xi], b = grid[yi * G + (xi + 1) % G], cc = grid[((yi + 1) % G) * G + xi], dd = grid[((yi + 1) % G) * G + (xi + 1) % G]; return (a + (b - a) * xf) + ((cc + (dd - cc) * xf) - (a + (b - a) * xf)) * yf; }
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H, n = 0, amp = 1, fr = 3, tot = 0;
      for (var o = 0; o < 6; o++) { n += val(u * fr * 2.2, v * fr * 1.1) * amp; tot += amp; amp *= 0.55; fr *= 2; }
      n /= tot; var lat = Math.abs(v - 0.5) * 2, land = n > 0.5, R, Gc, B;
      if (!land) { var depth = Math.min(1, (0.5 - n) * 6); R = 20 + 30 * (1 - depth); Gc = 70 + 60 * (1 - depth); B = 140 + 60 * (1 - depth); }
      else { var h = Math.min(1, (n - 0.5) * 7); R = 70 + h * 110; Gc = 120 + h * 30; B = 50 + h * 50; if (lat > 0.55) { R += (lat - 0.55) * 300; Gc += (lat - 0.55) * 260; B += (lat - 0.55) * 300; } }
      if (lat > 0.9 || (lat > 0.84 && land)) { R = Gc = B = 240; }
      var k = (y * W + x) * 4; d[k] = Math.min(255, R); d[k + 1] = Math.min(255, Gc); d[k + 2] = Math.min(255, B); d[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; return tex;
  }
  function cloudTex() { return canvasTex(1024, 512, function (ctx, w, h) { ctx.clearRect(0, 0, w, h); for (var i = 0; i < 260; i++) { var x = Math.random() * w, y = Math.random() * h, rad = 10 + Math.random() * 40; var g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); } }); }
  function starTex() { return canvasTex(64, 64, function (ctx, w, h) { var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }); }
  function glowTex(color) { return canvasTex(128, 128, function (ctx, w, h) { var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, color || "rgba(255,230,150,1)"); g.addColorStop(0.4, (color || "rgba(255,200,80,1)").replace(/[\d.]+\)$/, ".35)")); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }); }

  /* ---------- materials ---------- */
  function std(color, rough, metal, extra) { var m = new T.MeshStandardMaterial(Object.assign({ color: color, roughness: rough == null ? 0.55 : rough, metalness: metal || 0 }, extra || {})); return m; }
  function shadowed(mesh, cast, receive) { mesh.traverse(function (o) { if (o.isMesh) { o.castShadow = cast !== false; o.receiveShadow = receive !== false; } }); return mesh; }
  function mesh(geo, mat, x, y, z, parent) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
  function rounded(w, h, d, r, seg) {  // rounded box via extrude
    var s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: r * 0.5, bevelSize: r * 0.5, bevelSegments: seg || 3, curveSegments: 6 });
    g.center(); return g;
  }
  function sprite(tex, color, size) { var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, color: color || 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); sp.scale.set(size, size, 1); return sp; }
  function stars(n, inner, outer) {
    var g = new T.BufferGeometry(), p = [], c = [];
    for (var i = 0; i < n; i++) { var r = inner + Math.random() * (outer - inner), th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1); p.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)); var w = 0.7 + Math.random() * 0.3, b = Math.random() < 0.15 ? 1 : 0.9; c.push(w, w * b, 1); }
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3)); g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
    return new T.Points(g, new T.PointsMaterial({ size: 1.4, map: starTex(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
  }

  return { setupRenderer: setupRenderer, lights: lights, canvasTex: canvasTex, grassTex: grassTex, concreteTex: concreteTex, metalTex: metalTex, earthTex: earthTex, cloudTex: cloudTex, starTex: starTex, glowTex: glowTex, std: std, shadowed: shadowed, mesh: mesh, rounded: rounded, sprite: sprite, stars: stars };
})();
