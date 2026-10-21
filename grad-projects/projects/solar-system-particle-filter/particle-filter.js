/* ============================================================
   Particle filter: localize a satellite from gravity readings.
   Loop each step: weigh -> resample -> fuzz -> move -> estimate
   ============================================================ */
(function (A) {
  class ParticleFilter {
    constructor(opts) {
      this.n = opts.count;          // particle count (shrinks over time)
      this.minCount = opts.minCount || 400;
      this.extent = opts.extent;    // particles start uniformly in [-extent, extent]
      this.sigma = opts.sigma;      // measurement noise used for weighting (log space)
      this.fuzz = opts.fuzz;        // roughening noise after resampling
      this.step = 0;
      this.particles = [];
      for (let i = 0; i < this.n; i++) {
        const x = A.rand(-this.extent, this.extent);
        const y = A.rand(-this.extent, this.extent);
        this.particles.push({ x, y, h: Math.atan2(y, x) + Math.PI / 2, w: 1 });
      }
    }

    // 1) Weigh: how well does each particle explain the gravity reading?
    weigh(measuredLogG, system) {
      let total = 0;
      for (const p of this.particles) {
        const expected = Math.log(system.gravityAt(p.x, p.y));
        const err = measuredLogG - expected;
        p.w = Math.exp(-(err * err) / (2 * this.sigma * this.sigma)) + 1e-300;
        total += p.w;
      }
      for (const p of this.particles) p.w /= total;
    }

    // 2) Resample with the low-variance (systematic) method.
    //    Population shrinks quickly early on, then more gently.
    resample() {
      const keepFrac = this.step < 4 ? 0.5 : 0.8;
      const next = Math.max(this.minCount, Math.round(this.n * keepFrac));
      const out = [];
      const stepSize = 1 / next;
      let r = Math.random() * stepSize, c = this.particles[0].w, i = 0;
      for (let m = 0; m < next; m++) {
        const u = r + m * stepSize;
        while (u > c && i < this.particles.length - 1) { i++; c += this.particles[i].w; }
        const p = this.particles[i];
        out.push({ x: p.x, y: p.y, h: p.h, w: 1 / next });
      }
      this.particles = out;
      this.n = next;
    }

    // 3) Fuzz: small random jitter so identical copies spread out again.
    roughen() {
      for (const p of this.particles) {
        p.x += A.randn() * this.fuzz;
        p.y += A.randn() * this.fuzz;
        p.h += A.randn() * 0.02;
      }
    }

    // 4) Move every particle with the same known command.
    move(cmd) {
      for (const p of this.particles) {
        p.h += cmd.turn;
        p.x += cmd.distance * Math.cos(p.h);
        p.y += cmd.distance * Math.sin(p.h);
      }
      this.step++;
    }

    // 5) Estimate = mean particle position.
    estimate() {
      let x = 0, y = 0;
      for (const p of this.particles) { x += p.x; y += p.y; }
      return { x: x / this.particles.length, y: y / this.particles.length };
    }
  }

  A.ParticleFilter = ParticleFilter;
})(window.AI4R);
