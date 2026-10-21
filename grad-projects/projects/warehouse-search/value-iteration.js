/* ============================================================
   Value iteration with stochastic moves.
   When the robot tries direction a it actually goes:
     a (as intended) with prob p,
     a±45° (slanted) with prob (1-p)·2/3 split evenly,
     a±90° (sideways) with prob (1-p)·1/3 split evenly.
   Bumping into a wall/box/edge costs COLLISION and stays put.
   Value = expected total cost to reach a cell next to the target
   box and lift it.
   ============================================================ */
(function (A) {
  const COLLISION = 100, LIFT = 4;

  function outcomes(a, p) {
    const slant = ((1 - p) * 2) / 3 / 2, side = (1 - p) / 3 / 2;
    return [
      { d: a, prob: p },
      { d: (a + 1) % 8, prob: slant }, { d: (a + 7) % 8, prob: slant },
      { d: (a + 2) % 8, prob: side }, { d: (a + 6) % 8, prob: side },
    ];
  }

  // Returns {value[r][c], policy[r][c] (dir index, -1 = lift, null = n/a), sweeps}
  A.valueIteration = function (wh, target, p, useFloorCost) {
    const R = wh.rows, Cc = wh.cols;
    const value = Array.from({ length: R }, () => new Array(Cc).fill(Infinity));
    const policy = Array.from({ length: R }, () => new Array(Cc).fill(null));
    const cells = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) {
      const cell = { r, c };
      if (!wh.walkable(cell)) continue;
      cells.push(cell);
      if (wh.isAdjacent(cell, target)) { value[r][c] = LIFT; policy[r][c] = -1; }
      else value[r][c] = 5000;
    }
    const floor = (q) => (useFloorCost ? wh.floorCost[q.r][q.c] : 0);

    let sweeps = 0, changed = true;
    while (changed && sweeps < 600) {
      changed = false; sweeps++;
      for (const s of cells) {
        if (policy[s.r][s.c] === -1) continue;
        let best = Infinity, bestA = null;
        for (let a = 0; a < 8; a++) {
          let q = 0;
          for (const o of outcomes(a, p)) {
            const d = A.DIRS[o.d], n = { r: s.r + d.dr, c: s.c + d.dc };
            q += o.prob * (wh.walkable(n)
              ? A.moveCost(d) + floor(n) + value[n.r][n.c]
              : COLLISION + value[s.r][s.c]);
          }
          if (q < best) { best = q; bestA = a; }
        }
        if (Math.abs(best - value[s.r][s.c]) > 1e-3) { value[s.r][s.c] = best; changed = true; }
        policy[s.r][s.c] = bestA;
      }
    }
    return { value, policy, sweeps };
  };

  // Sample where a robot actually ends up when it tries direction a.
  A.sampleMove = function (wh, s, a, p) {
    let u = Math.random();
    for (const o of outcomes(a, p)) {
      if ((u -= o.prob) <= 0) {
        const d = A.DIRS[o.d], n = { r: s.r + d.dr, c: s.c + d.dc };
        return { cell: wh.walkable(n) ? n : s, bumped: !wh.walkable(n), intended: o.d === a };
      }
    }
    return { cell: s, bumped: false, intended: true };
  };
})(window.AI4R);
