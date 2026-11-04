/* ============================================================
   Robotics journey · SCENES
   ------------------------------------------------------------
   One function per scene. Each gets a context `c`:
     c.A      the assets (js/robotics/assets.js)
     c.f      0..1 · how far through this scene
     c.out    0..1 · the hand-off to the next scene (starts at
              Timing.robotics.handoff)
     c.dt     seconds since the last frame (capped, for motion)
     c.t      ms clock (performance.now())
     c.aim(px,py,pz, lx,ly,lz)   where the camera should be / look
     c.ease, c.lerp
     c.S      shared mutable state that survives between frames
              (satAngle, sweepT, seenCount, …)
     c.state  the readout state exposed to the cards
   Each returns the one-line readout for the card.

   `stage(c, sc)` runs before the scene: sky, fog, lights and which
   props are visible. ALL timing numbers come from js/timing.js
   (window.Timing.robotics) — change them there, not here.
   ============================================================ */
window.RoboScenes = (function () {
  "use strict";
  var TM = window.Timing.robotics;
  var T = window.THREE;
  if (!T) return null;
  var UP = new T.Vector3(0, 1, 0), tmpV = new T.Vector3(), tmpW = new T.Vector3();

  /* ---------- sky, fog, lights, visibility (every frame) ---------- */
  // where the forest sweep ends (path = 1 in forest()): the PID hover and the launch both happen right here
  var HOVER_X = Math.sin(3.1) * 4.5, HOVER_Z = 2 - 22;
  function stage(c, sc) {
    if (sc !== 2) c.S.pidIn = false;
    var A = c.A, f = c.f, out = c.out, ease = c.ease, lerp = c.lerp, L = TM.launch, dt = c.dt;
    var night = sc < 3 ? 0 : sc === 3 ? ease(f / L.nightBy) : 1;
    var space = sc >= 4 ? 1 : sc === 3 ? ease((f - L.spaceFrom) / (1 - L.spaceFrom)) : 0;
    c.sky.copy(c.skyDay).lerp(c.skyNight, night).lerp(c.skySpace, space);
    c.scene.background = c.sky; c.scene.fog.color.copy(c.sky);
    // in the asteroid field the ground is 70 units below: let the fog swallow it so the rocks hang in the night sky
    c.scene.fog.near = sc === 3 ? 20 : 22; c.scene.fog.far = sc === 3 ? lerp(60, 55, ease(f / L.hopFrom)) : sc >= 4 ? 400 : 60;
    A.stars.material.opacity = sc >= 4 ? 1 : sc === 3 ? ease((f - L.starsFrom) / 0.6) : 0;
    c.hemi.intensity = sc >= 4 ? 0.15 : lerp(0.5, 0.2, night); c.sun.intensity = sc >= 4 ? 0.3 : lerp(1.15, 0.5, night); c.sun.color.setHex(night > 0.5 ? 0xbfd0ff : 0xfff2dc);
    c.sun.target.position.copy(c.cam.position).setY(0); c.sun.position.copy(c.sun.target.position).add(tmpV.set(8, 14, 10));

    A.robot.visible = sc === 0; A.crate.visible = sc === 0; A.shelves.visible = sc === 0; A.floor.visible = sc === 0;
    A.forest.visible = sc === 1 || sc === 2 || (sc === 0 && out > 0); A.target.visible = sc === 2;
    A.drone.visible = (sc === 0 && out > 0) || sc === 1 || sc === 2 || (sc === 3 && f < L.refit);
    A.ship.visible = (sc === 3 && f >= L.refit * 0.4) || sc >= 4; A.solar.visible = sc >= 4 || (sc === 3 && out > 0); A.ground.visible = sc < 4;
    A.cloudDeck.visible = sc === 3 && f < L.hopFrom; A.cloudDeck.children.forEach(function (sp) { sp.material.opacity = 0.75 * (1 - night * 0.6); });
    A.rocks.visible = (sc === 3 && f > L.hopFrom) || sc === 4 || sc === 6;   // (hidden in the film scene: the camera sits right by the hull) A.landing.visible = sc === 3 && f > L.hopFrom && A.hop.t < 1 && f < L.hopsEndAt;
    A.rockList.forEach(function (r) { r.m.rotation.y += dt * r.spin; r.m.rotation.x += dt * r.spin * 0.4; if (sc >= 3) { r.m.position.x += r.vx * dt; r.m.position.z += r.vz * dt; if (Math.abs(r.m.position.x - r.x0) > 5) r.vx *= -1; if (Math.abs(r.m.position.z - r.z0) > 3) r.vz *= -1; } });
    // forest grows out of the ground as it arrives and sinks away before the launch
    var fScale = sc === 0 ? out : sc === 1 ? 1 : sc === 2 ? 1 - out : 0;
    A.forest.scale.set(1, Math.max(0.001, fScale), 1);
    A.shelves.position.y = -2.4 * out * (sc === 0 ? 1 : 0);
    A.solar.scale.setScalar(sc >= 4 ? (sc === 5 ? 1 : lerp(0.3, 1, ease(f / TM.solar.grow))) : sc === 3 ? Math.max(0.001, out * 0.3) : 0.001);
    A.rotors.forEach(function (r) { r.rotation.y += dt * 40; }); A.sunGlow.material.rotation += dt * 0.05;
    if (sc !== 3) A.drone.scale.setScalar(1);
    if (sc < 4) c.S.satAngleSet = false;
  }

  /* ---------- 0 · warehouse: the robot lifts a crate on a loop, drives off at the hand-off ---------- */
  function warehouse(c) {
    var A = c.A, out = c.out, ease = c.ease, W = TM.warehouse;
    var cyc = (c.t / W.cycleMs) % 1;
    var lift = cyc < 0.25 ? ease(cyc / 0.25) : cyc < 0.55 ? 1 : cyc < 0.75 ? 1 - ease((cyc - 0.55) / 0.2) : 0;
    var turn = cyc < 0.25 ? 0 : cyc < 0.55 ? ease((cyc - 0.25) / 0.3) : cyc < 0.8 ? 1 : 1 - ease((cyc - 0.8) / 0.2);
    A.armL.rotation.x = A.armR.rotation.x = -0.9 * lift; A.armL.fore.rotation.x = A.armR.fore.rotation.x = -0.7 * lift; A.head.rotation.x = 0.25 * lift - 0.1;
    A.robot.rotation.y = -0.7 + turn * 1.3;
    var ry = A.robot.rotation.y, holding = cyc > 0.06 && cyc < 0.72, rp = A.robot.position;
    if (holding) A.crate.position.set(rp.x + Math.sin(ry) * 1.25, 0.4 + 1.05 * lift, rp.z + Math.cos(ry) * 1.25);
    else if (cyc >= 0.72) A.crate.position.set(rp.x + Math.sin(0.6) * 1.25, 0.4, rp.z + Math.cos(0.6) * 1.25);
    else A.crate.position.set(rp.x + Math.sin(-0.7) * 1.25, 0.4, rp.z + Math.cos(-0.7) * 1.25);
    A.robot.position.x = -2.2 - out * W.leaveDistance; A.robot.position.z = 0.5;
    A.drone.position.set(14 - out * 14, 2.6 + (1 - out) * 1.5, 2); A.drone.rotation.set(0, 0, -0.25 * (1 - out)); A.cone.visible = false;
    c.aim(0, 2.6 + out * 2, 9, 0, 1.2 + out * 0.6, -out * 2);
    return "A* path planning · a policy that survives slipping wheels";
  }

  /* ---------- 1 · forest (SLAM): the drone sweeps, trees in its cone light up ---------- */
  function forest(c) {
    var A = c.A, S = c.S, f = c.f, dt = c.dt, F = TM.forest;
    S.sweepT += dt;
    var path = c.ease(Math.min(1, f / F.sweepScroll + S.sweepT / F.sweepRestSeconds));   // scroll drives the sweep, and it keeps going while you rest
    S.droneTo.set(Math.sin(path * 3.1) * 4.5, 2.6 + Math.sin(c.t / 900) * 0.15, 2 - path * 22); A.drone.position.lerp(S.droneTo, 1 - Math.exp(-dt * 4));
    A.drone.rotation.y = Math.cos(path * 3.1) * 0.5; A.drone.rotation.z = -Math.cos(path * 3.1) * 0.15;
    A.cone.visible = true; A.target.visible = false;
    var seen = 0;
    A.trees.forEach(function (tr) {
      var dx = tr.g.position.x - A.drone.position.x, dz = tr.g.position.z - A.drone.position.z, d = Math.hypot(dx, dz);
      var ang = Math.atan2(dx, -dz) - A.drone.rotation.y;
      if (!tr.seen && d < 5.5 && Math.abs(ang) < 0.55) { tr.seen = true; tr.mat.color.setHex(0x2fbf71); tr.mat.opacity = 1; tr.mat.emissive.setHex(0x0b3d25); }
      if (tr.seen) seen++;
    });
    c.aim(A.drone.position.x * 0.4 + 5, 5.5, A.drone.position.z + 8, A.drone.position.x, 1.5, A.drone.position.z - 4);
    c.state.seen = seen; c.state.total = A.trees.length;
    if (f < F.resetBelow) { S.sweepT = 0; A.trees.forEach(function (tr) { tr.seen = false; tr.mat.color.setHex(0x3b4a5a); tr.mat.opacity = 0.35; tr.mat.emissive.setHex(0x000000); }); }
    return seen + " / " + A.trees.length + " trees mapped";
  }

  /* ---------- 2 · PID: the drone chases altitude targets, with a little overshoot ---------- */
  function pid(c) {
    var A = c.A, p = A.pid, dt = c.dt, P = TM.pid;
    A.cone.visible = false;
    if (c.t > p.nextSwitch) { p.goal = P.goalMin + Math.random() * P.goalSpan; p.nextSwitch = c.t + P.switchMs; }
    var err = p.goal - p.alt; p.integ += err * dt;
    var acc = P.kp * err - P.kd * p.vel + P.ki * p.integ;
    p.vel += acc * dt; p.alt += p.vel * dt;
    // start bobbing right where the forest sweep left the drone (no jump back): take over its height and carry on from there
    if (!c.S.pidIn) { c.S.pidIn = true; p.alt = A.drone.position.y; p.vel = 0; p.integ = 0; p.goal = p.alt + 1.2; p.nextSwitch = c.t + P.switchMs * 0.6; }
    var fade = 1 - Math.exp(-dt * 4);
    c.S.droneTo.set(HOVER_X, p.alt, HOVER_Z); A.drone.position.lerp(c.S.droneTo, 1 - Math.exp(-dt * 5));
    A.drone.rotation.set(A.drone.rotation.x * (1 - fade), A.drone.rotation.y * (1 - fade), A.drone.rotation.z * (1 - fade));   // level out gently
    c.state.alt = p.alt; c.state.goal = p.goal;
    A.target.position.set(HOVER_X, p.goal, HOVER_Z);
    c.aim(HOVER_X + 5, 3.5, HOVER_Z + 7, HOVER_X, 2.8, HOVER_Z);
    return "target " + p.goal.toFixed(2) + " m · altitude " + p.alt.toFixed(2) + " m";
  }

  /* ---------- 3 · launch: drone → rocket, climb to orbit, then hop asteroid to asteroid ---------- */
  function launch(c) {
    var A = c.A, S = c.S, f = c.f, dt = c.dt, ease = c.ease, lerp = c.lerp, L = TM.launch, hop = A.hop, ship = A.ship, readout;
    var k = ease(f / L.refit), up = ease((f - L.refit) / L.liftoff);
    A.drone.position.set(HOVER_X, A.drone.position.y + (2.5 - A.drone.position.y) * (1 - Math.exp(-dt * 4)), HOVER_Z);   // ease back to cruise height from wherever the PID left it A.drone.scale.setScalar(1 - k); A.drone.rotation.y += dt * 6 * k;
    A.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1); A.flame.visible = A.flameCore.visible = A.flameGlow.visible = f > L.refit && f < L.flameUntil; A.flameGlow.material.opacity = 0.6 + Math.random() * 0.4;
    // the hop sequence: the rocks from lowest to highest; the climb ends on the first one
    if (!S.rockSeq) S.rockSeq = A.rockList.slice().sort(function (p, q) { return p.m.position.y - q.m.position.y; });
    var seq = S.rockSeq, hops = Math.min(seq.length - 1, L.hops), r0 = seq[0].m.position;
    if (f < L.hopFrom) {
      ship.position.set(lerp(HOVER_X, r0.x, up), 0.2 + k * 2.3 + up * (r0.y + 0.9 - 2.5), lerp(HOVER_Z, r0.z, up)); ship.scale.setScalar(Math.max(0.001, k)); ship.rotation.set(0, 0, 0);
      hop.count = 0; hop.t = 1;
      // ride alongside the rocket: the camera sits just below and beside it and tracks it tightly, so it never leaves the frame
      var chase = ease((f - L.refit) / 0.06);
      c.aim(ship.position.x + lerp(6, 5.5, chase), ship.position.y + lerp(2.5, 1.2, chase), ship.position.z + lerp(8, 7.5, chase), ship.position.x, ship.position.y + lerp(0.5, 1.6, chase), ship.position.z);
      c.camFollow = f > L.refit ? L.chaseFollow : null;
      readout = f < L.refit ? "re-fitting for space…" : "altitude " + Math.round(ship.position.y * 120) + " m";
    } else {
      // hopping is driven by the scroll: each hop takes its share of the scene, so it can't be rushed past
      ship.scale.setScalar(1); c.camFollow = null;
      var h = Math.max(0, Math.min(1, (f - L.hopFrom) / (L.hopsEndAt - L.hopFrom))) * hops;
      var ki = Math.min(hops - 1, Math.floor(h)), t = h >= hops ? 1 : h - ki;
      var from = seq[ki].m.position, to = seq[ki + 1].m.position, e = ease(t);
      ship.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) + 0.9 + Math.sin(t * Math.PI) * 1.4, lerp(from.z, to.z, e));
      ship.rotation.set(0, 0, (to.x - from.x) * -0.08 * Math.sin(t * Math.PI));
      A.landing.position.set(to.x, to.y + 0.05, to.z); hop.t = t; hop.count = ki + (t >= 1 ? 1 : 0);
      c.aim(ship.position.x + 7, ship.position.y + 4, ship.position.z + 9, ship.position.x, ship.position.y + 1, ship.position.z);
      readout = "hop " + hop.count + " / " + hops + " · landing where the rock will be, not where it is";
    }
    c.state.altitude = ship.position.y * 120;
    if (f < 0.05) A.drone.scale.setScalar(1);
    return readout;
  }

  // the ship as a satellite: it glides from wherever the hopping left it into a circular orbit around the sun,
  // then keeps flying that orbit (shared by the solar and ship scenes). `settle` 0..1 blends from the asteroid to the orbit.
  var qTmp = new T.Quaternion();
  function orbit(c, settle, hold) {
    var A = c.A, S = c.S, sp = A.solar.position, dt = c.dt, ship = A.ship;
    if (!S.satAngleSet) { S.satAngle = Math.atan2(ship.position.z - sp.z, ship.position.x - sp.x); S.satAngleSet = true; S.shipFrom = ship.position.clone(); S.shipFromQ = ship.quaternion.clone(); }
    if (!hold) S.satAngle += dt * TM.solar.orbitRate;   // (held still for the film scene)
    tmpW.set(sp.x + Math.cos(S.satAngle) * 10, sp.y, sp.z + Math.sin(S.satAngle) * 10);
    if (settle == null) settle = 1;
    ship.position.lerpVectors(S.shipFrom, tmpW, settle); ship.position.y += Math.sin(settle * Math.PI) * 3;   // a gentle arc down into the orbit
    ship.scale.setScalar(1); A.flame.visible = A.flameCore.visible = A.flameGlow.visible = false;
    qTmp.setFromUnitVectors(UP, tmpV.set(-Math.sin(S.satAngle), 0, Math.cos(S.satAngle)).normalize());
    ship.quaternion.copy(S.shipFromQ).slerp(qTmp, settle);
  }

  /* ---------- 4 · solar system: the particle filter finds the ship; dive toward it at the hand-off ---------- */
  function solar(c) {
    var A = c.A, S = c.S, f = c.f, out = c.out, dt = c.dt, ease = c.ease, lerp = c.lerp, SO = TM.solar, sp = A.solar.position;
    var settle = ease(f / SO.settleIn);
    orbit(c, settle);
    A.planets.forEach(function (pl) { pl.a += dt * pl.w * 0.3; pl.m.position.set(Math.cos(pl.a) * pl.r, 0, Math.sin(pl.a) * pl.r); });
    var ph = Math.min(1, f / SO.converge), st1 = ease(ph * 2), st2 = ease((ph - 0.5) * 2);   // scatter → ring → converge
    var pos = A.pGeo.attributes.position.array, pStart = A.pStart, pRing = A.pRing;
    for (var i = 0; i < A.NP; i++) {
      var x = lerp(pStart[i * 3], pRing[i * 3], st1), z = lerp(pStart[i * 3 + 2], pRing[i * 3 + 2], st1);
      var angP = Math.atan2(z, x), dA = Math.atan2(Math.sin(S.satAngle - angP), Math.cos(S.satAngle - angP));
      var angF = angP + dA * st2, rad = Math.hypot(x, z) * (1 - st2) + 10 * st2 + (Math.random() - 0.5) * 0.25 * st2;
      pos[i * 3] = Math.cos(angF) * rad; pos[i * 3 + 1] = pStart[i * 3 + 1] * (1 - st2 * 0.8); pos[i * 3 + 2] = Math.sin(angF) * rad;
    }
    A.pGeo.attributes.position.needsUpdate = true;
    var zoom = ease((f - SO.zoomOut[0]) / (SO.zoomOut[1] - SO.zoomOut[0])), ship = A.ship;
    if (out > 0) {   // dive toward the ship for the next scene
      var dx = Math.cos(S.satAngle), dz = Math.sin(S.satAngle);
      c.aim(lerp(sp.x, ship.position.x + dx * 4, out), lerp(sp.y + 32, sp.y + 2.5, out), lerp(sp.z + 28, ship.position.z + dz * 4, out), ship.position.x, ship.position.y, ship.position.z);
    } else {
      // first circle the ship as it settles into orbit (the camera swings around it), then pull out to the overview
      var th = settle * Math.PI * 0.9 + 0.6, r = 8 + settle * 4;
      var cx = ship.position.x + Math.cos(th) * r, cy = ship.position.y + 3 + settle * 3, cz = ship.position.z + Math.sin(th) * r;
      var ox = sp.x, oy = sp.y + 32, oz = sp.z + 28;
      c.aim(lerp(cx, ox, zoom), lerp(cy, oy, zoom), lerp(cz, oz, zoom), lerp(ship.position.x, sp.x, zoom), lerp(ship.position.y + 1, sp.y, zoom), lerp(ship.position.z, sp.z, zoom));
    }
    return ph < 0.5 ? "scatter · weigh every guess by the gravity reading" : ph < 0.9 ? "resample · the guesses close in on the ship" : "localized · the ship is found";
  }

  /* ---------- 5 · inside the ship (the Project Void film plays over this) ---------- */
  function ship(c) {
    var A = c.A, S = c.S, sp = A.solar.position, k5 = c.ease(c.f / TM.ship.settle), s = A.ship, lerp = c.lerp;
    orbit(c, 1, true);
    // close in on the ship's flank and hold there, as if looking in through a screen on its hull.
    // the hull runs along the orbit tangent (ship-local Y); its centre is ~1.1 along it. The camera sits
    // off the radial (outward) side, square to the hull, and tracks it tightly as the ship keeps orbiting.
    var dx = Math.cos(S.satAngle), dz = Math.sin(S.satAngle), ax = -Math.sin(S.satAngle), az = Math.cos(S.satAngle);
    var hx = s.position.x + ax * TM.ship.along, hy = s.position.y, hz = s.position.z + az * TM.ship.along;   // point on the hull to look at (toward the nose, clear of the fins)
    var dist = lerp(4, TM.ship.sideDistance, k5);
    c.aim(hx + dx * dist, hy + lerp(2.5, 0.35, k5), hz + dz * dist, hx, hy, hz);
    c.camFollow = 14;
    return "inside the ship";
  }

  /* ---------- 6 · exit: back away from the ship, turn down to the stars (the flat sky then carries into the chip section) ---------- */
  function exit(c) {
    var A = c.A, S = c.S, s = A.ship, f = c.f, ease = c.ease, lerp = c.lerp, X = TM.exit;
    orbit(c, 1, true);
    var pull = ease((f - X.pullOut[0]) / (X.pullOut[1] - X.pullOut[0])), tilt = ease((f - X.tilt[0]) / (X.tilt[1] - X.tilt[0]));
    var dx = Math.cos(S.satAngle), dz = Math.sin(S.satAngle), ax = -Math.sin(S.satAngle), az = Math.cos(S.satAngle);
    var hx = s.position.x + ax * TM.ship.along, hy = s.position.y, hz = s.position.z + az * TM.ship.along;
    var dist = lerp(TM.ship.sideDistance, 14, pull);
    var px = hx + dx * dist, py = hy + lerp(0.35, 4, pull), pz = hz + dz * dist;
    // look-at: from the hull, swinging down and away to empty space below the orbit plane (only stars there);
    // the ship slides up and out of the top of the frame as the camera turns
    // (the end point stays on the ship's side of the camera, so the pitch only ever goes down — never through vertical and back up)
    var lx = lerp(hx, px - dx * 3, tilt), ly = lerp(hy, py - 40, tilt), lz = lerp(hz, pz - dz * 3, tilt);
    c.aim(px, py, pz, lx, ly, lz);
    c.camFollow = 5;
    // once the view is turning down, nothing but stars: the orbit rings and particle ring would otherwise cut a line across the frame
    var clear = f >= X.clear;
    A.solar.visible = !clear; A.rocks.visible = !clear; A.ship.visible = f < X.clear + 0.2;
    return "leaving the ship";
  }
  return { stage: stage, list: [warehouse, forest, pid, launch, solar, ship, exit] };
})();
