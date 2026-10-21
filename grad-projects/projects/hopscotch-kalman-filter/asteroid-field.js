/* ============================================================
   Asteroid field: rocks drift with constant acceleration.
   World is WIDTH x 1, with y pointing up.
   ============================================================ */
(function (A) {
  const WIDTH = 4 / 3;
  let nextId = 1;

  function makeRockShape() {
    const pts = [];
    const n = 9;
    for (let i = 0; i < n; i++) pts.push(0.7 + Math.random() * 0.35);
    return pts;
  }

  class AsteroidField {
    constructor(measNoise) {
      this.width = WIDTH;
      this.measNoise = measNoise;
      this.rocks = [];
      for (let i = 0; i < 34; i++) this.spawn(true);
    }

    spawn(anywhere) {
      const fromLeft = Math.random() < 0.5;
      const rock = {
        id: nextId++,
        x: anywhere ? A.rand(0, WIDTH) : fromLeft ? -0.04 : WIDTH + 0.04,
        y: A.rand(0.06, 0.95),
        vx: (fromLeft ? 1 : -1) * A.rand(0.003, 0.009),
        vy: A.rand(-0.0015, 0.003),
        ax: A.randn() * 0.00003,
        ay: A.rand(-0.00006, 0.00004),
        shape: makeRockShape(),
        spin: A.rand(0, 6.28),
      };
      if (anywhere && Math.random() < 0.5) rock.vx *= -1;
      this.rocks.push(rock);
    }

    // Advance true motion one step; recycle rocks that leave the screen.
    step() {
      for (const r of this.rocks) {
        r.x += r.vx + r.ax / 2;
        r.y += r.vy + r.ay / 2;
        r.vx += r.ax;
        r.vy += r.ay;
        r.spin += 0.02;
      }
      this.rocks = this.rocks.filter((r) => this.inBounds(r, 0.06));
      while (this.rocks.length < 34) this.spawn(false);
    }

    inBounds(p, margin) {
      const m = margin || 0;
      return p.x > -m && p.x < WIDTH + m && p.y > -m && p.y < 1 + m;
    }

    // Noisy observations {id: [x, y]}
    observe() {
      const obs = {};
      for (const r of this.rocks)
        obs[r.id] = [r.x + A.randn() * this.measNoise, r.y + A.randn() * this.measNoise];
      return obs;
    }

    byId(id) { return this.rocks.find((r) => r.id === id); }
  }

  A.AsteroidField = AsteroidField;
})(window.AI4R);
