// Progressive enhancement only: every page works without this script.
(() => {
  const root = document.documentElement;
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;

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
})();
