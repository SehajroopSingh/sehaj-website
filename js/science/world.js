/* ============================================================
   Science journey · the 3D world (Three.js r128). This file is
   the ORCHESTRATOR: renderer, lights, camera, the frame loop and
   the public API.

     what's in the world  → js/science/assets.js
     what happens, when   → js/science/scenes.js
     every timing number  → js/timing.js (Timing.science)

   Scenes (progress p = scene index + fraction, 0..4.999):
     0 neurons & DNA · 1 the paper · 2 neurons → brain → person →
     crowd · 3 crowd → globe · 4 data points → data frame

   Public API (used by js/science/journey.js):
     SciWorld.create(canvas) → { setProgress(p), setVisible(v), state() }
     state(): { scene, f, spikesFired, terminalHit, dataFiled }
   ============================================================ */
window.SciWorld = (function () {
  "use strict";
  function create(canvas) {
    var T = window.THREE, K = window.ThreeKit, TM = window.Timing.science;
    if (!T || !K || !window.SciAssets || !window.SciScenes) return null;

    /* ---------- renderer, scene, camera, lights ---------- */
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    K.setupRenderer(renderer); renderer.toneMappingExposure = 1.1;
    var scene = new T.Scene(); scene.background = new T.Color(0x05091a);   // (= the stage and the phone section's flat colour; the clear colour shows as given)
    var cam = new T.PerspectiveCamera(42, 1, 0.1, 1500);
    var L = K.lights(scene, { sky: 0xcfe3ff, ground: 0x1a1030, hemi: 0.45, key: 0.9, keyColor: 0xfff4e6, fill: 0.4, rim: 0.7 });
    var key = L.key; key.position.set(6, 10, 8); key.shadow.camera.far = 120; key.shadow.camera.left = key.shadow.camera.bottom = -40; key.shadow.camera.right = key.shadow.camera.top = 40;
    var A = window.SciAssets.build(scene, T, K);
    var SC = window.SciScenes;

    /* ---------- camera glide ---------- */
    var camTo = new T.Vector3(0, 0, 14), lookTo = new T.Vector3(), lookNow = new T.Vector3(), snap = true;
    function aim(px, py, pz, lx, ly, lz) { camTo.set(px, py, pz); lookTo.set(lx, ly, lz); }
    function glide(dt) { var k = snap ? 1 : 1 - Math.exp(-dt * TM.cameraFollow); cam.position.lerp(camTo, k); lookNow.lerp(lookTo, k); cam.lookAt(lookNow); snap = false; }
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
    function lerp(a, b, k) { return a + (b - a) * k; }

    /* ---------- state shared with the scenes ---------- */
    var P = 0, visible = false, last = 0;
    var state = { scene: 0, f: 0, spikesFired: 0, terminalHit: false, dataFiled: false };
    var ctx = {
      A: A, scene: scene, cam: cam, aim: aim, ease: ease, lerp: lerp, state: state,
      S: { lastSpikeTerminal: 0, dataT: 0 },
      // (the renderer outputs sRGB, so background colours are converted from sRGB to linear or they come out washed out)
      bg: new T.Color(), c0: new T.Color(0x05091a), cSky: new T.Color(0x0b1a3a).convertSRGBToLinear(), cSpace: new T.Color(0x02040a).convertSRGBToLinear(),
      f: 0, out: 0, dt: 0, rawDt: 0, t: 0,
    };

    function frameFn(t) {
      if (!visible) return;
      var raw = Math.min(0.5, (t - last) / 1000 || 0.016), dt = Math.min(0.05, raw); last = t;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && canvas.width !== Math.floor(w * renderer.getPixelRatio())) renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      var sc = Math.min(4, Math.floor(P)), f = P - sc;
      ctx.f = f; ctx.out = ease((f - TM.handoff) / (1 - TM.handoff)); ctx.dt = dt; ctx.rawDt = raw; ctx.t = t;
      state.scene = sc; state.f = f;
      SC.stage(ctx, sc);
      SC.list[sc](ctx);
      key.target.position.copy(lookNow); key.position.copy(lookNow).add(new T.Vector3(6, 10, 8).multiplyScalar(sc >= 3 ? 4 : 1));
      glide(raw);
      renderer.render(scene, cam);
      requestAnimationFrame(frameFn);
    }

    return {
      setProgress: function (p) { P = Math.max(0, Math.min(4.999, p)); },
      setVisible: function (v) { if (v && !visible) { visible = true; last = performance.now(); requestAnimationFrame(frameFn); } else if (!v) visible = false; },
      state: function () { return state; },
    };
  }
  return { create: create };
})();
