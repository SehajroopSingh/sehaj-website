/* ============================================================
   Robotics journey · the 3D world (Three.js r128, loaded by
   projects.html from cdnjs). This file is the ORCHESTRATOR:
   renderer, lights, camera, the frame loop and the public API.

     what's in the world  → js/robotics/assets.js
     what happens, when   → js/robotics/scenes.js
     every timing number  → js/timing.js (Timing.robotics)

   Scenes (progress p = scene index + fraction, 0..5.999):
     0 warehouse · 1 forest (SLAM) · 2 PID · 3 launch & hopping ·
     4 solar system · 5 inside the ship

   Public API (used by js/robotics/journey.js):
     RoboWorld.create(canvas) → { setProgress(p), setVisible(v), readout(), state() }
   ============================================================ */
window.RoboWorld = (function () {
  "use strict";

  function create(canvas) {
    var T = window.THREE, K = window.ThreeKit, TM = window.Timing.robotics;
    if (!T || !K || !window.RoboAssets || !window.RoboScenes) return null;

    /* ---------- renderer, scene, camera, lights ---------- */
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    K.setupRenderer(renderer);
    var scene = new T.Scene();
    scene.fog = new T.Fog(new T.Color(0x9fc6e8).convertSRGBToLinear(), 22, 70);
    var cam = new T.PerspectiveCamera(40, 1, 0.1, 500);
    var L = K.lights(scene, { ground: 0x4a6b3a, hemi: 0.5, key: 1.15 });
    var A = window.RoboAssets.build(scene, T, K);
    var SC = window.RoboScenes;

    /* ---------- camera glide ---------- */
    var camTo = new T.Vector3(0, 2.6, 9), lookTo = new T.Vector3(0, 1.2, 0), lookNow = new T.Vector3(0, 1.2, 0), camSnap = true;
    function aim(px, py, pz, lx, ly, lz) { camTo.set(px, py, pz); lookTo.set(lx, ly, lz); }
    function glide(dt) {
      var k = camSnap ? 1 : 1 - Math.exp(-dt * (ctx.camFollow || TM.cameraFollow));
      cam.position.lerp(camTo, k); lookNow.lerp(lookTo, k); cam.lookAt(lookNow); camSnap = false;
    }
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
    function lerp(a, b, k) { return a + (b - a) * k; }

    /* ---------- state shared with the scenes ---------- */
    var P = 0, visible = false, last = 0, readout = "";
    var state = { scene: 0, f: 0, alt: 0, goal: 0, seen: 0, total: 0, altitude: 0 };
    var ctx = {
      A: A, scene: scene, cam: cam, hemi: L.hemi, sun: L.key,
      aim: aim, ease: ease, lerp: lerp, state: state,
      S: { satAngle: 0, satAngleSet: false, sweepT: 0, droneTo: new T.Vector3(12, 2.5, -4) },
      // (the renderer outputs sRGB, so background colours are converted from sRGB to linear or they come out washed out)
      skyDay: new T.Color(0x9fc6e8).convertSRGBToLinear(), skyNight: new T.Color(0x0b1026).convertSRGBToLinear(), skySpace: new T.Color(0x05091a)   /* = Constellation.BG exactly: the clear colour is shown as given, so no conversion here, and the sky never changes colour on the way into the chip */, sky: new T.Color(),
      f: 0, out: 0, dt: 0, rawDt: 0, t: 0, camFollow: null,   // a scene may ask for a tighter camera chase
    };

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }

    function frame(t) {
      if (!visible) return;
      var rawDt = Math.min(0.5, (t - last) / 1000 || 0.016), dt = Math.min(0.05, rawDt); last = t;
      resize();
      var sc = Math.min(6, Math.floor(P)), f = P - sc;
      ctx.f = f; ctx.out = ease((f - TM.handoff) / (1 - TM.handoff)); ctx.dt = dt; ctx.rawDt = rawDt; ctx.t = t;
      state.scene = sc; state.f = f;
      SC.stage(ctx, sc);
      readout = SC.list[sc](ctx) || readout;
      glide(rawDt);
      renderer.render(scene, cam);
      requestAnimationFrame(frame);
    }

    return {
      setProgress: function (p) { P = Math.max(0, Math.min(6.999, p)); },
      setVisible: function (v) { if (v && !visible) { visible = true; last = performance.now(); requestAnimationFrame(frame); } else if (!v) visible = false; },
      readout: function () { return readout; },
      state: function () { return state; },
    };
  }
  return { create: create };
})();
