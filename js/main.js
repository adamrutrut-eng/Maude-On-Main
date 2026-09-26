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

  /* Live stock check. On Netlify, /shopify/* is proxied to the store's public
     JSON (see netlify.toml), so the page can confirm each card is still in
     stock and which sizes are left before anyone clicks. Anywhere else the
     request fails and the cards stay as the last sync left them. */
  var grid = document.querySelector(".products[data-live-collection]");
  if (grid && window.fetch && "AbortController" in window) {
    var money = function (value) { return "$" + Number(value).toFixed(2); };
    var SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "1X", "2X", "3X", "4X"];
    var sizeRank = function (v) {
      var i = SIZE_ORDER.indexOf(String(v).toUpperCase());
      if (i !== -1) return i;
      var n = parseFloat(v);
      return isFinite(n) ? 100 + n : 1000;
    };
    var sizeLine = function (product, available) {
      var options = product.options || [];
      var index = -1;
      options.forEach(function (option, i) { if (index === -1 && /size|ring/i.test(option.name)) index = i; });
      if (index === -1) return options.length === 1 && /^title$/i.test(options[0].name) ? "One size" : "";
      var key = "option" + (index + 1);
      var values = [];
      available.forEach(function (v) { if (v[key] && values.indexOf(v[key]) === -1) values.push(v[key]); });
      if (!values.length || (values.length === 1 && values[0] === "Default Title")) return "One size";
      values.sort(function (a, b) { return sizeRank(a) - sizeRank(b); });
      return (values.length === 1 ? "Size " : "Sizes ") + values.join(" \u00b7 ");
    };
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 6000);
    var handle = grid.getAttribute("data-live-collection");
    fetch("/shopify/collections/" + encodeURIComponent(handle) + "/products.json?limit=250", {
      signal: controller.signal,
      headers: { accept: "application/json" }
    })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function (data) {
        clearTimeout(timer);
        var byHandle = {};
        (data.products || []).forEach(function (product) { byHandle[product.handle] = product; });
        grid.querySelectorAll(".product[data-handle]").forEach(function (card) {
          var product = byHandle[card.getAttribute("data-handle")];
          if (!product) return; // left the collection; the scheduled sync retires it
          var available = product.variants.filter(function (v) { return v.available; });
          var media = card.querySelector(".product__media");
          if (!available.length) {
            card.classList.add("is-sold-out");
            if (media && !media.querySelector(".product__badge")) {
              var badge = document.createElement("span");
              badge.className = "product__badge";
              badge.textContent = "Sold out";
              media.appendChild(badge);
            }
            return;
          }
          var sizes = card.querySelector(".product__sizes");
          var sizeText = sizeLine(product, available);
          if (sizes && sizeText) sizes.textContent = sizeText;
          var prices = available.map(function (v) { return Number(v.price); });
          var low = Math.min.apply(null, prices);
          var varies = prices.some(function (p) { return p !== low; });
          var compare = available.map(function (v) { return Number(v.compare_at_price); }).filter(function (n) { return n > low; });
          var price = card.querySelector(".product__price");
          if (price) {
            price.textContent = "";
            if (compare.length && !varies) {
              var was = document.createElement("s");
              was.textContent = money(Math.max.apply(null, compare));
              price.appendChild(was);
              price.appendChild(document.createTextNode(" "));
            }
            price.appendChild(document.createTextNode((varies ? "From " : "") + money(low)));
          }
        });
      })
      .catch(function () { clearTimeout(timer); });
  }

  /* Footer year */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
