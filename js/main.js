/* VCS Immigration — site interactions (shared by every page) */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Sticky header shadow ---------- */
  const header = document.querySelector(".header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile navigation ---------- */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const setNav = (open) => {
    if (open) {
      // grow the menu panel out of the burger, and start the links below the header
      const b = burger.getBoundingClientRect();
      nav.style.setProperty("--ox", b.left + b.width / 2 + "px");
      nav.style.setProperty("--oy", b.top + b.height / 2 + "px");
      nav.style.setProperty("--nav-top", header.getBoundingClientRect().bottom + 12 + "px");
    }
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  };
  burger.addEventListener("click", () => setNav(burger.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("is-open") && !nav.contains(e.target) && !burger.contains(e.target)) setNav(false);
  });

  /* ---------- Active nav link ----------
     Each page marks its own link with aria-current="page" in the HTML;
     mirror it onto the class the underline styles use. */
  document.querySelectorAll('.nav__list a[aria-current="page"]').forEach((a) => a.classList.add("is-active"));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // small stagger for siblings revealed together
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
        el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 80 + "ms";
        el.classList.add("is-visible");
        revealer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => revealer.observe(el));
  }

  /* ---------- Count-up stats ---------- */
  const fmt = new Intl.NumberFormat("en-US");
  const counters = document.querySelectorAll("[data-count]");
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = fmt.format(target); return; }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = "0";
    requestAnimationFrame(tick);
  };
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      runCounter(entry.target);
      countObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => countObserver.observe(c));

  /* ---------- How it works: scroll-driven timeline ----------
     The rail runs from the centre of the first step to the centre of the last.
     As the page scrolls, the fill follows a trigger line at 60% of the viewport
     height, and each step lights up once the fill reaches its node. */
  const stepsList = document.getElementById("steps");
  if (stepsList) {
    const steps = [...stepsList.querySelectorAll(".step")];
    const rail = stepsList.querySelector(".steps__rail");
    const fill = stepsList.querySelector(".steps__fill");
    let railTop = 0;
    let railLength = 0;
    let centres = [];
    let ticking = false;

    const layout = () => {
      // offsetTop is relative to .steps (position: relative) and ignores reveal transforms
      centres = steps.map((s) => s.offsetTop + s.offsetHeight / 2);
      railTop = centres[0];
      railLength = centres[centres.length - 1] - railTop;
      rail.style.top = railTop + "px";
      rail.style.height = railLength + "px";
    };

    const update = () => {
      ticking = false;
      const trigger = window.innerHeight * 0.6;
      const railScreenTop = stepsList.getBoundingClientRect().top + railTop;
      const reached = trigger - railScreenTop; // unclamped distance past the rail start
      const progress = Math.max(0, Math.min(railLength, reached));
      fill.style.height = progress + "px";
      stepsList.classList.toggle("is-filling", progress > 0 && progress < railLength);
      steps.forEach((s, i) => s.classList.toggle("is-active", reached >= centres[i] - railTop));
    };

    const requestUpdate = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    layout();
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", () => { layout(); update(); });
    window.addEventListener("load", () => { layout(); update(); });
  }

  /* ---------- Destinations slider ---------- */
  const track = document.getElementById("destTrack");
  const prev = document.getElementById("destPrev");
  const next = document.getElementById("destNext");
  if (track) {
    // Infinite loop: a cloned set on each side; when scrolling settles in a
    // clone set, jump silently by one set width back into the originals.
    const originals = [...track.children];
    const clone = (card) => {
      const c = card.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      return c;
    };
    originals.forEach((card) => track.appendChild(clone(card)));
    [...originals].reverse().forEach((card) => track.prepend(clone(card)));

    let setWidth = 0;
    const measure = () => { setWidth = originals[0].offsetLeft - track.children[0].offsetLeft; };
    const jump = (left) => {
      track.style.scrollBehavior = "auto";
      track.scrollLeft = left;
      track.style.scrollBehavior = "";
    };
    const recenter = () => {
      if (!setWidth) return;
      if (track.scrollLeft < setWidth * 0.5) jump(track.scrollLeft + setWidth);
      else if (track.scrollLeft > setWidth * 1.5) jump(track.scrollLeft - setWidth);
    };
    const step = () => originals[0].offsetWidth + 20;

    let settle;
    track.addEventListener("scroll", () => {
      clearTimeout(settle);
      settle = setTimeout(recenter, 140);
    }, { passive: true });
    prev.addEventListener("click", () => { recenter(); track.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", () => { recenter(); track.scrollBy({ left: step(), behavior: "smooth" }); });

    const init = () => { measure(); jump(setWidth); };
    window.addEventListener("resize", init);
    window.addEventListener("load", init);
    init();
  }

  /* ---------- Testimonials: infinite vertical ticker ---------- */
  const reviews = document.getElementById("reviews");
  if (reviews && !reduceMotion) {
    reviews.querySelectorAll(".reviews__col").forEach((col) => {
      const inner = col.querySelector(".reviews__inner");
      [...inner.children].forEach((card) => {
        const clone = card.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        inner.appendChild(clone);
      });
      inner.style.setProperty("--dur", (col.dataset.speed || 45) + "s");
    });
    reviews.classList.add("is-animated");
  }

  /* ---------- Testimonials: click a card to open it in a pop-up ---------- */
  if (reviews) {
    const modal = document.createElement("dialog");
    modal.className = "review-modal";
    modal.setAttribute("aria-label", "Testimonial");
    document.body.appendChild(modal);

    reviews.querySelectorAll(".review:not([aria-hidden])").forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Read review by " + card.querySelector("strong").textContent);
    });

    const open = (card) => {
      const copy = card.cloneNode(true);
      copy.removeAttribute("aria-hidden");
      copy.removeAttribute("tabindex");
      copy.removeAttribute("role");
      copy.removeAttribute("aria-label");
      modal.replaceChildren(copy);
      const close = document.createElement("button");
      close.className = "review-modal__close";
      close.setAttribute("aria-label", "Close");
      close.textContent = "×";
      close.addEventListener("click", () => modal.close());
      modal.appendChild(close);
      modal.showModal();
    };

    reviews.addEventListener("click", (e) => {
      const card = e.target.closest(".review");
      if (card) open(card);
    });
    reviews.addEventListener("keydown", (e) => {
      const card = e.target.closest(".review");
      if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(card); }
    });
    // Close when clicking the backdrop
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  }

  /* ---------- How it works: thumbnail swaps to the video on click ---------- */
  const howVideo = document.getElementById("howVideo");
  if (howVideo) {
    howVideo.addEventListener("click", () => {
      if (howVideo.classList.contains("is-playing")) return;
      const video = document.createElement("video");
      video.src = howVideo.dataset.video;
      video.controls = true;
      video.playsInline = true;
      video.poster = howVideo.querySelector(".how__thumb").src;
      howVideo.appendChild(video);
      howVideo.classList.add("is-playing");
      const credit = document.querySelector(".how__credit");
      if (credit) credit.hidden = false;
      video.play().catch(() => {});
      video.focus();
    });
  }

  /* ---------- Gallery: auto-scrolling marquee with drag ---------- */
  const gallery = document.getElementById("galleryTrack");
  if (gallery) {
    const items = [...gallery.children];
    const inner = document.createElement("div");
    inner.className = "gallery__track";
    items.forEach((item) => inner.appendChild(item));
    gallery.appendChild(inner);

    // duplicate enough times to fill wide screens seamlessly
    const originals = items.length;
    for (let i = 0; i < 2; i++) {
      items.forEach((item) => {
        const c = item.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        inner.appendChild(c);
      });
    }

    let offset = 0;
    let loopWidth = 0;
    let dragging = false;
    let hovering = false;
    let startX = 0;
    let startOffset = 0;
    let last = performance.now();
    const speed = reduceMotion ? 0 : 40; // px per second

    const measure = () => {
      const first = inner.children[0];
      const firstClone = inner.children[originals];
      loopWidth = firstClone.offsetLeft - first.offsetLeft;
    };
    const wrap = () => {
      if (!loopWidth) return;
      offset = ((offset % loopWidth) + loopWidth) % loopWidth;
    };
    // phones get a plain swipeable row instead (see CSS)
    const mobile = window.matchMedia("(max-width: 680px)");
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (mobile.matches) { requestAnimationFrame(frame); return; }
      if (!dragging && !hovering) offset += speed * dt;
      wrap();
      inner.style.transform = `translate3d(${-offset}px,0,0)`;
      requestAnimationFrame(frame);
    };

    gallery.addEventListener("pointerenter", () => { hovering = true; });
    gallery.addEventListener("pointerleave", () => { hovering = false; dragging = false; gallery.classList.remove("is-dragging"); });
    gallery.addEventListener("pointerdown", (e) => {
      if (mobile.matches) return;
      dragging = true;
      startX = e.clientX;
      startOffset = offset;
      gallery.classList.add("is-dragging");
      gallery.setPointerCapture(e.pointerId);
    });
    gallery.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      offset = startOffset - (e.clientX - startX);
    });
    const endDrag = () => { dragging = false; gallery.classList.remove("is-dragging"); };
    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    // touch devices never fire pointerleave after a tap; resume autoplay
    gallery.addEventListener("touchend", () => { hovering = false; }, { passive: true });

    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    measure();
    requestAnimationFrame(frame);
  }

  /* ---------- Enquiry form ---------- */
  const form = document.getElementById("enquiryForm");
  const status = document.getElementById("formStatus");
  if (form) {
    const validators = {
      name: (v) => v.trim().length >= 2 || "Please enter your full name.",
      phone: (v) => /^[0-9+\-\s()]{7,}$/.test(v.trim()) || "Please enter a valid phone number.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Please enter a valid email address.",
      service: (v) => !!v || "Please choose a service.",
      // country doesn't apply to Dakha Academy (schooling) enquiries
      country: (v) => !!v || form.service.value.startsWith("Dakha Academy") || "Please choose a preferred country.",
    };

    const check = (field) => {
      const rule = validators[field.name];
      if (!rule) return true;
      const result = rule(field.value);
      field.closest(".field").classList.toggle("is-invalid", result !== true);
      return result;
    };

    form.addEventListener("input", (e) => {
      if (e.target.closest(".field.is-invalid")) check(e.target);
    });
    form.addEventListener("change", (e) => {
      if (e.target.tagName === "SELECT") check(e.target);
      // switching to/from an academy enquiry changes whether country is required
      if (e.target.name === "service" && form.country.closest(".field.is-invalid")) check(form.country);
    });

    // CTA buttons can pre-select a service, e.g. the academy's demo-class button
    document.querySelectorAll("[data-service]").forEach((btn) => {
      btn.addEventListener("click", () => {
        form.service.value = btn.dataset.service;
        check(form.service);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let firstError = null;
      for (const field of form.elements) {
        const result = check(field);
        if (result !== true && !firstError) firstError = { field, message: result };
      }
      if (firstError) {
        status.textContent = firstError.message;
        status.classList.add("is-error");
        firstError.field.focus();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Sending…";
      status.classList.remove("is-error");
      status.textContent = "";

      // No backend yet — simulate a successful submission.
      setTimeout(() => {
        form.reset();
        btn.disabled = false;
        btn.textContent = "Request a Callback";
        status.textContent = "Thank you! A consultant will call you back shortly.";
      }, 900);
    });
  }
})();
