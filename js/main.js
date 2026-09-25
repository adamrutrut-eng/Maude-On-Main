/* Maude on Main — small progressive enhancements. No dependencies. */
(function () {
  "use strict";

  var body = document.body;
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  /* Mobile navigation drawer */
  function setNav(open) {
    body.classList.toggle("nav-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNav(false);
    });
    var desktop = window.matchMedia("(min-width: 901px)");
    if (desktop.addEventListener) desktop.addEventListener("change", function () { setNav(false); });
  }

  /* Header shadow once the page scrolls */
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Hero video: respect reduced motion, expose a play/pause control,
     and fall back to the poster if autoplay is blocked. */
  var video = document.querySelector(".hero__video");
  var control = document.querySelector(".hero__toggle");
  if (video && control) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    var setState = function (playing) {
      control.dataset.state = playing ? "playing" : "paused";
      control.setAttribute("aria-pressed", String(playing));
      control.setAttribute("aria-label", playing ? "Pause background video" : "Play background video");
    };
    var tryPlay = function () {
      var attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(function () { setState(true); }).catch(function () { setState(false); });
      }
    };

    if (reduceMotion.matches) {
      video.removeAttribute("autoplay");
      video.pause();
      setState(false);
    } else {
      tryPlay();
    }

    control.addEventListener("click", function () {
      if (video.paused) {
        tryPlay();
      } else {
        video.pause();
        setState(false);
      }
    });
    video.addEventListener("play", function () { setState(true); });
    video.addEventListener("pause", function () { setState(false); });
  }

  /* Reveal sections as they scroll into view */
  var targets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    targets.forEach(function (el) { observer.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Footer year */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
