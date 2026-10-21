/* ============================================================
   Planner: head for the treasure; if a mapped tree blocks the
   straight line, aim for a point just outside that tree.
   ============================================================ */
(function (A) {
  const CLEARANCE = 0.45;   // extra space kept around trees
  const LOOKAHEAD = 2.5;    // only worry about trees this close along the path

  // Does segment p->q pass within `rad` of point c?
  function segmentHits(p, q, c, rad) {
    const vx = q.x - p.x, vy = q.y - p.y;
    const len2 = vx * vx + vy * vy || 1e-9;
    const t = A.clamp(((c.x - p.x) * vx + (c.y - p.y) * vy) / len2, 0, 1);
    return Math.hypot(p.x + t * vx - c.x, p.y + t * vy - c.y) < rad;
  }

  // pose {x,y,h}, trees [{x,y,r}], goal {x,y}
  // Returns {type:'extract'} or {type:'move', distance, steering, aim}
  A.planNextMove = function (pose, trees, goal, maxDist, maxSteer) {
    const toGoal = Math.hypot(goal.x - pose.x, goal.y - pose.y);
    if (toGoal < 0.15) return { type: "extract" };

    let aim = { x: goal.x, y: goal.y };
    const reach = Math.min(toGoal, LOOKAHEAD);
    const ahead = {
      x: pose.x + (goal.x - pose.x) / toGoal * reach,
      y: pose.y + (goal.y - pose.y) / toGoal * reach,
    };

    // nearest blocking tree
    let blocker = null, bestD = Infinity;
    for (const t of trees) {
      if (!segmentHits(pose, ahead, t, t.r + CLEARANCE)) continue;
      const d = Math.hypot(t.x - pose.x, t.y - pose.y);
      if (d < bestD) { bestD = d; blocker = t; }
    }

    if (blocker) {
      // Two tangent directions around the tree; take the one closer to the goal.
      const base = Math.atan2(blocker.y - pose.y, blocker.x - pose.x);
      const R = blocker.r + CLEARANCE;
      const spread = bestD > R ? Math.asin(R / bestD) : Math.PI / 2;
      const goalAng = Math.atan2(goal.y - pose.y, goal.x - pose.x);
      const opts = [base + spread + 0.08, base - spread - 0.08];
      const pick = opts.reduce((a, b) => (Math.abs(A.wrapAngle(a - goalAng)) < Math.abs(A.wrapAngle(b - goalAng)) ? a : b));
      aim = { x: pose.x + Math.cos(pick) * 1.5, y: pose.y + Math.sin(pick) * 1.5 };
    }

    const wanted = Math.atan2(aim.y - pose.y, aim.x - pose.x);
    const steering = A.clamp(A.wrapAngle(wanted - pose.h), -maxSteer, maxSteer);
    // Move less while still turning hard.
    const turningHard = Math.abs(A.wrapAngle(wanted - pose.h)) > maxSteer;
    const distance = Math.min(turningHard ? maxDist * 0.3 : maxDist, toGoal);
    return { type: "move", distance, steering, aim, blocker };
  };
})(window.AI4R);
