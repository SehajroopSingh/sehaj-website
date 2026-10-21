/* ============================================================
   Buddy allocator visualizer (from scratch, for this page).
   16 pages, orders 0..4. Allocate a block of 1/2/4/8 pages and
   watch bigger blocks split; click a used block to free it and
   watch buddies merge back together.
   ============================================================ */
(function () {
  const root = document.getElementById("buddy");
  if (!root) return;
  const PAGES = 16, MAX_ORDER = 4;
  const strip = root.querySelector(".buddy-strip");
  const lists = root.querySelector(".buddy-lists");
  const log = root.querySelector(".buddy-log");

  // blocks: {start, order, used}
  let blocks = [{ start: 0, order: MAX_ORDER, used: false }];
  const size = (o) => 1 << o;
  const buddyOf = (start, order) => start ^ size(order);

  function say(msg) { log.textContent = msg; }

  function alloc(order) {
    // smallest free block whose order >= requested
    let best = null;
    for (const b of blocks) if (!b.used && b.order >= order && (!best || b.order < best.order)) best = b;
    if (!best) return say("No free block of " + size(order) + " page" + (size(order) > 1 ? "s" : "") + " or larger. Free something first.");
    let splits = 0;
    while (best.order > order) {           // split down to the right size
      best.order--;
      blocks.push({ start: best.start + size(best.order), order: best.order, used: false });
      splits++;
    }
    best.used = true;
    say("Allocated " + size(order) + " page" + (size(order) > 1 ? "s" : "") + " at page " + best.start +
      (splits ? " after splitting a larger block " + splits + " time" + (splits > 1 ? "s" : "") + "." : " from a block that was already the right size."));
    render();
  }

  function free(b) {
    b.used = false;
    let merges = 0;
    while (b.order < MAX_ORDER) {         // merge with buddy while it is free and the same order
      const bs = buddyOf(b.start, b.order);
      const buddy = blocks.find((x) => x.start === bs && x.order === b.order && !x.used);
      if (!buddy) break;
      blocks = blocks.filter((x) => x !== buddy && x !== b);
      b = { start: Math.min(b.start, bs), order: b.order + 1, used: false };
      blocks.push(b);
      merges++;
    }
    say("Freed the block." + (merges ? " Its buddy was free too, so they merged " + merges + " time" + (merges > 1 ? "s" : "") + " into a " + size(b.order) + "-page block." : " Its buddy is still in use, so no merge yet."));
    render();
  }

  function render() {
    blocks.sort((a, b) => a.start - b.start);
    strip.innerHTML = "";
    for (const b of blocks) {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "bblock" + (b.used ? " used" : "");
      d.style.flex = size(b.order);
      d.textContent = size(b.order) + (b.used ? "" : " free");
      d.title = b.used ? "Click to free pages " + b.start + "–" + (b.start + size(b.order) - 1) : "Free block of " + size(b.order) + " page(s)";
      if (b.used) d.onclick = () => free(b);
      else d.disabled = true;
      strip.appendChild(d);
    }
    lists.innerHTML = "";
    for (let o = MAX_ORDER; o >= 0; o--) {
      const row = document.createElement("div");
      const free = blocks.filter((b) => !b.used && b.order === o).map((b) => "@" + b.start);
      row.innerHTML = '<span class="ord">order ' + o + ' (' + size(o) + ' pg)</span><span class="fl">' + (free.length ? free.join(" → ") : "—") + "</span>";
      lists.appendChild(row);
    }
  }

  root.querySelectorAll("[data-alloc]").forEach((btn) => (btn.onclick = () => alloc(Number(btn.dataset.alloc))));
  root.querySelector("[data-reset]").onclick = () => { blocks = [{ start: 0, order: MAX_ORDER, used: false }]; say("Reset: one free 16-page block."); render(); };
  render();
  say("One free 16-page block. Allocate something.");
})();
