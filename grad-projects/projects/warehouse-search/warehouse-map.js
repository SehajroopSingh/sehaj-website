/* ============================================================
   Warehouse grid: walls '#', floor '.', dropzone '@', boxes '1'..'5'.
   Rows go down, columns go right. Robot moves in 8 directions.
   ============================================================ */
(function (A) {
  const ROWS = 12, COLS = 18, BOXES = 5;

  // 8 directions, clockwise from north. Index order matters for
  // the stochastic model (neighbors in this list = "slanted").
  const DIRS = [
    { dr: -1, dc: 0, name: "n" }, { dr: -1, dc: 1, name: "ne" },
    { dr: 0, dc: 1, name: "e" }, { dr: 1, dc: 1, name: "se" },
    { dr: 1, dc: 0, name: "s" }, { dr: 1, dc: -1, name: "sw" },
    { dr: 0, dc: -1, name: "w" }, { dr: -1, dc: -1, name: "nw" },
  ];
  const moveCost = (d) => (d.dr && d.dc ? 3 : 2); // diagonal 3, straight 2

  class Warehouse {
    constructor() {
      for (let attempt = 0; attempt < 200; attempt++) {
        this.generate();
        if (this.valid()) break;
      }
      this.floorCost = this.makeFloorCost();
    }

    generate() {
      this.rows = ROWS; this.cols = COLS;
      this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill("."));
      // shelving: short wall segments
      for (let k = 0; k < 13; k++) {
        const horiz = Math.random() < 0.6, len = 2 + Math.floor(Math.random() * 4);
        let r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
        for (let i = 0; i < len; i++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) this.grid[r][c] = "#";
          horiz ? c++ : r++;
        }
      }
      this.dropzone = this.randomFloor((r) => r >= ROWS - 4);
      this.grid[this.dropzone.r][this.dropzone.c] = "@";
      this.boxes = {};
      for (let b = 1; b <= BOXES; b++) {
        const cell = this.randomFloor((r, c) => Math.max(Math.abs(r - this.dropzone.r), Math.abs(c - this.dropzone.c)) > 3);
        this.grid[cell.r][cell.c] = String(b);
        this.boxes[b] = cell;
      }
      this.todo = Object.keys(this.boxes).map(Number);
    }

    randomFloor(ok) {
      for (let i = 0; i < 1000; i++) {
        const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
        if (this.grid[r][c] === "." && ok(r, c)) return { r, c };
      }
      return { r: ROWS - 1, c: 0 };
    }

    // Every box must have a reachable neighbor cell from the dropzone.
    valid() {
      const seen = new Set([this.key(this.dropzone)]);
      const q = [this.dropzone];
      while (q.length) {
        const cur = q.shift();
        for (const d of DIRS) {
          const n = { r: cur.r + d.dr, c: cur.c + d.dc };
          if (this.walkable(n) && !seen.has(this.key(n))) { seen.add(this.key(n)); q.push(n); }
        }
      }
      return Object.values(this.boxes).every((b) =>
        DIRS.some((d) => seen.has(this.key({ r: b.r + d.dr, c: b.c + d.dc }))));
    }

    // Smooth random floor costs (a few "rough patches").
    makeFloorCost() {
      const blobs = Array.from({ length: 5 }, () => ({ r: Math.random() * ROWS, c: Math.random() * COLS, s: 1.5 + Math.random() * 2.5, h: 4 + Math.random() * 8 }));
      return Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) =>
        Math.round(blobs.reduce((sum, b) => sum + b.h * Math.exp(-((r - b.r) ** 2 + (c - b.c) ** 2) / (2 * b.s * b.s)), 0))));
    }

    key(p) { return p.r * 100 + p.c; }
    inside(p) { return p.r >= 0 && p.r < this.rows && p.c >= 0 && p.c < this.cols; }
    walkable(p) { return this.inside(p) && (this.grid[p.r][p.c] === "." || this.grid[p.r][p.c] === "@"); }
    isAdjacent(a, b) { return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1; }

    toggleWall(p) {
      const v = this.grid[p.r][p.c];
      if (v === ".") this.grid[p.r][p.c] = "#";
      else if (v === "#") this.grid[p.r][p.c] = ".";
    }
  }

  A.Warehouse = Warehouse;
  A.DIRS = DIRS;
  A.moveCost = moveCost;
})(window.AI4R);
