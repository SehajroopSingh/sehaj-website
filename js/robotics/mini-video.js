/* ============================================================
   Project Void film (robotics journey, last scene)
   Plays the YouTube video muted for a few seconds when the scene
   comes on, then pauses it and shows the "view the project" call.
   Uses the YouTube IFrame API, loaded on first use.
   Returns { start(), stop() } like the other minis.
   ============================================================ */
window.RoboMini = window.RoboMini || {};
window.RoboMini.video = function (el) {
  "use strict";
  var card = el.closest(".rj-card"), cta = card && card.querySelector(".rj-film-cta");
  var id = el.getAttribute("data-video"), seconds = Number(el.getAttribute("data-seconds") || 5), startAt = Number(el.getAttribute("data-start") || 0);
  var player = null, ready = false, wanted = false, timer = null;

  function loadApi(cb) {
    if (window.YT && window.YT.Player) return cb();
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); cb(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
    }
  }
  function build() {
    player = new YT.Player(el, {
      videoId: id, playerVars: { autoplay: 0, mute: 1, controls: 1, rel: 0, modestbranding: 1, playsinline: 1, start: startAt },
      events: {
        onReady: function () { ready = true; if (wanted) play(); },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING && !timer) {
            timer = setTimeout(function () { try { player.pauseVideo(); } catch (x) {} card.classList.add("rj-film-paused"); }, seconds * 1000);
          }
        },
      },
    });
  }
  function play() {
    if (!ready) return;
    card.classList.remove("rj-film-paused"); clearTimeout(timer); timer = null;
    try { player.mute(); player.seekTo(startAt, true); player.playVideo(); } catch (x) {}
  }
  return {
    start: function () {
      wanted = true; if (!player) loadApi(build); else play();
      // if the player never shows up (offline, blocked), still offer the link after the same wait
      setTimeout(function () { if (wanted && card) card.classList.add("rj-film-paused"); }, (seconds + 1.5) * 1000);
    },
    stop: function () { wanted = false; clearTimeout(timer); timer = null; if (ready) { try { player.pauseVideo(); } catch (x) {} } },
  };
};
