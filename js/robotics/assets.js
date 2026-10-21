/* ============================================================
   Robotics journey · ASSETS (Three.js r128 + js/three-kit.js)
   ------------------------------------------------------------
   Builds every mesh for the robotics world and returns them by
   name. Nothing here moves: all motion and timing lives in
   js/robotics/scenes.js (numbers in js/timing.js).

     RoboAssets.build(scene, T, K) → { ground, floor, shelves, stars,
       robot, head, armL, armR, crate, drone, rotors, cone, forest,
       trees, target, pid, ship, flame, flameCore, flameGlow, ORBIT_Y,
       rocks, rockList, landing, hop, solar, sunGlow, sunLight, planets,
       particles, pGeo, pStart, pRing, NP, MAT }

   Sections: materials · ground & sky · robot · drone · forest ·
   PID target · rocket · asteroid field · solar system
   ============================================================ */
window.RoboAssets = (function () {
  "use strict";
  function build(scene, T, K) {
    var MAT = {
      green: K.std(0x3ddc97, 0.35, 0.1), greenDark: K.std(0x1f9c6a, 0.4, 0.15),
      dark: K.std(0x1b2430, 0.6, 0.35), white: K.std(0xe9edf2, 0.35, 0.05), orange: K.std(0xff8a5b, 0.45, 0.05),
      box: K.std(0xc9a06b, 0.9, 0), trunk: K.std(0x5a3d26, 0.95, 0),
      unseen: K.std(0x3b4a5a, 1, 0, { transparent: true, opacity: 0.35 }), seen: K.std(0x2fbf71, 0.75, 0),
      cone: new T.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false }),
      target: new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, side: T.DoubleSide }),
      flame: new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }),
      glass: K.std(0x9fe1ff, 0.1, 0.2, { transparent: true, opacity: 0.55 }),
      metal: K.std(0xcfd4dc, 0.3, 0.8), rubber: K.std(0x14181f, 0.95, 0),
    };
    function mesh(geo, mat, x, y, z, parent) { return K.mesh(geo, mat, x, y, z, parent || scene); }

    /* ---------- ground & sky ---------- */
    var grassMat = K.std(0x7faa5c, 1, 0, { map: K.grassTex() });
    var ground = mesh(new T.PlaneGeometry(500, 500), grassMat, 0, 0, 0); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    var floorMat = K.std(0x9aa4b2, 0.85, 0.05, { map: K.concreteTex() });
    var floor = mesh(new T.PlaneGeometry(22, 14), floorMat, 0, 0.01, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
    // warehouse racking: uprights, beams, boxes
    var shelves = new T.Group(); scene.add(shelves);
    var rackMat = K.std(0x2f4a8a, 0.55, 0.4), beamMat = K.std(0xff8a5b, 0.5, 0.3);
    for (var si = 0; si < 5; si++) {
      var rx = -7 + si * 3.5, rack = new T.Group(); rack.position.set(rx, 0, -4); shelves.add(rack);
      [[-0.9, -0.6], [0.9, -0.6], [-0.9, 0.6], [0.9, 0.6]].forEach(function (c) { mesh(new T.BoxGeometry(0.08, 2.6, 0.08), rackMat, c[0], 1.3, c[1], rack); });
      for (var lv = 0; lv < 3; lv++) {
        var y = 0.25 + lv * 0.95;
        mesh(new T.BoxGeometry(1.9, 0.06, 0.06), beamMat, 0, y, -0.6, rack); mesh(new T.BoxGeometry(1.9, 0.06, 0.06), beamMat, 0, y, 0.6, rack);
        mesh(new T.BoxGeometry(1.8, 0.03, 1.2), K.std(0x8a93a3, 0.9, 0.1), 0, y + 0.03, 0, rack);
        for (var bi = 0; bi < 3; bi++) if ((si + lv + bi) % 4 !== 1) { var bw = 0.4 + ((si * 7 + bi * 3 + lv) % 3) * 0.08; mesh(new T.BoxGeometry(bw, bw * 0.85, 0.5 + bi * 0.1), MAT.box, -0.6 + bi * 0.6, y + 0.05 + bw * 0.42, 0, rack); }
      }
    }
    var stars = K.stars(3600, 150, 240); stars.material.size = 2.4; stars.material.opacity = 0; scene.add(stars);

    /* ---------- actor: robot (jointed, with a face and rubber tracks) ---------- */
    var robot = new T.Group(); scene.add(robot);
    var torso = mesh(K.rounded(1.1, 1.25, 0.8, 0.14), MAT.green, 0, 1.45, 0, robot);
    mesh(K.rounded(0.9, 0.5, 0.6, 0.1), MAT.greenDark, 0, 0.78, 0, robot);               // hip block
    var head = new T.Group(); head.position.set(0, 2.45, 0); robot.add(head);
    mesh(K.rounded(0.8, 0.6, 0.7, 0.14), MAT.green, 0, 0, 0, head);
    var visor = mesh(K.rounded(0.56, 0.22, 0.06, 0.05), MAT.rubber, 0, 0.02, 0.36, head);
    var eyeMat = new T.MeshBasicMaterial({ color: 0x9fe1ff });
    mesh(new T.CircleGeometry(0.06, 12), eyeMat, -0.14, 0.03, 0.4, head); mesh(new T.CircleGeometry(0.06, 12), eyeMat, 0.14, 0.03, 0.4, head);
    mesh(new T.CylinderGeometry(0.03, 0.03, 0.3, 8), MAT.metal, 0.25, 0.42, 0, head); mesh(new T.SphereGeometry(0.06, 10, 10), MAT.orange, 0.25, 0.58, 0, head);
    mesh(new T.CylinderGeometry(0.16, 0.2, 0.2, 12), MAT.dark, 0, 2.1, 0, robot);        // neck
    var armL = new T.Group(), armR = new T.Group(); armL.position.set(-0.72, 1.9, 0); armR.position.set(0.72, 1.9, 0); robot.add(armL); robot.add(armR);
    [armL, armR].forEach(function (arm, i) {
      mesh(new T.SphereGeometry(0.17, 12, 12), MAT.dark, 0, 0, 0, arm);                          // shoulder
      mesh(new T.CylinderGeometry(0.11, 0.1, 0.6, 10), MAT.greenDark, 0, -0.35, 0, arm);
      var fore = new T.Group(); fore.position.set(0, -0.68, 0); arm.add(fore); arm.fore = fore;
      mesh(new T.SphereGeometry(0.13, 12, 12), MAT.dark, 0, 0, 0, fore);                         // elbow
      mesh(new T.CylinderGeometry(0.09, 0.1, 0.55, 10), MAT.green, 0, -0.32, 0, fore);
      mesh(K.rounded(0.26, 0.14, 0.26, 0.04), MAT.orange, 0, -0.64, 0, fore);                     // gripper palm
      mesh(new T.BoxGeometry(0.05, 0.22, 0.2), MAT.dark, -0.1, -0.78, 0, fore); mesh(new T.BoxGeometry(0.05, 0.22, 0.2), MAT.dark, 0.1, -0.78, 0, fore);
    });
    // tracked base
    var base = new T.Group(); base.position.y = 0.3; robot.add(base);
    mesh(K.rounded(1.3, 0.3, 0.9, 0.08), MAT.dark, 0, 0.1, 0, base);
    [-0.5, 0.5].forEach(function (zz) { var tr = mesh(K.rounded(1.5, 0.5, 0.3, 0.2), MAT.rubber, 0, 0, zz, base); for (var w = -1; w <= 1; w++) mesh(new T.CylinderGeometry(0.17, 0.17, 0.08, 16), MAT.metal, w * 0.5, 0, zz + (zz > 0 ? 0.17 : -0.17), base).rotation.x = Math.PI / 2; });
    var crate = mesh(K.rounded(0.8, 0.8, 0.8, 0.05), K.std(0xc9a06b, 0.9, 0, { map: K.canvasTex(128, 128, function (ctx, w, h) { ctx.fillStyle = "#c9a06b"; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "#8a6a3e"; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16); ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(w - 8, h - 8); ctx.moveTo(w - 8, 8); ctx.lineTo(8, h - 8); ctx.stroke(); }) }), 1.6, 0.4, 0.9);
    robot.position.set(-2.2, 0, 0.5);

    /* ---------- actor: drone (quadcopter with arms, motors, camera gimbal) ---------- */
    var drone = new T.Group(); scene.add(drone);
    mesh(K.rounded(0.8, 0.2, 0.9, 0.12), MAT.dark, 0, 0, 0, drone);
    mesh(K.rounded(0.42, 0.14, 0.42, 0.08), MAT.green, 0, 0.16, 0, drone);
    mesh(new T.SphereGeometry(0.1, 10, 10), MAT.glass, 0, -0.14, 0.3, drone);            // camera gimbal
    var rotors = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      var arm = mesh(new T.CylinderGeometry(0.045, 0.045, 1.0, 8), MAT.dark, q[0] * 0.42, 0, q[1] * 0.42, drone); arm.rotation.z = Math.PI / 2; arm.rotation.y = -q[0] * q[1] * Math.PI / 4;
      var motor = mesh(new T.CylinderGeometry(0.1, 0.12, 0.12, 14), MAT.metal, q[0] * 0.78, 0.06, q[1] * 0.78, drone);
      var rot = new T.Group(); rot.position.set(q[0] * 0.78, 0.15, q[1] * 0.78); drone.add(rot);
      mesh(new T.BoxGeometry(0.9, 0.012, 0.06), MAT.rubber, 0, 0, 0, rot); mesh(new T.BoxGeometry(0.06, 0.012, 0.9), MAT.rubber, 0, 0, 0, rot);
      var disc = mesh(new T.CylinderGeometry(0.46, 0.46, 0.01, 24), new T.MeshBasicMaterial({ color: 0xe6ebf2, transparent: true, opacity: 0.18 }), 0, 0, 0, rot); disc.castShadow = false;
      mesh(new T.SphereGeometry(0.04, 8, 8), new T.MeshBasicMaterial({ color: q[1] < 0 ? 0xff4d4d : 0x3ddc97 }), q[0] * 0.78, -0.08, q[1] * 0.78, drone);   // nav lights
      rotors.push(rot);
    });
    [-0.3, 0.3].forEach(function (x) { mesh(new T.CylinderGeometry(0.03, 0.03, 0.3, 6), MAT.dark, x, -0.22, 0, drone); mesh(new T.BoxGeometry(0.06, 0.03, 0.6), MAT.dark, x, -0.36, 0, drone); });
    var cone = mesh(new T.CircleGeometry(5.5, 28, Math.PI / 2 - 0.55, 1.1), MAT.cone, 0, -0.1, 0, drone); cone.rotation.x = -Math.PI / 2; cone.rotation.z = Math.PI; cone.castShadow = false;
    drone.position.set(12, 2.5, -4); drone.visible = false;

    /* ---------- forest (SLAM): layered conifers ---------- */
    var forest = new T.Group(); scene.add(forest); forest.visible = false;
    var trees = [], seedN = 11;
    function rnd() { seedN = (seedN * 1664525 + 1013904223) >>> 0; return seedN / 4294967296; }
    for (var ti = 0; ti < 46; ti++) {
      var tx = -11 + rnd() * 22, tz = -26 + rnd() * 24;
      if (Math.abs(tx) < 1.3) continue;
      var g = new T.Group(); g.position.set(tx, 0, tz); g.rotation.y = rnd() * 6.283; forest.add(g);
      var hgt = 2 + rnd() * 1.6;
      mesh(new T.CylinderGeometry(0.1, 0.2, 1.3, 7), MAT.trunk, 0, 0.65, 0, g);
      var crown = new T.Group(); crown.position.y = 1.0; g.add(crown);
      var m0 = MAT.unseen.clone();
      for (var ly = 0; ly < 3; ly++) mesh(new T.ConeGeometry((0.9 - ly * 0.22) * (0.8 + rnd() * 0.4), hgt * 0.55, 8), m0, 0, ly * hgt * 0.3, 0, crown);
      trees.push({ g: g, crown: crown, mat: m0, seen: false });
    }

    /* ---------- PID target ---------- */
    var target = mesh(new T.RingGeometry(0.75, 0.9, 32), MAT.target, 0, 3, 0); target.rotation.x = -Math.PI / 2; target.visible = false; target.castShadow = false;
    var pid = { alt: 2.5, vel: 0, goal: 3, integ: 0, nextSwitch: 0 };

    /* ---------- actor: rocket (hull, nose, fins, nozzle, flame + glow) ---------- */
    var ship = new T.Group(); scene.add(ship); ship.visible = false;
    var hullMat = K.std(0xf2f4f7, 0.3, 0.15, { map: K.metalTex("#eef0f4") });
    mesh(new T.CylinderGeometry(0.34, 0.4, 1.7, 24), hullMat, 0, 0.85, 0, ship);
    mesh(new T.CylinderGeometry(0.34, 0.34, 0.08, 24), MAT.orange, 0, 1.2, 0, ship);                   // stripe
    mesh(new T.SphereGeometry(0.34, 24, 12, 0, 6.283, 0, 1.2), MAT.orange, 0, 1.7, 0, ship);         // domed nose
    mesh(new T.CylinderGeometry(0.12, 0.26, 0.55, 20), MAT.orange, 0, 2.2, 0, ship);
    mesh(new T.CircleGeometry(0.1, 16), MAT.glass, 0, 1.3, 0.35, ship).rotation.y = 0;                 // porthole
    for (var fi = 0; fi < 3; fi++) { var fin = mesh(K.rounded(0.08, 0.7, 0.55, 0.03), MAT.orange, 0, 0.25, 0, ship); fin.position.set(Math.sin(fi * 2.094) * 0.5, 0.3, Math.cos(fi * 2.094) * 0.5); fin.rotation.y = fi * 2.094; fin.rotation.x = -0.25; }
    mesh(new T.CylinderGeometry(0.22, 0.3, 0.3, 20), MAT.metal, 0, -0.12, 0, ship);                   // nozzle
    var flame = mesh(new T.ConeGeometry(0.22, 1.3, 14), MAT.flame, 0, -0.9, 0, ship); flame.rotation.x = Math.PI; flame.castShadow = false;
    var flameCore = mesh(new T.ConeGeometry(0.1, 0.9, 10), new T.MeshBasicMaterial({ color: 0xfff1c2 }), 0, -0.7, 0, ship); flameCore.rotation.x = Math.PI; flameCore.castShadow = false;
    var flameGlow = K.sprite(K.glowTex("rgba(255,180,80,1)"), 0xffffff, 3.2); flameGlow.position.set(0, -0.9, 0); ship.add(flameGlow);

    /* ---------- cloud deck the rocket climbs through ---------- */
    var cloudDeck = new T.Group(); scene.add(cloudDeck); cloudDeck.visible = false;
    var puffTex = K.glowTex("rgba(255,255,255,1)");
    seedN = 77;
    for (var ci = 0; ci < 26; ci++) {
      var puff = K.sprite(puffTex, 0xffffff, 6 + rnd() * 10); puff.material.blending = T.NormalBlending; puff.material.opacity = 0.75;
      puff.position.set(-18 + rnd() * 36, 14 + rnd() * 16, -22 + rnd() * 30); cloudDeck.add(puff);
    }

    /* ---------- asteroid field ---------- */
    var ORBIT_Y = 70;
    var rocks = new T.Group(); scene.add(rocks); rocks.visible = false;
    var rockList = [], rockMat = K.std(0x7f8794, 0.95, 0.05, { flatShading: true });
    seedN = 29;
    for (var ri = 0; ri < 14; ri++) {
      var rg = new T.IcosahedronGeometry(0.5 + rnd() * 0.5, 1), pos = rg.attributes.position;
      for (var vi = 0; vi < pos.count; vi++) { var sc = 0.8 + rnd() * 0.4; pos.setXYZ(vi, pos.getX(vi) * sc, pos.getY(vi) * sc, pos.getZ(vi) * sc); }   // lumpy
      rg.computeVertexNormals();
      var rm = mesh(rg, rockMat, -6 + rnd() * 12, ORBIT_Y + 1.5 + ri * 1.9, -10 + rnd() * 8, rocks);
      rm.rotation.set(rnd() * 3, rnd() * 3, 0);
      rockList.push({ m: rm, vx: (rnd() - 0.5) * 0.9, vz: (rnd() - 0.5) * 0.5, spin: (rnd() - 0.5) * 1.2, x0: rm.position.x, z0: rm.position.z });
    }
    var landing = mesh(new T.RingGeometry(0.8, 1.0, 32), MAT.target, 0, 0, 0); landing.rotation.x = -Math.PI / 2; landing.visible = false; landing.castShadow = false;
    var hop = { on: null, from: new T.Vector3(), to: new T.Vector3(), t: 1, idx: -1, timer: 0, count: 0 };

    /* ---------- solar system ---------- */
    var solar = new T.Group(); scene.add(solar); solar.visible = false; solar.position.set(-10, ORBIT_Y + 2, -6);
    var sunM = mesh(new T.SphereGeometry(2.2, 32, 32), new T.MeshBasicMaterial({ color: 0xffd166 }), 0, 0, 0, solar); sunM.castShadow = false;
    var sunGlow = K.sprite(K.glowTex("rgba(255,210,100,1)"), 0xffffff, 12); solar.add(sunGlow);
    var sunLight = new T.PointLight(0xffe0a0, 1.6, 160); solar.add(sunLight);
    var planets = [];
    [[5, 0.45, 0x74c0fc, 1.0], [8.5, 0.7, 0xe599f7, 0.6], [12.5, 0.55, 0x63e6be, 0.42], [17, 1.1, 0xff8a5b, 0.3]].forEach(function (pl, i) {
      var ring = mesh(new T.RingGeometry(pl[0] - 0.02, pl[0] + 0.02, 128), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: T.DoubleSide }), 0, 0, 0, solar); ring.rotation.x = -Math.PI / 2; ring.castShadow = false;
      var pm = mesh(new T.SphereGeometry(pl[1], 24, 24), K.std(pl[2], 0.7, 0.05), pl[0], 0, 0, solar);
      if (i === 3) { var pr = mesh(new T.RingGeometry(pl[1] * 1.4, pl[1] * 2.1, 48), new T.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.5, side: T.DoubleSide }), 0, 0, 0, pm); pr.rotation.x = -Math.PI / 2 + 0.3; }
      planets.push({ m: pm, r: pl[0], w: pl[3], a: Math.random() * 6.28 });
    });
    var NP = 2400, pGeo = new T.BufferGeometry(), pPos = new Float32Array(NP * 3), pStart = new Float32Array(NP * 3), pRing = new Float32Array(NP * 3);
    for (var pi = 0; pi < NP; pi++) {
      var a = Math.random() * 6.283, rr = 3 + Math.random() * 16;
      pStart[pi * 3] = Math.cos(a) * rr; pStart[pi * 3 + 1] = (Math.random() - 0.5) * 0.3; pStart[pi * 3 + 2] = Math.sin(a) * rr;
      var ra = Math.random() * 6.283, rrr = 10 + (Math.random() - 0.5) * 0.9;
      pRing[pi * 3] = Math.cos(ra) * rrr; pRing[pi * 3 + 1] = pStart[pi * 3 + 1]; pRing[pi * 3 + 2] = Math.sin(ra) * rrr;
    }
    pGeo.setAttribute("position", new T.Float32BufferAttribute(pPos, 3));
    var particles = new T.Points(pGeo, new T.PointsMaterial({ color: 0x7cc4ff, size: 0.22, map: K.starTex(), transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending })); solar.add(particles);

    return {
      MAT: MAT, ground: ground, floor: floor, shelves: shelves, stars: stars,
      robot: robot, head: head, armL: armL, armR: armR, crate: crate,
      drone: drone, rotors: rotors, cone: cone,
      forest: forest, trees: trees, target: target, pid: pid,
      ship: ship, flame: flame, flameCore: flameCore, flameGlow: flameGlow, ORBIT_Y: ORBIT_Y,
      cloudDeck: cloudDeck, rocks: rocks, rockList: rockList, landing: landing, hop: hop,
      solar: solar, sunGlow: sunGlow, sunLight: sunLight, planets: planets,
      particles: particles, pGeo: pGeo, pStart: pStart, pRing: pRing, NP: NP,
    };
  }
  return { build: build };
})();
