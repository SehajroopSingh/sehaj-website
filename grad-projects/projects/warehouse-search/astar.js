/* ============================================================
   A* search on the warehouse grid.
   Goal = any walkable cell next to `target` (the robot works on
   boxes/dropzone from an adjacent square).
   Returns {path, expanded, cost} — expanded is the visit order,
   used to animate the search.
   ============================================================ */
(function (A) {
  A.astar = function (wh, start, target, opts) {
    const avoidTarget = opts && opts.notOn; // e.g. can't drop while standing on dropzone
    const isGoal = (p) => wh.isAdjacent(p, target) && !(avoidTarget && p.r === avoidTarget.r && p.c === avoidTarget.c);

    // Admissible: at least (distance - 1) straight moves are needed.
    const h = (p) => 2 * Math.max(0, Math.max(Math.abs(p.r - target.r), Math.abs(p.c - target.c)) - 1);

    const open = [{ p: start, g: 0, f: h(start) }];
    const came = new Map(), gScore = new Map([[wh.key(start), 0]]);
    const closed = new Set(), expanded = [];

    while (open.length) {
      // pop lowest f (small grid: a sorted array is plenty fast)
      open.sort((a, b) => a.f - b.f || b.g - a.g);
      const cur = open.shift();
      const k = wh.key(cur.p);
      if (closed.has(k)) continue;
      closed.add(k);
      expanded.push(cur.p);

      if (isGoal(cur.p)) {
        const path = [cur.p];
        let kk = k;
        while (came.has(kk)) { const prev = came.get(kk); path.unshift(prev); kk = wh.key(prev); }
        return { path, expanded, cost: cur.g };
      }

      for (const d of A.DIRS) {
        const n = { r: cur.p.r + d.dr, c: cur.p.c + d.dc };
        if (!wh.walkable(n)) continue;
        const g = cur.g + A.moveCost(d);
        const nk = wh.key(n);
        if (g < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, g);
          came.set(nk, cur.p);
          open.push({ p: n, g, f: g + h(n) });
        }
      }
    }
    return { path: null, expanded, cost: Infinity };
  };
})(window.AI4R);
