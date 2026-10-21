/* ============================================================
   Online Graph SLAM (information form).
   Unknowns: [drone x, drone y, tree1 x, tree1 y, tree2 x, ...]
   Omega * mu = Xi  ->  mu = best estimate of all of them.
   After each move the old pose is folded away (marginalized),
   so the matrix only grows when a new tree is seen.
   ============================================================ */
(function (A) {
  const M = A.mat;

  class OnlineGraphSLAM {
    constructor(opts) {
      this.measWeight = 1 / (opts.measSigma * opts.measSigma);
      this.moveWeight = 1 / (opts.moveSigma * opts.moveSigma);
      this.Omega = [[1e4, 0], [0, 1e4]]; // strong anchor: we start at (0, 0)
      this.Xi = [0, 0];
      this.index = {};                   // tree id -> row in Omega
      this.radius = {};                  // tree id -> measured radius
      this.heading = 0;                  // tracked from commands
      this.mu = [0, 0];
    }

    grow(n) {
      for (const row of this.Omega) for (let k = 0; k < n; k++) row.push(0);
      for (let k = 0; k < n; k++) this.Omega.push(new Array(this.Omega[0].length).fill(0));
      for (let k = 0; k < n; k++) this.Xi.push(0);
    }

    // Link variable pair (a, a+1) and (b, b+1) by an offset (dx, dy).
    link(a, b, dx, dy, w) {
      const d = [dx, dy];
      for (let k = 0; k < 2; k++) {
        this.Omega[a + k][a + k] += w;
        this.Omega[b + k][b + k] += w;
        this.Omega[a + k][b + k] -= w;
        this.Omega[b + k][a + k] -= w;
        this.Xi[a + k] -= d[k] * w;
        this.Xi[b + k] += d[k] * w;
      }
    }

    processMeasurements(meas) {
      for (const id in meas) {
        const m = meas[id];
        if (!(id in this.index)) {
          this.index[id] = this.Omega.length;
          this.radius[id] = m.radius;
          this.grow(2);
        }
        const ang = this.heading + m.bearing;
        this.link(0, this.index[id], m.distance * Math.cos(ang), m.distance * Math.sin(ang), this.measWeight);
      }
      this.solve();
    }

    processMovement(distance, steering) {
      this.heading = A.wrapAngle(this.heading + steering);
      const dx = distance * Math.cos(this.heading), dy = distance * Math.sin(this.heading);

      // 1) Insert the new pose in front: [new, old, trees...]
      const n = this.Omega.length;
      const O = M.zeros(n + 2, n + 2), X = new Array(n + 2).fill(0);
      for (let i = 0; i < n; i++) {
        X[i + 2] = this.Xi[i];
        for (let j = 0; j < n; j++) O[i + 2][j + 2] = this.Omega[i][j];
      }
      this.Omega = O; this.Xi = X;
      // 2) Motion constraint: new = old + (dx, dy)
      this.link(2, 0, dx, dy, this.moveWeight);

      // 3) Marginalize the old pose (rows/cols 2,3) with the Schur complement
      const keep = [0, 1].concat(Array.from({ length: n - 2 }, (_, k) => k + 4));
      const B = [[this.Omega[2][2], this.Omega[2][3]], [this.Omega[3][2], this.Omega[3][3]]];
      const Binv = M.inv(B);
      const Arows = [this.Omega[2], this.Omega[3]].map((row) => keep.map((j) => row[j]));
      const c = [this.Xi[2], this.Xi[3]];
      const AtBinv = M.mul(M.T(Arows), Binv);            // (n x 2)
      const correction = M.mul(AtBinv, Arows);           // (n x n)
      const xiCorr = AtBinv.map((r) => r[0] * c[0] + r[1] * c[1]);
      this.Omega = keep.map((i, a) => keep.map((j, b) => this.Omega[i][j] - correction[a][b]));
      this.Xi = keep.map((i, a) => this.Xi[i] - xiCorr[a]);
      this.solve();
    }

    solve() { this.mu = M.solve(this.Omega, this.Xi); }

    get pose() { return { x: this.mu[0], y: this.mu[1], h: this.heading }; }

    get trees() {
      return Object.keys(this.index).map((id) => ({
        id, x: this.mu[this.index[id]], y: this.mu[this.index[id] + 1], r: this.radius[id],
      }));
    }
  }

  A.OnlineGraphSLAM = OnlineGraphSLAM;
})(window.AI4R);
