// Progressive enhancement only: every page works and shows all content without this script.
(() => {
  const root = document.documentElement;

  // Theme toggle.
  const toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    const label = () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      toggle.setAttribute("aria-label", `Switch to ${next} theme`);
    };
    toggle.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", root.dataset.theme);
      } catch {
        // Storage can be blocked (private mode); the theme still applies for this page view.
      }
      label();
    });
    label();
  }

  // Header gets a shadow once the page has scrolled.
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Everything below is motion; skip it entirely when the visitor asks for reduced motion.
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  root.classList.add("motion");

  // Terminal panel: type each command in turn, then show its output.
  const terminal = document.querySelector(".terminal");
  if (terminal) {
    let delay = 0.35;
    for (const dt of terminal.querySelectorAll("dt")) {
      const chars = dt.textContent.length + 2; // + "$ " prompt
      const duration = Math.min(0.9, 0.045 * chars);
      dt.style.setProperty("--chars", String(chars));
      dt.style.setProperty("--type-delay", `${delay}s`);
      dt.style.setProperty("--type-duration", `${duration}s`);
      delay += duration + 0.08;
      const dd = dt.nextElementSibling;
      if (dd?.tagName === "DD") dd.style.setProperty("--out-delay", `${delay}s`);
      delay += 0.22;
    }
    terminal.style.setProperty("--done-delay", `${delay}s`);
    terminal.classList.add("is-typing");
  }

  // Reveal blocks that start below the fold as they scroll into view.
  // Anything already on screen at load is left alone, so nothing visible flickers and LCP is unaffected.
  if ("IntersectionObserver" in window) {
    const targets = document.querySelectorAll(
      "main > .section, main > article > .section, .card-grid > .card, .timeline-item, .folder-root",
    );
    const below = [...targets].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    below.forEach((el) => {
      const siblings = el.parentElement ? [...el.parentElement.children] : [];
      el.style.setProperty("--stagger", String(Math.min(siblings.indexOf(el), 6) % 3));
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  // Pointer spotlight on the page background and on cards (mouse and pen only).
  if (window.matchMedia("(pointer: fine)").matches) {
    let frame = 0;
    let x = 0;
    let y = 0;
    window.addEventListener(
      "pointermove",
      (event) => {
        x = event.clientX;
        y = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          root.style.setProperty("--spot-x", `${x}px`);
          root.style.setProperty("--spot-y", `${y}px`);
          root.classList.add("has-spot");
        });
      },
      { passive: true },
    );
    for (const card of document.querySelectorAll(".card")) {
      card.addEventListener("pointermove", (event) => {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--card-x", `${event.clientX - box.left}px`);
        card.style.setProperty("--card-y", `${event.clientY - box.top}px`);
      });
    }
  }
})();
