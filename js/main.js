/* ==========================================================================
   ALESSIA CANUTO — SITE JAVASCRIPT
   --------------------------------------------------------------------------
   Everything interactive on the site lives in this one file:

     1. Mobile navigation toggle
     2. Reveal-on-scroll animations
     3. Animated statistics (count-up numbers)
     4. Category filters (Work page)
     5. Year filters + map highlighting (Journey page)
     6. Contact form: pre-typed messages + mailto submission

   Each part checks whether its elements exist on the current page,
   so the same file can safely be loaded everywhere.
   ========================================================================== */

(function () {
  "use strict";

  // Everything hidden-until-animated in the CSS is gated behind this class,
  // so the site is fully visible if JavaScript ever fails to run.
  document.documentElement.classList.add("js");

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     1. MOBILE NAVIGATION
     ------------------------------------------------------------------ */
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.textContent = isOpen ? "Close" : "Menu";
    });
  }

  /* ------------------------------------------------------------------
     1b. HEADER HAIRLINE
     The header's bottom border only appears once the page is scrolled,
     so the top of each page starts perfectly clean.
     ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  var progressBar = document.querySelector(".read-progress span");
  if (header) {
    var headerTicking = false;
    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
      if (progressBar) {
        // Reading-progress hairline (About page)
        var travel = document.documentElement.scrollHeight - window.innerHeight;
        var read = travel > 0 ? window.scrollY / travel : 0;
        progressBar.style.transform = "scaleX(" + Math.min(Math.max(read, 0), 1) + ")";
      }
      headerTicking = false;
    };
    window.addEventListener("scroll", function () {
      if (!headerTicking) {
        headerTicking = true;
        requestAnimationFrame(updateHeader);
      }
    }, { passive: true });
    updateHeader();
  }

  /* ------------------------------------------------------------------
     1c. PRINTING
     Before printing, open every accordion so nothing is hidden on
     paper; afterwards, close the ones we opened.
     ------------------------------------------------------------------ */
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll(".accordion details:not([open])").forEach(function (d) {
      d.setAttribute("data-print-opened", "");
      d.open = true;
    });
  });
  window.addEventListener("afterprint", function () {
    document.querySelectorAll("[data-print-opened]").forEach(function (d) {
      d.open = false;
      d.removeAttribute("data-print-opened");
    });
  });

  /* ------------------------------------------------------------------
     2. REVEAL ON SCROLL
     Elements with class "reveal" fade in when they enter the viewport.
     ".reveal-stage" elements don't fade themselves — they just gain
     .is-visible so their children can run their own entrances (the arch
     wipe, card cascades, rule draws… see css section 19c).
     A "data-cascade" container gets staggered delays on its children.
     With reduced motion (or old browsers) everything is shown at once.
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll(".reveal, .reveal-stage, .paper-in");

  function applyCascade(el) {
    if (!el.hasAttribute("data-cascade")) return;
    Array.prototype.forEach.call(el.children, function (child, i) {
      child.style.transitionDelay = Math.min(i * 80, 640) + "ms";
    });
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            applyCascade(entry.target);
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------------------
     2b. WORD-BY-WORD HEADLINE REVEAL
     Headings with data-split have each word wrapped in a masked span,
     then the words rise into place with a slight stagger when the
     heading scrolls into view. Skipped entirely under reduced motion
     (the heading simply appears, fully readable).
     ------------------------------------------------------------------ */
  var splitEls = document.querySelectorAll("[data-split]");

  function wrapWord(contents) {
    var mask = document.createElement("span");
    mask.className = "split-mask";
    var word = document.createElement("span");
    word.className = "split-word";
    mask.appendChild(word);
    word.appendChild(contents);
    return mask;
  }

  function splitWords(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        // Text node: wrap each word, keep the spaces between them
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            frag.appendChild(wrapWord(document.createTextNode(part)));
          }
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== "BR") {
        // Element node (e.g. an <em> phrase): treat it as one unit
        var placeholder = document.createTextNode("");
        el.replaceChild(placeholder, node);
        el.replaceChild(wrapWord(node), placeholder);
      }
    });
    // Stagger the words, capped so long headings don't take forever
    var words = el.querySelectorAll(".split-word");
    for (var i = 0; i < words.length; i++) {
      words[i].style.transitionDelay = Math.min(i * 70, 600) + "ms";
    }
  }

  if (splitEls.length && !prefersReducedMotion && "IntersectionObserver" in window) {
    splitEls.forEach(splitWords);
    var splitObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("split-visible");
            splitObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0 }
    );
    splitEls.forEach(function (el) { splitObserver.observe(el); });
  } else {
    // No animation: make sure any drawn underlines still appear
    splitEls.forEach(function (el) { el.classList.add("split-visible"); });
  }

  /* ------------------------------------------------------------------
     2c. SCROLL SCENES (homepage)
     Sections wrapped in <div class="scene" data-scene> pin on screen
     while scrolling; progress through the tall wrapper drives their
     [data-scene-item] children on one at a time (and off again when
     scrolling back up). The MemSurf section ([data-zoom]) scales up
     as it enters. Scenes arm only on large screens without reduced
     motion — everywhere else the sections behave normally.
     ------------------------------------------------------------------ */
  (function () {
    var scenes = document.querySelectorAll("[data-scene]");
    var zoomEl = document.querySelector("[data-zoom]");
    if (!scenes.length && !zoomEl) return;

    var canArm =
      !prefersReducedMotion &&
      window.innerWidth > 900 &&
      window.innerHeight > 640 &&
      "IntersectionObserver" in window;

    if (!canArm) {
      // Static fallback: every scene item simply visible
      scenes.forEach(function (scene) {
        scene.querySelectorAll("[data-scene-item]").forEach(function (item) {
          item.classList.add("is-on");
        });
      });
      return;
    }

    document.documentElement.classList.add("scenes-armed");

    var tracked = [];
    scenes.forEach(function (scene) {
      scene.classList.add("scene-on");
      var items = scene.querySelectorAll("[data-scene-item]");
      items.forEach(function (item) {
        // Scene items are driven by scroll progress, not the reveal fade
        item.classList.remove("reveal", "reveal-delay-1", "reveal-delay-2", "reveal-delay-3");
      });
      // data-scene-end="0.75" makes all items finish by 75% of the pin,
      // leaving the remainder as a quiet reading hold before release.
      var endF = parseFloat(scene.getAttribute("data-scene-end")) || 1;
      // data-scene-lead brings the first item in as soon as the section
      // settles into place (the rest follow evenly), instead of waiting
      // a full step.
      var lead = scene.hasAttribute("data-scene-lead");
      tracked.push({ el: scene, items: items, endF: endF, lead: lead, on: -1 });
    });

    function update() {
      var vh = window.innerHeight;

      tracked.forEach(function (scene) {
        var rect = scene.el.getBoundingClientRect();
        var travel = rect.height - vh;
        var p = travel > 0 ? Math.min(Math.max(-rect.top / travel, 0), 1) : 1;
        // Continuous progress for CSS-driven scrubbing (e.g. the stamp CTA)
        scene.el.style.setProperty("--sp", p.toFixed(4));
        var n = scene.items.length;
        var on = 0;
        for (var i = 0; i < n; i++) {
          var step = scene.lead ? i / n : (i + 1) / (n + 1);
          var isOn = p >= Math.max(step * scene.endF, 0.015);
          scene.items[i].classList.toggle("is-on", isOn);
          if (isOn) on++;
        }
        // --depth: how many shown items sit on top of each one (0 = front).
        // The case-study deck uses it to stack cards back like a hand of cards.
        if (on !== scene.on) {
          scene.on = on;
          for (var j = 0; j < n; j++) {
            scene.items[j].style.setProperty("--depth", Math.max(on - 1 - j, 0));
          }
        }
      });

      if (zoomEl) {
        var zr = zoomEl.getBoundingClientRect();
        var zp = Math.min(Math.max((vh - zr.top) / (vh * 0.85), 0), 1);
        zoomEl.style.setProperty("--zoom-progress", zp.toFixed(4));
      }
    }

    var sceneTicking = false;
    window.addEventListener("scroll", function () {
      if (!sceneTicking) {
        sceneTicking = true;
        requestAnimationFrame(function () {
          update();
          sceneTicking = false;
        });
      }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* ------------------------------------------------------------------
     2d. PHOTO-BAND PARALLAX
     Images inside [data-parallax] bands drift gently against the scroll
     (a few percent, nothing more). Off under reduced motion.
     ------------------------------------------------------------------ */
  var parallaxImgs = document.querySelectorAll("[data-parallax] img");
  if (parallaxImgs.length && !prefersReducedMotion) {
    var plxTicking = false;
    var updateParallax = function () {
      var vh = window.innerHeight;
      parallaxImgs.forEach(function (img) {
        // Inside a pinned scene, drive the drift from the tall wrapper so
        // the image keeps moving (slower than the scroll) through the pin.
        var scene = img.closest(".scene-on");
        var ref = scene || img.parentElement;
        var rect = ref.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        var progress, shift;
        if (scene) {
          // Pinned container: the image itself must drift upward as the
          // user scrolls down (same direction as the page, just slower).
          progress = (rect.top + rect.height / 2 - vh / 2) / rect.height;
          shift = Math.max(-8, Math.min(8, progress * 16));
        } else {
          progress = (rect.top + rect.height / 2 - vh / 2) / vh;
          shift = progress * -6;
        }
        img.style.transform = "translateY(" + shift.toFixed(2) + "%)";
      });
      plxTicking = false;
    };
    window.addEventListener("scroll", function () {
      if (!plxTicking) { plxTicking = true; requestAnimationFrame(updateParallax); }
    }, { passive: true });
    updateParallax();
  }

  /* ------------------------------------------------------------------
     3. ANIMATED STATISTICS
     Any element like <span data-count="42" data-suffix="K+">42K+</span>
     counts up from zero when scrolled into view.
     ------------------------------------------------------------------ */
  var counters = document.querySelectorAll("[data-count]");

  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1400; // ms
    var start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      // ease-out curve so the number slows down as it lands
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (counters.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      // Leave the final numbers as written in the HTML.
    } else {
      var counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              runCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) { counterObserver.observe(el); });
    }
  }

  /* ------------------------------------------------------------------
     4. CATEGORY FILTERS (Work page)
     Buttons carry data-filter="esg" etc.; items carry
     data-categories="esg ai research". "all" shows everything.
     ------------------------------------------------------------------ */
  var filterBar = document.querySelector("[data-filter-bar]");

  if (filterBar) {
    var filterButtons = filterBar.querySelectorAll(".filter-btn");
    var filterItems = document.querySelectorAll("[data-categories]");
    var filterCount = document.querySelector("[data-filter-count]");

    var caseTotal = document.querySelectorAll(".case[data-categories]").length || filterItems.length;

    function updateFilterCount(filter, visible) {
      if (!filterCount) return;
      filterCount.textContent =
        filter === "all"
          ? "Showing all " + caseTotal + " case studies"
          : "Showing " + visible + " of " + caseTotal + " case studies";
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");
        var visible = 0;
        var dealDelay = 0;

        filterButtons.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });

        filterItems.forEach(function (item) {
          var cats = item.getAttribute("data-categories").split(/\s+/);
          var show = filter === "all" || cats.indexOf(filter) !== -1;
          item.classList.toggle("is-filtered-out", !show);
          if (show) {
            // Chapter-break headers filter with their group but aren't counted
            if (item.classList.contains("case")) visible++;
            // Re-deal the matching cases with a small staggered pop
            if (!prefersReducedMotion) {
              item.classList.remove("filter-pop");
              void item.offsetWidth; // restart the animation
              item.style.animationDelay = dealDelay + "ms";
              item.classList.add("filter-pop");
              dealDelay += 60;
            }
          }
        });

        updateFilterCount(filter, visible);
      });
    });

    updateFilterCount("all", caseTotal);
  }

  /* ------------------------------------------------------------------
     5. JOURNEY PAGE — year filters + map highlighting
     Year buttons carry data-year="2024". Cities on the SVG map carry
     data-city="rome". Panels carry data-year-panel="2024" and list
     their active cities in data-cities="rome brussels".
     ------------------------------------------------------------------ */
  var yearBar = document.querySelector("[data-year-bar]");

  if (yearBar) {
    var yearButtons = yearBar.querySelectorAll(".filter-btn");
    var yearPanels = document.querySelectorAll("[data-year-panel]");
    var mapCities = document.querySelectorAll(".journey-map .city");

    function activateYear(year) {
      yearButtons.forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-year") === year ? "true" : "false");
      });

      var activeCities = [];
      yearPanels.forEach(function (panel) {
        var isActive = panel.getAttribute("data-year-panel") === year;
        panel.classList.toggle("is-active", isActive);
        if (isActive) {
          activeCities = (panel.getAttribute("data-cities") || "").split(/\s+/);
        }
      });

      mapCities.forEach(function (city) {
        var id = city.getAttribute("data-city");
        var highlight = year === "all" || activeCities.indexOf(id) !== -1;
        city.classList.toggle("is-active", year !== "all" && highlight);
        city.classList.toggle("is-dim", year !== "all" && !highlight);
      });
    }

    yearButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateYear(btn.getAttribute("data-year"));
      });
    });

    activateYear("all");
  }

  /* ------------------------------------------------------------------
     6. CONTACT FORM
     a) When a topic is chosen, a suggested opening is inserted into the
        message box — but only if the visitor hasn't already typed
        something of their own (so we never overwrite their words).
     b) On submit, the form composes an email in the visitor's own
        email app (mailto:). No server needed.
     ------------------------------------------------------------------ */
  var contactForm = document.querySelector("[data-contact-form]");

  if (contactForm) {
    var topicSelect = contactForm.querySelector("#topic");
    var messageBox = contactForm.querySelector("#message");
    var lastInserted = "";

    // EDIT THE PRE-TYPED MESSAGES HERE.
    // The keys must match the <option value="..."> values in contact.html.
    var starters = {
      policy:
        "Hi Alessia,\n\nI'm reaching out because I'd like to discuss a potential opportunity related to policy / public affairs...",
      esg:
        "Hi Alessia,\n\nI'm reaching out regarding a potential opportunity related to ESG / sustainability...",
      ai:
        "Hi Alessia,\n\nI'm reaching out because I'd like to discuss a potential opportunity related to AI governance / responsible technology...",
      research:
        "Hi Alessia,\n\nI'm reaching out to explore a potential research collaboration...",
      speaking:
        "Hi Alessia,\n\nI'm reaching out about a potential speaking or event opportunity...",
      collaboration:
        "Hi Alessia,\n\nI'm reaching out because I'd like to explore a potential collaboration...",
      other:
        "Hi Alessia,\n\n"
    };

    if (topicSelect && messageBox) {
      topicSelect.addEventListener("change", function () {
        var starter = starters[topicSelect.value];
        if (!starter) return;
        // Only replace the box if it is empty or still holds a previous
        // suggestion — never overwrite something the visitor typed.
        if (messageBox.value.trim() === "" || messageBox.value === lastInserted) {
          messageBox.value = starter;
          lastInserted = starter;
        }
      });
    }

    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = (contactForm.querySelector("#name") || {}).value || "";
      var org = (contactForm.querySelector("#organisation") || {}).value || "";
      var email = (contactForm.querySelector("#email") || {}).value || "";
      var topicLabel = topicSelect
        ? topicSelect.options[topicSelect.selectedIndex].text
        : "";
      var message = messageBox ? messageBox.value : "";

      var subject = "Website enquiry — " + (topicLabel || "General");
      var bodyLines = [
        message,
        "",
        "—",
        "Name: " + name,
        org ? "Organisation: " + org : null,
        "Email: " + email
      ].filter(Boolean);

      window.location.href =
        "mailto:alessiacanuto@hotmail.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(bodyLines.join("\n"));

      // Let the visitor know what just happened (the note is aria-live,
      // so screen readers announce it too).
      var statusNote = contactForm.querySelector("[data-form-status]");
      if (statusNote) {
        statusNote.textContent =
          "Your email app should now be open with the message ready — nothing is sent until you press send there.";
      }
    });
  }
})();
