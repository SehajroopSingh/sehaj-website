/* ============================================================
   Twiddle (coordinate descent) as a resumable object, so the
   page can run a few evaluations per frame and animate it.
   ============================================================ */
(function (A) {
  class Twiddle {
    // costFn(params) -> number. params/dp are arrays.
    constructor(costFn, start, dp, opts) {
      this.cost = costFn;
      this.p = start.slice();
      this.dp = dp.slice();
      this.grow = (opts && opts.grow) || 1.1;
      this.shrink = (opts && opts.shrink) || 0.9;
      this.tol = (opts && opts.tol) || 0.005;
      this.best = costFn(this.p);
      this.i = 0;          // which parameter we're nudging
      this.phase = "up";   // "up" = try p+dp, "down" = try p-dp
      this.evals = 1;
      this.history = [this.best];
    }

    get done() { return this.dp.reduce((a, b) => a + b, 0) < this.tol || this.evals > 1500; }

    // Do one cost evaluation (one "try").
    tick() {
      if (this.done) return;
      const i = this.i;
      if (this.phase === "up") {
        this.p[i] += this.dp[i];
        const c = this.cost(this.p); this.evals++;
        if (c < this.best) { this.best = c; this.dp[i] *= this.grow; this.next(); }
        else { this.p[i] -= 2 * this.dp[i]; this.phase = "down"; }
      } else {
        const c = this.cost(this.p); this.evals++;
        if (c < this.best) { this.best = c; this.dp[i] *= this.grow; }
        else { this.p[i] += this.dp[i]; this.dp[i] *= this.shrink; }
        this.next();
      }
      this.history.push(this.best);
    }

    next() {
      this.phase = "up";
      this.i = (this.i + 1) % this.p.length;
    }
  }

  A.Twiddle = Twiddle;
})(window.AI4R);
