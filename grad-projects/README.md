# Graduate projects — demos and walkthroughs

This folder is linked from `../projects.html` (the Projects tab of the site). Each
project page's top-left link goes back there.

Five browser demos rebuilt from scratch in plain HTML/CSS/JavaScript.
No build step, no libraries: open `index.html` in a browser, or upload the
whole folder to any static host (GitHub Pages, Netlify, Vercel).

## Folder layout

```
ai4r-showcase/
├── index.html                  landing page with a card per project
├── shared/
│   ├── styles.css              all page styling (colors are at the top)
│   └── common.js               helpers: canvas sizing, animation loop, sliders, matrix math
└── projects/
    ├── solar-system-particle-filter/
    │   ├── index.html          page + write-up
    │   ├── solar-system.js     sun/planets + gravity
    │   ├── particle-filter.js  weigh -> resample -> fuzz -> move -> estimate
    │   └── demo.js             drawing + buttons
    ├── hopscotch-kalman-filter/
    │   ├── index.html
    │   ├── kalman-filter.js    6-state constant-acceleration Kalman filter
    │   ├── asteroid-field.js   asteroid motion + noisy observations
    │   ├── hopper.js           per-asteroid tracker + jump choice
    │   └── demo.js
    ├── drone-pid-control/
    │   ├── index.html
    │   ├── drone-sim.js        drone physics, PID class, Twiddle cost function
    │   ├── twiddle.js          resumable Twiddle optimizer
    │   └── demo.js
    ├── indiana-drones-slam/
    │   ├── index.html
    │   ├── forest-world.js     true trees, drone, noisy sensing/motion
    │   ├── graph-slam.js       online Graph SLAM (Omega/Xi + marginalization)
    │   ├── planner.js          go-to-treasure with tree avoidance
    │   ├── mission.js          runs one mission (no drawing)
    │   └── demo.js
    ├── warehouse-search/
    │   ├── index.html
    │   ├── warehouse-map.js    grid generation + helpers
    │   ├── astar.js            A* search
    │   ├── value-iteration.js  stochastic value iteration
    │   └── demo.js
    ├── aos-vm-resource-manager/   (walkthrough)
    │   ├── index.html          the tutorial: text, diagrams (inline SVG), tables
    │   ├── data.js             real numbers parsed from the recorded test logs
    │   └── charts.js           result charts + the test-2 replay widget
    ├── infos-kernel-tasks/        (walkthrough)
    │   ├── index.html
    │   └── buddy.js            the interactive buddy-allocator visualizer
    ├── muc-screen-time-app/       (walkthrough)
    │   └── index.html
    └── unity-video-game-design/   (walkthrough + YouTube embed)
        └── index.html
```

Walkthrough pages share `shared/walkthrough.css` (layout, steps, callouts,
charts) and `shared/walkthrough.js` (table-of-contents highlighting).

## Editing

- **Text:** each robotics project's write-up is in its `index.html`, between the
  `<!-- ===== WRITE-UP: edit freely ===== -->` comment and `</article>`.
  Each walkthrough page is all in its `index.html`, one `<section>` per chapter;
  the Unity page has an `<!-- EDIT ME -->` block for the team-game details.
- **Algorithms:** each algorithm is in its own file, separate from the drawing
  code in `demo.js`.
- **Tuning knobs:** constants in CAPS near the top of each file (noise
  levels, jump distance, speeds).
- **Script order matters:** every demo page loads `shared/common.js` first,
  then its own files, with `demo.js` last.
- **Navigation:** the top nav is the same HTML on every page; when you add a
  page, add its link to all of them (or search for `class="topnav"`).

## Embedding in an existing site

Copy the whole folder into your site, then link to `ai4r-showcase/index.html`
or to a single project page. To embed one demo in another page, use an iframe:

```html
<iframe src="ai4r-showcase/projects/indiana-drones-slam/index.html"
        style="width:100%;height:900px;border:0"></iframe>
```
