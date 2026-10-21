/* ============================================================
   Solar system world model.
   Units: AU for distance. Masses are arbitrary "demo" units,
   exaggerated for the planets so their pull is visible.
   ============================================================ */
(function (A) {
  class SolarSystem {
    constructor() {
      this.bodies = [
        { name: "Sun", r: 0, angle: 0, mass: 1000, size: 9, color: "#ffd166" },
        { name: "Inner", r: 0.75, angle: A.rand(0, 6.28), mass: 60, size: 4, color: "#9ad1ff" },
        { name: "Middle", r: 1.35, angle: A.rand(0, 6.28), mass: 120, size: 5, color: "#f4a261" },
        { name: "Outer", r: 2.45, angle: A.rand(0, 6.28), mass: 250, size: 6, color: "#90e0ef" },
      ];
    }

    position(b) {
      return { x: b.r * Math.cos(b.angle), y: b.r * Math.sin(b.angle) };
    }

    // Advance planets one step. Orbital speed follows Kepler: w ~ r^-1.5
    step() {
      for (const b of this.bodies) if (b.r > 0) b.angle += 0.22 * Math.pow(b.r, -1.5);
    }

    // Magnitude of total gravitational pull at (x, y).
    gravityAt(x, y) {
      let gx = 0, gy = 0;
      for (const b of this.bodies) {
        const p = this.position(b);
        const dx = p.x - x, dy = p.y - y;
        const d = Math.max(0.08, Math.hypot(dx, dy));
        const f = b.mass / (d * d * d);
        gx += f * dx;
        gy += f * dy;
      }
      return Math.hypot(gx, gy);
    }
  }

  // The lost satellite. Moves with a known (distance, turn) command.
  class Satellite {
    constructor(orbitRadius) {
      const a = A.rand(0, 6.28);
      this.x = orbitRadius * Math.cos(a);
      this.y = orbitRadius * Math.sin(a);
      this.h = a + Math.PI / 2; // tangential heading
      this.orbitRadius = orbitRadius;
    }
    command() {
      const distance = 0.09;
      return { distance, turn: distance / this.orbitRadius };
    }
    move(cmd) {
      this.h += cmd.turn;
      this.x += cmd.distance * Math.cos(this.h);
      this.y += cmd.distance * Math.sin(this.h);
    }
  }

  A.SolarSystem = SolarSystem;
  A.Satellite = Satellite;
})(window.AI4R);
