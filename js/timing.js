/* ============================================================
   TIMING · every number that controls scroll pacing and scene
   timing on projects.html lives here. Nothing else in the site
   decides "how fast" or "when" — the other files read this.

   Load this before every other script on the page.

   Units
     · "scene units": a pinned track is N screens tall; progress
       runs 0..N, so 2.5 is the middle of the third scene.
     · fractions (0..1) are "how far through the current scene".
     · seconds are real seconds; "/s" is per second.
   ============================================================ */
window.Timing = {

  /* ---------- scrolling ----------
     The page scrolls natively everywhere. Each pinned track is N
     screens tall (css: .rj / .osb-wrap / .sj heights) — taller =
     slower relative to the scroll; sceneWeights below share that
     height out between the scenes. The scenes are driven straight
     from the scroll position, with only a light camera smoothing
     (cards.smooth.follow, in 1/s). */
  /* ---------- cards & smoothing (js/robotics/journey.js, js/science/journey.js) ---------- */
  cards: {
    showFrom: 0.05,         // a card fades in this far into its scene…
    showUntil: "handoff",   // …and stays until the scene's hand-off begins (each journey's `handoff` below)
    smooth: { follow: 7 },  // 1/s · how closely the worlds track the scroll (7 ≈ 0.15 s behind); no speed cap
  },

  /* ---------- robotics journey (js/robotics/scenes.js) ---------- */
  robotics: {
    sceneWeights: [1, 1, 1, 2.2, 1.4, 1, 0.55],   // how much of the track's scroll each scene gets (relative); HopScotch gets the most; the last is the exit into the chip
    handoff: 0.68,          // fraction of a scene where the hand-off to the next one begins (the last third plays the transition)
    cameraFollow: 3.2,      // /s · how quickly the camera glides to where a scene points it
    warehouse: { cycleMs: 3600, leaveDistance: 9 },                      // the robot's lift-and-turn loop; how far it drives off at the hand-off
    forest: { sweepScroll: 0.85, sweepRestSeconds: 10, resetBelow: 0.05 }, // the sweep completes by this fraction, or after this many seconds at rest
    pid: { switchMs: 2600, goalMin: 1.6, goalSpan: 3.4, kp: 9, kd: 4.2, ki: 0.8 },
    launch: {
      refit: 0.18,          // drone → rocket is done by here
      liftoff: 0.22,        // the climb to orbit takes this long after `refit`
      chaseFollow: 14,      // /s · how tightly the camera rides alongside the climbing rocket (vs cameraFollow elsewhere)
      hopFrom: 0.4,         // asteroid hopping starts here…
      hopsEndAt: 0.9,       // …and the last hop lands here: the hops are spread over the scroll, so they can't be rushed
      hops: 7,              // how many rocks it hops across
      flameUntil: 0.45,
      nightBy: 0.42,        // the sky is fully night by here (fraction): dusk falls as the rocket climbs
      starsFrom: 0.22,
      spaceFrom: 0.4,       // the night sky starts going black (space) here
    },
    solar: {
      settleIn: 0.4,        // the ship glides from its last asteroid into its orbit over this much of the scene, camera circling it
      grow: 0.45,           // the solar system reaches full size by here
      zoomOut: [0.3, 0.7],  // the camera pulls out to the overview over this window
      converge: 0.75,       // the particle filter is "localized" by here
      orbitRate: 0.22,      // rad/s · the ship's orbit around the sun
    },
    ship: { settle: 0.3, sideDistance: 1.15, along: 1.45 },
    exit: {                 // scene 6 · leaving the ship (no card): the camera backs off and turns down to the open stars
      pullOut: [0, 0.45],   // the camera backs away from the hull, the ship drifting out of frame
      tilt: [0.3, 0.85],    // …and turns down to the open stars; the chip section begins almost at once
      fadeIn: null,         // no overlay: the 3D stars simply run out and the chip section's stars begin as you scroll (set a [from, to] window to blend a flat sky in instead)
      clear: 0.3,           // from here on the solar system and rocks are hidden (the ship a little later): nothing but stars in the look-down
    },
  },

  /* ---------- science journey (js/science/scenes.js) ---------- */
  science: {
    sceneWeights: [1, 1, 1, 1.4, 1.3, 1.2],   // how much of the track's scroll each scene gets (relative)
    handoff: 0.8,           // fraction of a scene where the hand-off to the next one begins
    cameraFollow: 3,
    neuronsFade: [0.25, 0.75],   // during the MemSurf card (scene 0) the neurons fade up into the background over this window
    neurons: { dnaSlide: 0.6, spikeChance: 0.02, terminalMs: 400 },  // the DNA slides in over the first 60% · chance per frame a spike fires · how long "just hit a terminal" lasts
    paper:   { shrink: 0.5 },                                        // the neurons shrink to this scale at the hand-off
    zoom: {                 // neurons → brain → person → crowd (one continuous pull-back)
      collapse: 0.32,       // neurons shrink away and the brain closes in from the edges by here
      brainFrom: 7,         // the brain starts this many times its size (around the camera) and shrinks to 1
      person: [0.3, 0.6],   // the person fades in over this window
      pullBack: 0.55,       // the camera starts backing away here (to the scene's end)
      ground: [0.3, 0.45],  // the grass fades in
      crowd: [0.55, 0.8],   // the crowd fades in
      distance: [7, 330],   // camera distance at the start / end of the pull-back
    },
    earth: {                // crowd → globe
      shrink: 0.85,         // the globe reaches its final size by here
      crowdFade: [0.3, 0.6],
      capFade: [0.2, 0.55], // the grass cap on the pole fades out
      folkFade: [0.7, 0.95],// the little people all over the globe fade in
      spinFrom: 0.7,        // the globe starts turning
      starsFrom: 0.3,
      skyFade: [0.2, 0.82], // the sky goes from dusk to space
      distance: [330, 86],
    },
    data: {                 // the last scene
      emerge: [0.02, 0.26], // points rise off the people and the surface (driven by the scroll)
      holdAt: 0.3,          // the page holds here until the frame has filled…
      fileSeconds: 3.2,     // …which happens by the clock: points file into the frame one after another
      frameDistance: 54,    // how far the camera ends from the frame (bigger = smaller frame on screen)
      earthShrink: 0.5,     // the globe shrinks to this scale as the frame comes forward
    },
  },

  /* ---------- the chip → phone zoom (js/phone-zoom.js) ---------- */
  phone: {
    boardShare: 0.2,        // the first fifth of the pinned track is the board on its own
    intro: {                // the board's own intro, driven by its first stretch of scroll: stars → nodes → traces → chip → board
      share: 0.08,          // fraction of the pinned track the intro takes (0.08 × 950vh ≈ 76vh of scrolling)
      nodes: [0.05, 0.4],   // stars brighten at every pad and node
      lines: [0.25, 0.75],  // the traces draw from those stars in to the chip
      chip: [0.55, 0.85],   // the chip outline appears
      board: [0.75, 1],     // the stars fade and the board comes up; it then powers on
    },
    zoom: 0.28,             // chip shrinks / phone edges close in, over the first 28 %
    pass: [0.22, 0.38],     // the screen slides over the chip
    tilt: [0.38, 0.52],     // the phone turns into 3D
    apps: [0.5, 0.68],      // the two app cards pop out (Screen Time first, then MemSurf to the right)
    expand: [0.78, 0.98],   // the phone and Screen Time slide off to the left while the MemSurf card grows leftward (its right edge fixed) into the full card
    labels: [0.22, 0.4, 0.55],   // when the caption changes
    smooth: { follow: 7 },
  },
};
