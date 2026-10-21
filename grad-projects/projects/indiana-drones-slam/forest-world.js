/* ============================================================
   The true world: trees, the real drone, noisy sensing/motion.
   Coordinates are meters relative to where the drone landed.
   ============================================================ */
(function (A) {
  const BOUNDS = { x0: -2, x1: 16, y0: -6.75, y1: 6.75 };

  class ForestWorld {
    constructor() {
      this.bounds = BOUNDS;
      this.horizon = 3.5;       // sensing range (m)
      this.distNoise = 0.06;    // sensor noise
      this.bearingNoise = 0.02;
      this.moveBias = 1.06;     // the drone overshoots 6% on every move
      this.moveNoise = 0.05;
      this.turnNoise = 0.003;
      this.drone = { x: 0, y: 0, h: 0 };
      this.treasure = { x: A.rand(12, 14.5), y: A.rand(-4, 4) };
      this.trees = [];
      let id = 0, tries = 0;
      while (this.trees.length < 34 && tries++ < 3000) {
        const t = { id: "T" + id, x: A.rand(BOUNDS.x0 + 0.5, BOUNDS.x1 - 0.5), y: A.rand(BOUNDS.y0 + 0.5, BOUNDS.y1 - 0.5), r: A.rand(0.25, 0.6) };
        if (Math.hypot(t.x, t.y) < 1.8) continue;
        if (Math.hypot(t.x - this.treasure.x, t.y - this.treasure.y) < 1.4) continue;
        if (this.trees.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < o.r + t.r + 0.9)) continue;
        this.trees.push(t);
        id++;
      }
    }

    // Distance/bearing to every tree within the horizon.
    sense() {
      const out = {};
      const d = this.drone;
      for (const t of this.trees) {
        const dist = Math.hypot(t.x - d.x, t.y - d.y);
        if (dist > this.horizon) continue;
        out[t.id] = {
          distance: dist + A.randn() * this.distNoise,
          bearing: A.wrapAngle(Math.atan2(t.y - d.y, t.x - d.x) - d.h + A.randn() * this.bearingNoise),
          radius: t.r,
        };
      }
      return out;
    }

    // Turn, then move forward. Execution is imperfect.
    move(distance, steering) {
      const d = this.drone;
      d.h = A.wrapAngle(d.h + steering + A.randn() * this.turnNoise);
      const actual = distance * this.moveBias * (1 + A.randn() * this.moveNoise);
      d.x += actual * Math.cos(d.h);
      d.y += actual * Math.sin(d.h);
    }

    crashed() {
      return this.trees.some((t) => Math.hypot(t.x - this.drone.x, t.y - this.drone.y) < t.r + 0.1);
    }
  }

  A.ForestWorld = ForestWorld;
})(window.AI4R);
