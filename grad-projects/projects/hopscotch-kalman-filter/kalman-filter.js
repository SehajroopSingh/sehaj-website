/* ============================================================
   Kalman filter with a constant-acceleration model.
   State x = [px, py, vx, vy, ax, ay], one time step = 1.
   ============================================================ */
(function (A) {
  const M = A.mat;

  // State transition: position += v + a/2, velocity += a
  const F = [
    [1, 0, 1, 0, 0.5, 0],
    [0, 1, 0, 1, 0, 0.5],
    [0, 0, 1, 0, 1, 0],
    [0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1],
  ];
  const FT = M.T(F);
  // We only observe position.
  const H = [
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
  ];
  const HT = M.T(H);
  const I6 = M.identity(6);

  class KalmanFilter {
    constructor(z, measNoise) {
      this.x = [[z[0]], [z[1]], [0], [0], [0], [0]];
      const s2 = measNoise * measNoise;
      // Unknown velocity/acceleration start with large uncertainty.
      this.P = [
        [s2, 0, 0, 0, 0, 0],
        [0, s2, 0, 0, 0, 0],
        [0, 0, 1e-4, 0, 0, 0],
        [0, 0, 0, 1e-4, 0, 0],
        [0, 0, 0, 0, 1e-7, 0],
        [0, 0, 0, 0, 0, 1e-7],
      ];
      this.R = [[s2, 0], [0, s2]];
      this.Q = M.zeros(6, 6);
      this.Q[4][4] = this.Q[5][5] = 1e-10; // tiny process noise
      this.updates = 0;
    }

    // Measurement update with observation z = [x, y]
    update(z) {
      const y = M.sub([[z[0]], [z[1]]], M.mul(H, this.x));
      const S = M.add(M.mul(M.mul(H, this.P), HT), this.R);
      const K = M.mul(M.mul(this.P, HT), M.inv(S));
      this.x = M.add(this.x, M.mul(K, y));
      this.P = M.mul(M.sub(I6, M.mul(K, H)), this.P);
      this.updates++;
    }

    // Move the belief one step forward in time.
    predict() {
      this.x = M.mul(F, this.x);
      this.P = M.add(M.mul(M.mul(F, this.P), FT), this.Q);
    }

    // Where will it be k steps from now? (doesn't change the filter)
    lookAhead(k) {
      let x = this.x;
      for (let i = 0; i < k; i++) x = M.mul(F, x);
      return { x: x[0][0], y: x[1][0] };
    }

    get pos() { return { x: this.x[0][0], y: this.x[1][0] }; }
    get vel() { return { x: this.x[2][0], y: this.x[3][0] }; }
  }

  A.KalmanFilter = KalmanFilter;
})(window.AI4R);
