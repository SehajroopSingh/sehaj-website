/* ============================================================
   Science journey · ASSETS (Three.js r128 + js/three-kit.js)
   ------------------------------------------------------------
   Builds every mesh for the science world and returns them by
   name. Nothing here moves: all motion and timing lives in
   js/science/scenes.js (numbers in js/timing.js).

     SciAssets.build(scene, T, K) → { neural, neurons, axons, spikes,
       dna, brain, brainMat, brainMats, heroHead, heroHeadMats, heroBodyMats, earth, surface, hero, heroMatList, crowd,
       crowdMatList, land, landMat, globe, clouds, atmo, folk,
       folkMatList, stars, points, pGeo, pFrom, pTo, NP, frame,
       LAND_Y, E0, EY, rnd }

   Sections: neurons · DNA · brain · person & crowd on the globe ·
   earth · little people all over the globe · data points & frame
   ============================================================ */
window.SciAssets = (function () {
  "use strict";
  function build(scene, T, K) {
    function mesh(g, m, x, y, z, parent) { return K.mesh(g, m, x, y, z, parent || scene); }
    var seed = 17; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var glowStar = K.starTex();

    /* ---------- neurons: smooth somas, a few short dendrites, clean axons between them, glowing spikes ---------- */
    var neural = new T.Group(); scene.add(neural);
    var somaMat = K.std(0x5f86e6, 0.55, 0.05, { emissive: 0x1a2c6e, emissiveIntensity: 0.5 });
    var axonMat = K.std(0x6a8ee8, 0.55, 0.1, { emissive: 0x16266a, emissiveIntensity: 0.45, transparent: true, opacity: 0.9 });
    var neurons = [], axons = [], UPV = new T.Vector3(0, 1, 0);
    var pts = [];                                            // somas on a loosely jittered, staggered grid: spread out, never crowding, never a lattice
    for (var gy = 0; gy < 3; gy++) for (var gx = 0; gx < 4; gx++) {
      if ((gy === 0 && gx === 3) || (gy === 2 && gx === 0)) continue;
      pts.push(new T.Vector3(-6.2 + gx * 4.1 + (gy % 2) * 1.6 + (rnd() - 0.5) * 2.6, -2.9 + gy * 2.9 + (rnd() - 0.5) * 1.8, -2 + rnd() * 4));
    }
    function dendrite(p, dir, r, len) {                      // a short, gently curved, tapering dendrite that forks once at the tip
      var side = new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(dir).normalize().multiplyScalar(len * 0.25);
      var p0 = p.clone().addScaledVector(dir, r * 0.75), p2 = p0.clone().addScaledVector(dir, len), curve = new T.QuadraticBezierCurve3(p0, p0.clone().lerp(p2, 0.5).add(side), p2);
      for (var k = 0; k < 4; k++) {
        var a0 = curve.getPoint(k / 4), a1 = curve.getPoint((k + 1) / 4), rb = r * 0.3 * (1 - k / 4) + 0.025, rt = r * 0.3 * (1 - (k + 1) / 4) + 0.025;
        var seg = mesh(new T.CylinderGeometry(rt, rb, a0.distanceTo(a1) * 1.04, 8), somaMat, 0, 0, 0, neural);
        seg.position.copy(a0).lerp(a1, 0.5); seg.quaternion.setFromUnitVectors(UPV, a1.clone().sub(a0).normalize()); seg.castShadow = false;
      }
      var tip = curve.getTangent(1);                         // the fork: two tiny twigs
      [-1, 1].forEach(function (sg) {
        var td = tip.clone().addScaledVector(side.clone().normalize(), sg * 0.9).normalize(), tw = mesh(new T.CylinderGeometry(0.012, 0.03, 0.28, 6), somaMat, 0, 0, 0, neural);
        tw.position.copy(p2).addScaledVector(td, 0.13); tw.quaternion.setFromUnitVectors(UPV, td); tw.castShadow = false;
      });
    }
    pts.forEach(function (p) {
      var r = 0.3 + rnd() * 0.1;
      var soma = mesh(new T.SphereGeometry(r, 24, 24), somaMat.clone(), p.x, p.y, p.z, neural);
      var a0 = rnd() * 6.283;
      for (var d = 0; d < 3; d++) {                          // three dendrites, spread evenly around the soma
        var ang = a0 + d * 2.094 + (rnd() - 0.5) * 0.6, dir = new T.Vector3(Math.cos(ang), Math.sin(ang), (rnd() - 0.5) * 0.5).normalize();
        dendrite(p, dir, r, 0.7 + rnd() * 0.3);
      }
      var halo = K.sprite(K.glowTex("rgba(140,170,255,1)"), 0xffffff, 1.5); halo.position.copy(p); neural.add(halo);
      neurons.push({ p: p, m: soma, halo: halo });
    });
    var linked = {};
    neurons.forEach(function (n, i) {                        // each soma reaches its two nearest neighbours with one smooth axon
      var targets = neurons.map(function (o, j) { return { j: j, d: n.p.distanceTo(o.p) }; }).filter(function (t) { return t.j !== i; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 2);
      targets.forEach(function (t) {
        var key = Math.min(i, t.j) + "-" + Math.max(i, t.j); if (linked[key]) return; linked[key] = true;
        var q = neurons[t.j].p, mid = n.p.clone().lerp(q, 0.5).add(new T.Vector3((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 0.6));
        var curve = new T.QuadraticBezierCurve3(n.p, mid, q);
        mesh(new T.TubeGeometry(curve, 32, 0.04, 8, false), axonMat, 0, 0, 0, neural).castShadow = false;
        axons.push({ curve: curve, from: i, to: t.j }); axons.push({ curve: new T.QuadraticBezierCurve3(q, mid, n.p), from: t.j, to: i });
      });
    });
    var spikes = [];
    for (var s = 0; s < 10; s++) { var sg = new T.Group(); neural.add(sg); mesh(new T.SphereGeometry(0.09, 10, 10), new T.MeshBasicMaterial({ color: 0xfff1b8 }), 0, 0, 0, sg).castShadow = false; sg.add(K.sprite(K.glowTex("rgba(255,209,102,1)"), 0xffffff, 0.9)); spikes.push({ m: sg, a: null, t: 0, speed: 0.6 + rnd() * 0.5 }); }

    /* ---------- DNA: smooth backbone tubes, paired bases ---------- */
    var dna = new T.Group(); scene.add(dna); dna.position.set(6.5, -1, -1);
    var baseMats = [0xff6b9a, 0x63e6be, 0x74c0fc, 0xffd166].map(function (c) { return K.std(c, 0.35, 0.1, { emissive: c, emissiveIntensity: 0.12 }); });
    var strandMat = K.std(0xe6ebf2, 0.3, 0.3);
    var helixPts = [[], []];
    for (var k = 0; k < 44; k++) {
      var y = -6 + k * 0.28, a = k * 0.42;
      helixPts[0].push(new T.Vector3(Math.cos(a) * 1.1, y, Math.sin(a) * 1.1)); helixPts[1].push(new T.Vector3(-Math.cos(a) * 1.1, y, -Math.sin(a) * 1.1));
      var pair = k % 4, r1 = mesh(new T.CylinderGeometry(0.07, 0.07, 1.0, 10), baseMats[pair], 0, 0, 0, dna), r2 = mesh(new T.CylinderGeometry(0.07, 0.07, 1.0, 10), baseMats[(pair + 2) % 4], 0, 0, 0, dna);
      r1.position.set(Math.cos(a) * 0.55, y, Math.sin(a) * 0.55); r2.position.set(-Math.cos(a) * 0.55, y, -Math.sin(a) * 0.55);
      r1.rotation.z = r2.rotation.z = Math.PI / 2; r1.rotation.y = r2.rotation.y = -a;
      mesh(new T.SphereGeometry(0.1, 8, 8), strandMat, Math.cos(a) * 1.1, y, Math.sin(a) * 1.1, dna); mesh(new T.SphereGeometry(0.1, 8, 8), strandMat, -Math.cos(a) * 1.1, y, -Math.sin(a) * 1.1, dna);
    }
    helixPts.forEach(function (pts) { mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, 0.07, 8, false), strandMat, 0, 0, 0, dna); });

    // flat 2D look: swap the 3D neurons and DNA for drawn blobs and a flat ladder (js/science/blobs.js)
    if (window.SciBlobs) window.SciBlobs({ T: T, K: K, neurons: neurons, axons: axons, spikes: spikes, neural: neural, dna: dna });

    /* ---------- brain: stylised — two smooth hemispheres with round, worm-like gyri running front to back over them,
       a dark fissure between, a ridged cerebellum and a stem. It does not turn: it sits at a slight three-quarter angle, the
       same way the head that forms around it faces. ---------- */
    var brainMat = K.std(0xb86e84, 0.65, 0, { emissive: 0x3a1020, emissiveIntensity: 0.12, transparent: true, opacity: 1, side: T.DoubleSide });   // the base (shows as the grooves)
    var gyriMat = K.std(0xdfa0b2, 0.6, 0, { emissive: 0x3a1020, emissiveIntensity: 0.12, transparent: true, opacity: 1 });                       // the ridges
    var brainMats = [brainMat, gyriMat];
    var brain = new T.Group(); scene.add(brain); brain.visible = false; brain.rotation.set(0.05, 0.6, 0);
    var AX = 0.8, AY = 1.0, AZ = 1.3, GAP = 0.42;           // hemisphere half-axes; each sits this far from the midline (they overlap, which hides the join)
    // a gyrus is a tube hugging the hemisphere's surface, running front → back and meandering; the ends tuck into the surface
    function tube(pts) { mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, 0.1, 10, false), gyriMat, 0, 0, 0, brain).castShadow = false; }
    function tuck(pts) { pts.forEach(function (q) { q.multiplyScalar(0.975); }); [0, 1, pts.length - 2, pts.length - 1].forEach(function (i, k) { pts[i].multiplyScalar(k === 0 || k === 3 ? 0.8 : 0.93); }); return pts; }   // (the tubes sit a little sunk into the surface)
    function topGyrus(sx, x0, amp, ph) {                    // over the top: an arc in the y–z plane at a sideways offset x0
      var pts = [];
      for (var i = 0; i <= 56; i++) {
        var th = -1.5 + (i / 56) * 3.0, x = Math.max(-AX * 0.985, Math.min(AX * 0.985, x0 + Math.sin(th * 3.6 + ph) * amp));
        var m = Math.sqrt(Math.max(0, 1 - (x / AX) * (x / AX)));
        pts.push(new T.Vector3(sx * (GAP + x), AY * m * Math.cos(th), AZ * m * Math.sin(th)));
      }
      tube(tuck(pts));
    }
    function sideGyrus(sx, y0, amp, ph) {                   // along the side: front → back at a height y0, bulging out to the hemisphere's surface
      var pts = [];
      for (var i = 0; i <= 56; i++) {
        var t = -0.93 + (i / 56) * 1.86, y = y0 + Math.sin(t * 5.2 + ph) * amp, ym = Math.sqrt(Math.max(0, 1 - (y / AY) * (y / AY)));
        var z = t * AZ * ym, x = AX * Math.sqrt(Math.max(0, 1 - (y / AY) * (y / AY) - (z / AZ) * (z / AZ)));
        pts.push(new T.Vector3(sx * (GAP + x), y, z));
      }
      tube(tuck(pts));
    }
    [-1, 1].forEach(function (sx) {
      var base = mesh(new T.SphereGeometry(1, 48, 32), brainMat, sx * GAP, 0, 0, brain); base.scale.set(AX * 0.985, AY * 0.985, AZ * 0.985);
      var ph = rnd() * 6.283;
      [-0.3, -0.05, 0.2, 0.44].forEach(function (x0, k) { topGyrus(sx, x0, 0.08, ph + k * 0.45); });        // from the midline out over the top
      [0.5, 0.24, -0.02, -0.28, -0.52].forEach(function (y0, k) { sideGyrus(sx, y0, 0.05, ph + 1.1 + k * 0.45); }); // and down the side
    });
    var fissure = mesh(new T.SphereGeometry(1, 24, 16), K.std(0x5e2636, 0.85, 0, { transparent: true, opacity: 1 }), 0, 0, 0, brain); fissure.scale.set(0.012, 0.87, 1.13); fissure.castShadow = false;   // the dark fissure line: a thin disc that just shows along the join
    var cereb = mesh(new T.SphereGeometry(0.5, 32, 24), brainMat, 0, -0.9, -0.72, brain); cereb.scale.set(1.55, 0.72, 1);   // cerebellum, with fine horizontal folia
    for (var fl = -0.22; fl <= 0.24; fl += 0.11) { var q = Math.sqrt(Math.max(0.05, 1 - (fl / 0.36) * (fl / 0.36))), ring = mesh(new T.TorusGeometry(0.5, 0.03, 8, 40), gyriMat, 0, -0.9 + fl, -0.72, brain); ring.rotation.x = Math.PI / 2; ring.scale.set(1.5 * q, 1 * q, 1); ring.castShadow = false; }
    mesh(new T.CylinderGeometry(0.2, 0.26, 1.0, 14), brainMat, 0, -1.2, -0.3, brain);          // brain stem
    brain.traverse(function (o) { if (o.isMesh) o.renderOrder = 1; });   // drawn before the (translucent) head that forms around it, so the head fades over it instead of hiding it

    /* ---------- one person, then a crowd, standing on the top of a (huge) globe ----------
       Everything below lives inside the earth group so one continuous camera pull-back
       (and one scale change of the earth) carries neurons → brain → head → crowd → globe. */
    var LAND_Y = -13.25, E0 = 30, EY = LAND_Y - 10;        // feet level; the earth starts 30× bigger than in the data scene
    var earth = new T.Group(); scene.add(earth); earth.visible = false;
    var surface = new T.Group(); surface.position.set(0, 10, 0); surface.scale.setScalar(1 / E0); earth.add(surface);
    var HS = 5.3;                                            // hero scale: a crowd head (r .36) becomes the big head (r 1.9)
    function personMats(shirt, transparent) { var ex = transparent ? { transparent: true, opacity: 0.001 } : {}; return { shirt: K.std(shirt, 0.9, 0, ex), skin: K.std(0xd9a784, 0.7, 0, ex), hair: K.std(0x2a1d14, 0.9, 0, ex), pants: K.std(0x22283a, 0.9, 0, ex), eye: K.std(0x1a1410, 0.3, 0, ex) }; }
    function buildPerson(m, hair) {                          // feet at y=0, head centre at y=2.5 (the head is its own group, g.userData.head)
      var g = new T.Group(), head = new T.Group(); head.position.set(0, 2.5, 0); g.add(head); g.userData.head = head;
      mesh(new T.CylinderGeometry(0.2, 0.22, 1.0, 8), m.pants, -0.2, 0.5, 0, g); mesh(new T.CylinderGeometry(0.2, 0.22, 1.0, 8), m.pants, 0.2, 0.5, 0, g);
      mesh(K.rounded(0.72, 1.1, 0.42, 0.16), m.shirt, 0, 1.55, 0, g);
      mesh(new T.CylinderGeometry(0.1, 0.09, 0.95, 8), m.shirt, -0.46, 1.5, 0, g).rotation.z = 0.1; mesh(new T.CylinderGeometry(0.1, 0.09, 0.95, 8), m.shirt, 0.46, 1.5, 0, g).rotation.z = -0.1;
      mesh(new T.SphereGeometry(0.07, 8, 8), m.skin, -0.46, 1.0, 0, g); mesh(new T.SphereGeometry(0.07, 8, 8), m.skin, 0.46, 1.0, 0, g);   // hands
      mesh(new T.CylinderGeometry(0.12, 0.14, 0.3, 10), m.skin, 0, 2.1, 0, g);                       // neck
      mesh(new T.SphereGeometry(0.36, 24, 24), m.skin, 0, 0, 0, head);
      mesh(new T.SphereGeometry(0.06, 8, 8), m.skin, 0, -0.04, 0.35, head);                           // nose
      [-1, 1].forEach(function (sx) { mesh(new T.SphereGeometry(0.035, 8, 8), m.eye, sx * 0.12, 0.05, 0.33, head); });   // eyes
      [-1, 1].forEach(function (sx) { mesh(new T.SphereGeometry(0.07, 8, 8), m.skin, sx * 0.36, 0, 0, head).scale.set(0.5, 1, 0.8); });
      if (hair) mesh(new T.SphereGeometry(0.38, 24, 24, 0, 6.283, 0, 1.3), m.hair, 0, 0.06, 0, head);
      return g;
    }
    var heroMats = personMats(0x3a4a6b, true), heroMatList = [heroMats.shirt, heroMats.skin, heroMats.hair, heroMats.pants, heroMats.eye];
    var hero = buildPerson(heroMats, true); hero.scale.setScalar(HS); hero.position.y = 0; surface.add(hero);
    hero.traverse(function (o) { if (o.isMesh) o.renderOrder = 2; });   // (after the brain — see above)
    var heroHead = hero.userData.head, heroHeadMats = [heroMats.skin, heroMats.hair, heroMats.eye], heroBodyMats = [heroMats.shirt, heroMats.pants];
    var crowd = new T.Group(); surface.add(crowd);
    var shirtCols = [0x3a4a6b, 0x8a3a3a, 0x2f6b4a, 0x5b4a8a, 0x8a6a2a, 0xe6ebf2];
    var crowdMatSets = shirtCols.map(function (c) { return personMats(c, true); }), crowdMatList = [];
    crowdMatSets.forEach(function (m) { crowdMatList.push(m.shirt, m.skin, m.hair, m.pants, m.eye); });
    var R0 = 10 * E0;                                        // the globe's radius in surface units
    for (var c = 0; c < 170; c++) {
      var ang = rnd() * 6.283, rad = 14 + Math.sqrt(rnd()) * 150, px = Math.cos(ang) * rad, pz = Math.sin(ang) * rad;
      var g = buildPerson(crowdMatSets[c % crowdMatSets.length], c % 3 !== 0); g.scale.setScalar(HS * (0.9 + rnd() * 0.2));
      var yy = Math.sqrt(R0 * R0 - px * px - pz * pz) - R0;  // stand on the sphere, feet on the curve
      g.position.set(px, yy, pz); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(px, R0 + yy, pz).normalize()); g.rotateY(rnd() * 6.283);
      crowd.add(g);
    }
    var landMat = K.std(0x6f9a5a, 1, 0, { map: K.grassTex(), transparent: true, opacity: 0.001 }); landMat.map.repeat.set(60, 60);
    var land = mesh(new T.SphereGeometry(10.02, 96, 48, 0, 6.283, 0, 0.8), landMat, 0, 0, 0, earth); land.castShadow = false;  // a grassy cap on the pole

    /* ---------- earth: textured globe, cloud layer, atmosphere rim ---------- */
    var globe = mesh(new T.SphereGeometry(10, 64, 64), K.std(0xffffff, 0.75, 0.05, { map: K.earthTex() }), 0, 0, 0, earth);
    var clouds = mesh(new T.SphereGeometry(10.18, 48, 48), new T.MeshStandardMaterial({ map: K.cloudTex(), transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 }), 0, 0, 0, earth); clouds.castShadow = false;
    var atmo = mesh(new T.SphereGeometry(10.7, 48, 48), new T.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.14, side: T.BackSide, blending: T.AdditiveBlending, depthWrite: false }), 0, 0, 0, earth); atmo.castShadow = false;
    var stars = K.stars(2000, 150, 250); stars.material.opacity = 0; scene.add(stars);


    /* ---------- little people all over the globe (seen from space; the data points rise off their heads) ---------- */
    var folk = new T.Group(); earth.add(folk); folk.visible = false;
    var folkMatSets = shirtCols.map(function (c) { return personMats(c, true); }), folkMatList = [], folkHeads = [];
    folkMatSets.forEach(function (m) { folkMatList.push(m.shirt, m.skin, m.hair, m.pants, m.eye); });
    seed = 4242;
    for (var fk = 0; fk < 180; fk++) {
      var fth = rnd() * 6.283, fph = Math.acos(2 * rnd() - 1), fn = new T.Vector3().setFromSphericalCoords(1, fph, fth);
      var fg = buildPerson(folkMatSets[fk % folkMatSets.length], fk % 3 !== 0), fs = 0.26 + rnd() * 0.08;
      fg.scale.setScalar(fs); fg.position.copy(fn).multiplyScalar(10.02);
      fg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), fn); fg.rotateY(rnd() * 6.283); folk.add(fg);
      folkHeads.push(fn.clone().multiplyScalar(10.02 + 2.5 * fs));
    }

    /* ---------- data points → data frame ---------- */
    var NP = 900, pGeo = new T.BufferGeometry(), pPos = new Float32Array(NP * 3), pFrom = [], pTo = [], pCol = new Float32Array(NP * 3);
    var cols = [[1, 0.42, 0.6], [0.39, 0.9, 0.75], [0.45, 0.75, 0.99], [1, 0.82, 0.4]];
    var COLS = 30, ROWS = 30;
    for (var q = 0; q < NP; q++) {
      // most points start at a little person's head, the rest anywhere on the surface
      var v;
      if (q % 5 !== 4) { var fp = folkHeads[q % folkHeads.length]; v = fp.clone().multiplyScalar(10.45 / fp.length()); }
      else { var th2 = rnd() * 6.283, ph2 = Math.acos(2 * rnd() - 1); v = new T.Vector3().setFromSphericalCoords(10.3, ph2, th2); }
      pFrom.push(v);
      pTo.push(new T.Vector3(-COLS * 0.5 + (q % COLS) + 0.5, ROWS * 0.5 - Math.floor(q / COLS) - 0.5, 0).multiplyScalar(0.9));
      var cc = cols[q % 4]; pCol[q * 3] = cc[0]; pCol[q * 3 + 1] = cc[1]; pCol[q * 3 + 2] = cc[2];
    }
    pGeo.setAttribute("position", new T.Float32BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new T.Float32BufferAttribute(pCol, 3));
    var points = new T.Points(pGeo, new T.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0, map: glowStar, depthWrite: false, blending: T.AdditiveBlending })); scene.add(points);
    var frame = new T.Group(); scene.add(frame); frame.visible = false;
    var gridMat = new T.LineBasicMaterial({ color: 0x9aa4b2, transparent: true, opacity: 0.22 });
    for (var gl = 0; gl <= ROWS; gl++) { var yy = (ROWS * 0.5 - gl) * 0.9; frame.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-COLS * 0.45, yy, 0), new T.Vector3(COLS * 0.45, yy, 0)]), gridMat)); }
    for (var gc = 0; gc <= COLS; gc++) { var xx = (-COLS * 0.5 + gc) * 0.9; frame.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(xx, -ROWS * 0.45, 0), new T.Vector3(xx, ROWS * 0.45, 0)]), gridMat)); }
    var headerMat = new T.MeshBasicMaterial({ color: new T.Color(0x1b2a6b).convertSRGBToLinear(), transparent: true, opacity: 0.85 });
    mesh(new T.PlaneGeometry(COLS * 0.9, 0.9), headerMat, 0, (ROWS * 0.5 + 0.5) * 0.9, 0.01, frame);
    mesh(new T.PlaneGeometry(1.2, ROWS * 0.9), headerMat, (-COLS * 0.5 - 0.7) * 0.9, 0, 0.01, frame);
    var frameGlass = mesh(new T.PlaneGeometry(COLS * 0.9 + 2.4, ROWS * 0.9 + 1.8), new T.MeshBasicMaterial({ color: new T.Color(0x0e1422).convertSRGBToLinear(), transparent: true, opacity: 0.7 }), -0.6, 0.45, -0.05, frame); frameGlass.castShadow = false;
    var frameMats = [gridMat, headerMat, frameGlass.material]; frameMats.forEach(function (m) { m.userData.op = m.opacity; });   // (their resting opacities, for the fade-in)

    return {
      neural: neural, neurons: neurons, axons: axons, spikes: spikes,
      dna: dna, brain: brain, brainMat: brainMat, brainMats: brainMats, brain2d: window.SciBrain2D ? window.SciBrain2D(T, scene) : null,
      earth: earth, surface: surface, hero: hero, heroMatList: heroMatList, heroHead: heroHead, heroHeadMats: heroHeadMats, heroBodyMats: heroBodyMats, crowd: crowd, crowdMatList: crowdMatList,
      land: land, landMat: landMat, globe: globe, clouds: clouds, atmo: atmo, folk: folk, folkMatList: folkMatList,
      stars: stars, points: points, pGeo: pGeo, pFrom: pFrom, pTo: pTo, NP: NP, frame: frame, frameMats: frameMats,
      LAND_Y: LAND_Y, E0: E0, EY: EY, rnd: rnd,
    };
  }
  return { build: build };
})();
