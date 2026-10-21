/* ============================================================
   Dual-rotor drone physics + PID controllers.
   Units: meters, seconds, newtons. y points up.
   ============================================================ */
(function (A) {
  // ---------- Generic PID controller ----------
  class PID {
    constructor(gains, integralLimit) {
      this.g = gains;                 // {p, i, d}
      this.iLimit = integralLimit || 20;
      this.reset();
    }
    reset() { this.integral = 0; this.prev = null; }
    update(error, dt) {
      const deriv = this.prev == null ? 0 : (error - this.prev) / dt;
      this.prev = error;
      this.integral = A.clamp(this.integral + error * dt, -this.iLimit, this.iLimit);
      return this.g.p * error + this.g.i * this.integral + this.g.d * deriv;
    }
  }

  // ---------- Drone ----------
  const MASS = 1, GRAVITY = 9.81, MAX_THRUST = 26, DRAG = 0.15;
  const MAX_TILT = 0.45; // rad

  class Drone {
    constructor(thrustGains, rollGains) {
      this.thrustPID = new PID(thrustGains);
      this.rollPID = new PID(rollGains, 10);
      this.reset();
    }

    reset() {
      Object.assign(this, { x: 0, y: 0, vx: 0, vy: 0, th: 0, om: 0, thrust: 0 });
      this.thrustPID.reset();
      this.rollPID.reset();
    }

    // One physics step. target = {x, y}; disturbance = {down, side} in N.
    step(dt, target, disturbance) {
      // Altitude: hover feed-forward + PID correction
      const ey = target.y - this.y;
      const cmd = MASS * GRAVITY + this.thrustPID.update(ey, dt);
      this.thrust = A.clamp(cmd / Math.max(0.6, Math.cos(this.th)), 0, MAX_THRUST);

      // Horizontal: PID picks a tilt angle; a fixed inner loop holds it
      const ex = target.x - this.x;
      const tiltWanted = A.clamp(this.rollPID.update(ex, dt), -MAX_TILT, MAX_TILT);
      this.om += (40 * (tiltWanted - this.th) - 10 * this.om) * dt;
      this.th += this.om * dt;

      const down = disturbance ? disturbance.down : 0;
      const side = disturbance ? disturbance.side : 0;
      const ax = (this.thrust * Math.sin(this.th) + side) / MASS - DRAG * this.vx;
      const ay = (this.thrust * Math.cos(this.th) - down) / MASS - GRAVITY - DRAG * this.vy;
      this.vx += ax * dt;
      this.vy += ay * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.y < 0) { this.y = 0; this.vy = Math.max(0, this.vy); this.vx *= 0.9; }
    }
  }

  // ---------- Score an altitude step response (used by Twiddle) ----------
  // Returns cost = tracking error + penalties for going too fast / oscillating.
  A.scoreThrustGains = function (gains, withDowndraft) {
    const d = new Drone(gains, { p: 0, i: 0, d: 0 });
    const target = { x: 0, y: 6 }, dt = 0.02, dist = { down: withDowndraft ? 3 : 0, side: 0 };
    let iae = 0, maxV = 0, crossings = 0, lastSign = -1;
    for (let t = 0; t < 8; t += dt) {
      d.step(dt, target, dist);
      const e = target.y - d.y;
      iae += Math.abs(e) * dt;
      maxV = Math.max(maxV, Math.abs(d.vy));
      const sgn = e > 0.05 ? 1 : e < -0.05 ? -1 : 0;
      if (sgn && lastSign && sgn !== lastSign) crossings++;
      if (sgn) lastSign = sgn;
    }
    const tooFast = Math.max(0, maxV - 5);
    const tooWobbly = Math.max(0, crossings - 1);
    return iae + 2 * tooFast + 1.5 * tooWobbly;
  };

  A.PID = PID;
  A.Drone = Drone;
})(window.AI4R);
