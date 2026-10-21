/* ============================================================
   Tracker (one Kalman filter per asteroid) + the hopping agent.
   ============================================================ */
(function (A) {
  // ---------- Tracker ----------
  class Tracker {
    constructor(measNoise) {
      this.measNoise = measNoise;
      this.filters = {};   // id -> KalmanFilter
      this.lastObs = {};   // id -> last raw measurement
    }

    // Feed this step's observations. Returns predicted positions for NEXT step.
    update(obs, useKalman) {
      const preds = {};
      for (const id in obs) {
        let kf = this.filters[id];
        if (!kf) kf = this.filters[id] = new A.KalmanFilter(obs[id], this.measNoise);
        else kf.update(obs[id]);
        kf.predict(); // belief now refers to next step
        this.lastObs[id] = obs[id];
        preds[id] = useKalman ? kf.pos : { x: obs[id][0], y: obs[id][1] };
      }
      // Forget asteroids that disappeared.
      for (const id in this.filters) if (!(id in obs)) { delete this.filters[id]; delete this.lastObs[id]; }
      return preds;
    }
  }

  // ---------- Agent ----------
  class Hopper {
    constructor(field, jumpDist) {
      this.field = field;
      this.jumpDist = jumpDist;
      this.home = { x: field.width / 2, y: 0 };
      this.reset();
    }

    reset() {
      this.riding = null;
      this.pos = { ...this.home };
      this.cooldown = 3;
      this.jumpFrom = null;
    }

    // Decide which asteroid to jump to (or null), based on predictions.
    choose(preds, tracker) {
      if (this.cooldown > 0) { this.cooldown--; return null; }
      const me = this.riding ? preds[this.riding] : this.home;
      if (!me) return null;
      const kfMine = this.riding && tracker.filters[this.riding];
      const leavingSoon = kfMine && !this.field.inBounds(kfMine.lookAhead(6));
      const reach = this.jumpDist * 0.9; // safety margin
      let best = null, bestY = -1;
      for (const id in preds) {
        if (id == this.riding) continue;
        const kf = tracker.filters[id];
        if (!kf || kf.updates < 3) continue;          // not tracked long enough
        const p = preds[id];
        if (Math.hypot(p.x - me.x, p.y - me.y) > reach) continue;
        if (!this.field.inBounds(kf.lookAhead(12), -0.02)) continue; // about to leave
        const higher = p.y > me.y + 0.03;
        if (!higher && !leavingSoon) continue;
        if (p.y > bestY) { bestY = p.y; best = id; }
      }
      return best;
    }
  }

  A.Tracker = Tracker;
  A.Hopper = Hopper;
})(window.AI4R);
