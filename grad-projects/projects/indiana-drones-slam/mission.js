/* ============================================================
   One mission: land, map the forest, fly to the treasure.
   Runs the true world, SLAM and plain dead reckoning side by side.
   (No drawing here, so it can also be tested headless.)
   ============================================================ */
(function (A) {
  const MAX_DIST = 0.6, MAX_STEER = Math.PI / 4, MAX_STEPS = 160;

  class Mission {
    constructor(navMode) {
      this.navMode = navMode;              // "slam" or "dr"
      this.world = new A.ForestWorld();
      this.slam = new A.OnlineGraphSLAM({ measSigma: 0.07, moveSigma: 0.15 });
      this.dr = { x: 0, y: 0, h: 0 };      // dead reckoning: trust the commands
      this.drTrees = {};
      this.steps = 0;
      this.outcome = null;                 // "found" | "missed" | "crashed" | "timeout"
      this.paths = { truth: [{ x: 0, y: 0 }], slam: [{ x: 0, y: 0 }], dr: [{ x: 0, y: 0 }] };
      this.observe();
    }

    observe() {
      this.meas = this.world.sense();
      this.slam.processMeasurements(this.meas);
      for (const id in this.meas) {
        const m = this.meas[id], a = this.dr.h + m.bearing;
        this.drTrees[id] = { id, x: this.dr.x + m.distance * Math.cos(a), y: this.dr.y + m.distance * Math.sin(a), r: m.radius };
      }
    }

    belief() {
      return this.navMode === "slam"
        ? { pose: this.slam.pose, trees: this.slam.trees }
        : { pose: this.dr, trees: Object.values(this.drTrees) };
    }

    step() {
      if (this.outcome) return;
      const b = this.belief();
      const plan = A.planNextMove(b.pose, b.trees, this.world.treasure, MAX_DIST, MAX_STEER);
      this.lastPlan = plan;

      if (plan.type === "extract") {
        const w = this.world;
        const miss = Math.hypot(w.drone.x - w.treasure.x, w.drone.y - w.treasure.y);
        this.outcome = miss < 0.25 ? "found" : "missed";
        this.missBy = miss;
        return;
      }

      this.world.move(plan.distance, plan.steering);
      this.dr.h = A.wrapAngle(this.dr.h + plan.steering);
      this.dr.x += plan.distance * Math.cos(this.dr.h);
      this.dr.y += plan.distance * Math.sin(this.dr.h);
      this.slam.processMovement(plan.distance, plan.steering);
      this.steps++;

      this.paths.truth.push({ x: this.world.drone.x, y: this.world.drone.y });
      this.paths.dr.push({ x: this.dr.x, y: this.dr.y });

      if (this.world.crashed()) { this.outcome = "crashed"; return; }
      this.observe();
      this.paths.slam.push({ x: this.slam.pose.x, y: this.slam.pose.y });
      if (this.steps >= MAX_STEPS) this.outcome = "timeout";
    }

    errors() {
      const d = this.world.drone, s = this.slam.pose;
      return { slam: Math.hypot(s.x - d.x, s.y - d.y), dr: Math.hypot(this.dr.x - d.x, this.dr.y - d.y) };
    }
  }

  A.Mission = Mission;
})(window.AI4R);
