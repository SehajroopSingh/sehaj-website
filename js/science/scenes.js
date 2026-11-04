/* ============================================================
   Science journey · SCENES
   ------------------------------------------------------------
   One function per scene. Each gets a context `c`:
     c.A      the assets (js/science/assets.js)
     c.f      0..1 · how far through this scene
     c.out    0..1 · the hand-off to the next scene (starts at
              Timing.science.handoff)
     c.dt     seconds since the last frame (capped, for motion)
     c.t      ms clock (performance.now())
     c.aim(px,py,pz, lx,ly,lz)   where the camera should be / look
     c.ease, c.lerp
     c.S      shared mutable state that survives between frames
     c.state  the state exposed to the cards (terminalHit, dataFiled…)

   `stage(c, sc)` runs before the scene: background, visibility and
   the action potentials (which run all the time). ALL timing
   numbers come from js/timing.js (window.Timing.science).

   Scenes: 0 neurons & DNA · 1 the paper · 2 neurons → brain →
   person → crowd · 3 crowd → globe · 4 the data frame
   ============================================================ */
window.SciScenes = (function () {
  "use strict";
  var TM = window.Timing.science;
  var T = window.THREE;
  if (!T) return null;
  var UP = new T.Vector3(0, 1, 0), tmpV = new T.Vector3(), tmpW = new T.Vector3();
  // camera directions for the continuous pull-back (unit vectors from the look-at point)
  var CAM_NEAR = new T.Vector3(0, 0.04, 1).normalize(), CAM_FAR = new T.Vector3(0, 0.38, 0.92).normalize(), CAM_END = new T.Vector3(0, 0.67, 0.75).normalize();

  function win(f, w) { return (f - w[0]) / (w[1] - w[0]); }                 // 0..1 across a [from, to] window
  function setOp(list, o) { o = Math.max(0.001, o); list.forEach(function (m) { m.opacity = o; }); }
  // the camera backs away at a constant *visual* rate: distance grows exponentially
  function pull(c, k, d0, d1, dirA, dirB, lx, ly, lz) {
    var d = d0 * Math.pow(d1 / d0, k), dir = tmpV.copy(dirA).lerp(dirB, k).normalize();
    c.aim(lx + dir.x * d, ly + dir.y * d, lz + dir.z * d, lx, ly, lz);
  }

  /* ---------- background, visibility, action potentials (every frame) ---------- */
  function stage(c, sc) {
    if (sc !== 2 && c.A._neuralMats) c.A._neuralMats.forEach(function (m) { m.opacity = m.userData.op0; });
    if (c.A.brain2d) c.A.brain2d.sprite.visible = false;   // (zoom() turns it on in its own scene)
    var A = c.A, f = c.f, out = c.out, ease = c.ease, dt = c.dt, S = c.S, Z = TM.zoom, E = TM.earth;
    A.neural.visible = sc <= 2; A.dna.visible = sc <= 1 || (sc === 2 && f < Z.collapse);
    A.brain.visible = sc === 2 || (sc === 1 && out > 0);
    A.earth.visible = (sc === 2 && f > Z.person[0]) || sc >= 3;
    A.hero.visible = sc === 2 || (sc === 3 && f < E.crowdFade[1] + 0.05); A.crowd.visible = (sc === 2 && f > Z.crowd[0]) || (sc === 3 && f < E.crowdFade[1] + 0.05);
    A.land.visible = (sc === 2 && f > Z.ground[0]) || (sc === 3 && f < E.capFade[1] + 0.05);
    A.folk.visible = (sc === 3 && f > E.folkFade[0]) || sc === 4;
    A.stars.material.opacity = sc === 3 ? ease(win(f, [E.starsFrom, E.starsFrom + 0.4])) : sc === 4 ? 1 : 0;
    A.points.visible = sc === 4; if (sc !== 4) A.frame.visible = false;
    var dusk = sc === 3 ? 1 - ease(win(f, E.skyFade)) : sc === 2 && f > 0.6 ? ease((f - 0.6) * 2.5) : 0;
    c.bg.copy(c.c0).lerp(c.cSky, dusk).lerp(c.cSpace, sc === 4 || (sc === 3 && f > E.skyFade[1] - 0.07) ? 1 : 0);
    c.scene.background = c.bg;
    if (sc !== 4) { c.state.dataFiled = false; c.state.dataHolding = false; S.dataT = 0; }

    // action potentials on the axons, always; a spike lights its target neuron as it arrives
    var N = TM.neurons;
    A.dna.rotation.y += dt * 0.6;
    A.spikes.forEach(function (sk) {
      if (sk.a === null && A.rnd() < N.spikeChance && A.axons.length) { sk.a = A.axons[Math.floor(A.rnd() * A.axons.length)]; sk.t = 0; }
      if (sk.a) {
        sk.t += dt * sk.speed; sk.m.position.copy(sk.a.curve.getPoint(Math.min(1, sk.t)));
        var tgt = A.neurons[sk.a.to], hot = sk.t > 0.9;
        tgt.m.material.emissive.setHex(hot ? 0x6b8cff : 0x1b2a6b); tgt.halo.material.opacity = hot ? 1 : 0.45; tgt.halo.scale.setScalar(hot ? 2.2 : 1.4);
        if (sk.t >= 1) { sk.a = null; c.state.spikesFired++; S.lastSpikeTerminal = c.t; }
      }
      sk.m.visible = !!sk.a;
    });
    c.state.terminalHit = (c.t - S.lastSpikeTerminal) < N.terminalMs;
  }

  /* ---------- 0 · neurons & DNA: the helix slides in beside the network ---------- */
  function neurons(c) {
    var A = c.A;
    c.aim(0, 0, 14, 0, 0, 0);
    A.neural.scale.setScalar(1); A.neural.position.set(-1.5, 0, 0);
    A.dna.position.x = 6.5 + (1 - c.ease(c.f / TM.neurons.dnaSlide)) * 6;
  }

  /* ---------- 1 · the paper: the camera drifts right; at the hand-off the network shrinks and a faint brain appears ---------- */
  function paper(c) {
    var A = c.A, out = c.out;
    c.aim(2 + out * 4, 0, 12 - out * 2, 2, 0, 0);
    A.neural.position.set(-1.5, 0, 0); A.neural.scale.setScalar(1 - TM.paper.shrink * out); A.dna.position.x = 6.5;
    setOp(A.brainMats, out * 0.4);
    if (A.brain2d) A.brain.visible = false;   // the drawn brain only starts in the zoom
  }

  /* ---------- 2 · neurons → brain → person → crowd, one continuous pull-back ---------- */
  function zoom(c) {
    var A = c.A, f = c.f, dt = c.dt, ease = c.ease, lerp = c.lerp, Z = TM.zoom;
    var k1 = ease(f / Z.collapse), k2 = ease(win(f, Z.person)), kb = ease(win(f, Z.body)), k3 = ease((f - Z.pullBack) / (1 - Z.pullBack));
    // the neurons shrink away while the brain closes in from the edges of the view: we start inside it and come out through its wall
    var rise = ease(win(f, Z.brainRise || [0.5, 0.6])), by = lerp(0, Z.brainY, rise);
    // the neuron cluster's own centre and size (local units), so the brain can be drawn centred around all of it
    if (!A._clu) { var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; A.neurons.forEach(function (n) { x0 = Math.min(x0, n.p.x); x1 = Math.max(x1, n.p.x); y0 = Math.min(y0, n.p.y); y1 = Math.max(y1, n.p.y); });
      A._clu = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2 + 1.2, hh: (y1 - y0) / 2 + 1.2 }; }
    var NS = Z.neuronsTo || 0.12, ns = lerp(0.5, NS, k1), CL = A._clu;
    A.neural.scale.setScalar(ns);
    A.neural.position.set(lerp(-1.5, -CL.cx * NS, k1), lerp(0, by - CL.cy * NS, k1), 0);   // slides so the cluster's centre sits exactly where the brain is drawn
    A.neural.visible = k2 < 0.98;
    // the neurons fade as the head closes over them
    if (!A._neuralMats) { A._neuralMats = []; A.neural.traverse(function (o) { if (o.material && A._neuralMats.indexOf(o.material) < 0) { o.material.transparent = true; o.material.userData.op0 = o.material.opacity; A._neuralMats.push(o.material); } }); }
    A._neuralMats.forEach(function (m) { m.opacity = m.userData.op0 * (1 - k2); });
    var inside = Math.max(0, 1 - k1 / 0.45);                 // 1 = the camera is well inside the brain
    A.brain.scale.setScalar(lerp(Z.brainFrom, Z.brainScale, k1)); A.brain.position.set(0, Z.brainY, 0);   // (the brain holds still: no turning)
    A.brainMats.forEach(function (m) { m.opacity = lerp(0.9, 0.35, inside); m.emissiveIntensity = 0.12 + inside * 0.25; });
    A.brain.visible = k2 < 0.98;
    // the head forms around the brain first — a translucent skin that closes in from a little larger — then the body fills in below it
    A.heroHead.scale.setScalar(lerp(Z.headFrom, 1, k2));
    setOp(A.heroHeadMats, k2 * 0.97); setOp(A.heroBodyMats, kb * 0.97);
    A.earth.scale.setScalar(A.E0); A.earth.position.set(0, A.LAND_Y - 10 * A.E0, 0); A.earth.rotation.y = 0;
    setOp(A.crowdMatList, ease(win(f, Z.crowd))); A.landMat.opacity = Math.max(0.001, ease(win(f, Z.ground)));
    pull(c, k3, Z.distance[0], Z.distance[1], CAM_NEAR, CAM_FAR, 0, lerp(0, -8, k3), 0);
    // the brain draws itself: a pen line traces it around the shrinking neurons, then it fills (js/science/brain2d.js)
    if (A.brain2d) {
      A.brain2d.sprite.visible = A.brain.visible; A.brain.visible = false;
      var G = A.brain2d.geo, SW = Math.max(CL.hw * NS / (G.rx / G.W) * 1.12, (CL.hh * NS / (G.ry * 0.85 / G.H)) * (G.W / G.H) * 1.12), SH = SW * G.H / G.W;   // big enough that the outline clears every neuron
      A.brain2d.sprite.scale.set(SW, SH, 1);
      A.brain2d.sprite.position.set(-(G.cx - G.W / 2) / G.W * SW, by + (G.cy - G.H / 2) / G.H * SW * G.H / G.W, -0.3);   // the cerebrum's centre on the cluster's centre
      A.brain2d.set(ease(win(f, Z.brainDraw || [0, 0.3])), ease(win(f, Z.brainFill || [0.24, 0.4])));
    }
  }

  /* ---------- 3 · crowd → globe: keep pulling back, the ground curves into the earth, little people appear all over it ---------- */
  function earth(c) {
    var A = c.A, f = c.f, dt = c.dt, ease = c.ease, lerp = c.lerp, E = TM.earth;
    var z = ease(f / E.shrink), scale = A.E0 * Math.pow(1 / A.E0, z);
    A.earth.scale.setScalar(scale); A.earth.position.set(0, A.LAND_Y - 10 * scale, 0);
    if (f > E.spinFrom) { A.earth.rotation.y += dt * 0.08; A.clouds.rotation.y += dt * 0.03; }
    var fade = 1 - ease(win(f, E.crowdFade));
    A.heroHead.scale.setScalar(1); setOp(A.heroMatList, fade * 0.97); setOp(A.crowdMatList, fade); A.landMat.opacity = Math.max(0.001, 1 - ease(win(f, E.capFade)));
    setOp(A.folkMatList, ease(win(f, E.folkFade)));
    pull(c, z, E.distance[0], E.distance[1], CAM_FAR, CAM_END, 0, lerp(-8, A.EY, z), 0);
  }

  /* ---------- 4 · the data: points rise off the people, hang for a moment, file into the frame; then the card ---------- */
  function data(c) {
    var A = c.A, S = c.S, dt = c.dt, ease = c.ease, lerp = c.lerp, D = TM.data, EY = A.EY, f = c.f;
    function cl(x) { return Math.max(0, Math.min(1, x)); }
    var emerge = cl(win(f, D.emerge));
    if (f >= D.holdAt - 0.02) S.dataT += dt; else S.dataT = 0;          // filing runs on the clock once the page reaches the hold point
    var file = cl(S.dataT / D.fileSeconds);
    A.earth.position.set(0, EY, 0); A.earth.rotation.y += dt * 0.08; A.clouds.rotation.y += dt * 0.03;
    setOp(A.folkMatList, 1); A.landMat.opacity = 0.001;
    var rotY = A.earth.rotation.y, arr = A.pGeo.attributes.position.array, wob = c.t / 1000;
    for (var i = 0; i < A.NP; i++) {
      var ph = ((i * 37) % 100) / 100, e = ease((emerge - ph * 0.5) / 0.5);              // each point leaves a little later than the last
      var o = tmpV.copy(A.pFrom[i]).applyAxisAngle(UP, rotY);                           // where it starts: a person's head, turning with the globe
      var risen = tmpW.copy(o).multiplyScalar(1 + e * (0.3 + ph * 0.5)); risen.y += EY;  // …rising straight off the surface
      risen.x += Math.sin(wob * 1.3 + i) * 0.12 * e; risen.y += Math.sin(wob * 0.9 + i * 0.7) * 0.15 * e;   // a slow drift while it hangs
      var slot = ease((file - (i / A.NP) * 0.45) / 0.55), to = A.pTo[i];                 // then files into its cell, row by row
      arr[i * 3] = lerp(risen.x, to.x, slot); arr[i * 3 + 1] = lerp(risen.y, to.y + EY + 18.3, slot); arr[i * 3 + 2] = lerp(risen.z, to.z + 20, slot);
    }
    A.pGeo.attributes.position.needsUpdate = true; A.points.material.opacity = Math.min(1, emerge * 2);
    A.frame.position.set(0, EY + 18.3, 20); A.frame.visible = file > 0.05;
    A.frameMats.forEach(function (m) { m.opacity = m.userData.op * ease(file / 0.4); });            // the frame fades in as the first rows arrive
    A.earth.scale.setScalar(1 - file * (1 - D.earthShrink));
    var K = TM.earth.distance[1] / 86;   // start where the earth scene ended
    c.aim(0, EY + lerp(57.3 * K, 18.3 + 1.2, file), lerp(64 * K, 20 + D.frameDistance, file), 0, EY + file * 18.3, file * 20);   // ends square-on to the frame
    c.state.dataFiled = file >= 0.98; c.state.dataHolding = f >= D.holdAt - 0.02 && file < 0.98;
  }

  return { stage: stage, list: [neurons, paper, zoom, earth, data] };
})();
