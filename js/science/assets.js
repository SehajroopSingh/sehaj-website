/* ============================================================
   Science journey · ASSETS (Three.js r128 + js/three-kit.js)
   ------------------------------------------------------------
   Builds every mesh for the science world and returns them by
   name. Nothing here moves: all motion and timing lives in
   js/science/scenes.js (numbers in js/timing.js).

     SciAssets.build(scene, T, K) → { neural, neurons, axons, spikes,
       dna, brain, brainMat, earth, surface, hero, heroMatList, crowd,
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

    /* ---------- neurons: somas with dendritic trees, tube axons, glowing spikes ---------- */
    var neural = new T.Group(); scene.add(neural);
    var somaMat = K.std(0x8fb3ff, 0.45, 0.05, { emissive: 0x1b2a6b, emissiveIntensity: 0.6 });
    var axonMat = K.std(0x6f8fe0, 0.6, 0.1, { emissive: 0x15245c, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 });
    var neurons = [], axons = [];
    function branch(from, dir, len, depth, parent) {
      var end = from.clone().addScaledVector(dir, len);
      var tube = new T.TubeGeometry(new T.LineCurve3(from, end), 1, 0.018 * (depth + 1), 5, false);
      mesh(tube, axonMat, 0, 0, 0, parent).castShadow = false;
      if (depth > 0) for (var b = 0; b < 2; b++) { var nd = dir.clone().add(new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.1)).normalize(); branch(end, nd, len * 0.65, depth - 1, parent); }
    }
    for (var i = 0; i < 16; i++) {
      var p = new T.Vector3(-7 + rnd() * 14, -3.5 + rnd() * 7, -3 + rnd() * 6);
      var soma = mesh(new T.SphereGeometry(0.26 + rnd() * 0.14, 20, 20), somaMat.clone(), p.x, p.y, p.z, neural); soma.scale.set(1, 0.85 + rnd() * 0.3, 1);
      for (var d = 0; d < 4; d++) branch(p, new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), 0.55 + rnd() * 0.4, 2, neural);
      var halo = K.sprite(K.glowTex("rgba(140,170,255,1)"), 0xffffff, 1.4); halo.position.copy(p); neural.add(halo);
      neurons.push({ p: p, m: soma, halo: halo });
    }
    neurons.forEach(function (n, i) {
      var targets = neurons.map(function (o, j) { return { j: j, d: n.p.distanceTo(o.p) }; }).filter(function (t) { return t.j !== i; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 2);
      targets.forEach(function (t) {
        var q = neurons[t.j].p, mid = n.p.clone().lerp(q, 0.5).add(new T.Vector3((rnd() - 0.5) * 2, (rnd() - 0.5) * 2, 0));
        var curve = new T.QuadraticBezierCurve3(n.p, mid, q);
        mesh(new T.TubeGeometry(curve, 24, 0.045, 6, false), axonMat, 0, 0, 0, neural).castShadow = false;
        // myelin sheaths along the axon
        for (var mk = 0.15; mk < 0.9; mk += 0.2) { var sh = mesh(new T.CylinderGeometry(0.065, 0.065, 0.22, 8), K.std(0xdfe7ff, 0.5, 0), 0, 0, 0, neural); sh.position.copy(curve.getPoint(mk)); sh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), curve.getTangent(mk)); sh.castShadow = false; }
        axons.push({ curve: curve, from: i, to: t.j });
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

    /* ---------- brain: two wrinkled hemispheres (vertex-displaced spheres), cerebellum, stem ---------- */
    var brainMat = K.std(0xe9a4b4, 0.62, 0, { emissive: 0x3a1020, emissiveIntensity: 0.12, transparent: true, opacity: 1, side: T.DoubleSide });
    var brain = new T.Group(); scene.add(brain); brain.visible = false;
    function wrinkled(radius, seg, amp, freq) {               // a sphere with sulci/gyri folded into its surface
      var g = new T.SphereGeometry(radius, seg, Math.round(seg * 0.7)), pos = g.attributes.position, v = new T.Vector3();
      for (var i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); var n = v.clone().normalize();
        var th = Math.atan2(n.z, n.x), ph = Math.acos(n.y);
        var ridge = Math.sin(th * freq + Math.sin(ph * 3.1) * 2.2) * Math.sin(ph * freq * 0.8 + Math.cos(th * 2.3) * 1.7);
        var fine = Math.sin(th * freq * 2.7 + ph * 5.1) * Math.sin(ph * freq * 1.9 - th * 1.3) * 0.35;
        var d = amp * (0.55 + 0.45 * Math.abs(ridge)) * (ridge > 0 ? 1 : 0.35) + amp * fine;
        v.addScaledVector(n, d); pos.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals(); return g;
    }
    for (var b = 0; b < 2; b++) {
      var hemiB = mesh(wrinkled(1.18, 96, 0.075, 9), brainMat, (b ? 1 : -1) * 0.62, 0, 0, brain); hemiB.scale.set(0.78, 1, 1.32); hemiB.rotation.y = (b ? -1 : 1) * 0.08;
    }
    mesh(new T.BoxGeometry(0.05, 1.6, 2.6), K.std(0x9c5a6c, 0.8, 0), 0, 0.1, 0, brain).castShadow = false;   // the fissure between them
    var cereb = mesh(wrinkled(0.52, 48, 0.03, 14), brainMat, 0, -0.95, -0.75, brain); cereb.scale.set(1.5, 0.7, 1);
    mesh(new T.CylinderGeometry(0.2, 0.26, 1.0, 14), K.std(0xd9a0b0, 0.7, 0), 0, -1.25, -0.3, brain);          // brain stem

    /* ---------- one person, then a crowd, standing on the top of a (huge) globe ----------
       Everything below lives inside the earth group so one continuous camera pull-back
       (and one scale change of the earth) carries neurons → brain → head → crowd → globe. */
    var LAND_Y = -13.25, E0 = 30, EY = LAND_Y - 10;        // feet level; the earth starts 30× bigger than in the data scene
    var earth = new T.Group(); scene.add(earth); earth.visible = false;
    var surface = new T.Group(); surface.position.set(0, 10, 0); surface.scale.setScalar(1 / E0); earth.add(surface);
    var HS = 5.3;                                            // hero scale: a crowd head (r .36) becomes the big head (r 1.9)
    function personMats(shirt, transparent) { var ex = transparent ? { transparent: true, opacity: 0.001 } : {}; return { shirt: K.std(shirt, 0.9, 0, ex), skin: K.std(0xd9a784, 0.7, 0, ex), hair: K.std(0x2a1d14, 0.9, 0, ex), pants: K.std(0x22283a, 0.9, 0, ex), eye: K.std(0x1a1410, 0.3, 0, ex) }; }
    function buildPerson(m, hair) {                          // feet at y=0, head centre at y=2.5
      var g = new T.Group();
      mesh(new T.CylinderGeometry(0.2, 0.22, 1.0, 8), m.pants, -0.2, 0.5, 0, g); mesh(new T.CylinderGeometry(0.2, 0.22, 1.0, 8), m.pants, 0.2, 0.5, 0, g);
      mesh(K.rounded(0.72, 1.1, 0.42, 0.16), m.shirt, 0, 1.55, 0, g);
      mesh(new T.CylinderGeometry(0.1, 0.09, 0.95, 8), m.shirt, -0.46, 1.5, 0, g).rotation.z = 0.1; mesh(new T.CylinderGeometry(0.1, 0.09, 0.95, 8), m.shirt, 0.46, 1.5, 0, g).rotation.z = -0.1;
      mesh(new T.SphereGeometry(0.07, 8, 8), m.skin, -0.46, 1.0, 0, g); mesh(new T.SphereGeometry(0.07, 8, 8), m.skin, 0.46, 1.0, 0, g);   // hands
      mesh(new T.CylinderGeometry(0.12, 0.14, 0.3, 10), m.skin, 0, 2.1, 0, g);                       // neck
      mesh(new T.SphereGeometry(0.36, 16, 16), m.skin, 0, 2.5, 0, g);
      mesh(new T.SphereGeometry(0.06, 8, 8), m.skin, 0, 2.46, 0.35, g);                              // nose
      [-1, 1].forEach(function (sx) { mesh(new T.SphereGeometry(0.035, 8, 8), m.eye, sx * 0.12, 2.55, 0.33, g); });   // eyes
      [-1, 1].forEach(function (sx) { mesh(new T.SphereGeometry(0.07, 8, 8), m.skin, sx * 0.36, 2.5, 0, g).scale.set(0.5, 1, 0.8); });
      if (hair) mesh(new T.SphereGeometry(0.38, 16, 16, 0, 6.283, 0, 1.3), m.hair, 0, 2.56, 0, g);
      return g;
    }
    var heroMats = personMats(0x3a4a6b, true), heroMatList = [heroMats.shirt, heroMats.skin, heroMats.hair, heroMats.pants, heroMats.eye];
    var hero = buildPerson(heroMats, true); hero.scale.setScalar(HS); hero.position.y = 0; hero.renderOrder = 2; surface.add(hero);
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
      dna: dna, brain: brain, brainMat: brainMat,
      earth: earth, surface: surface, hero: hero, heroMatList: heroMatList, crowd: crowd, crowdMatList: crowdMatList,
      land: land, landMat: landMat, globe: globe, clouds: clouds, atmo: atmo, folk: folk, folkMatList: folkMatList,
      stars: stars, points: points, pGeo: pGeo, pFrom: pFrom, pTo: pTo, NP: NP, frame: frame, frameMats: frameMats,
      LAND_Y: LAND_Y, E0: E0, EY: EY, rnd: rnd,
    };
  }
  return { build: build };
})();
