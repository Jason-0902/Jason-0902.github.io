import { test as base, expect } from "@playwright/test";

// Every test fails if the page logs a console error, throws, or requests a missing resource.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      // The 404 test requests a missing page on purpose; the browser logs that document's 404 as an error.
      const expected404 = message.location().url.includes("/does-not-exist");
      if (message.type() === "error" && !expected404) problems.push(`console.error: ${message.text()}`);
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.hostname === "localhost" && response.status() >= 400 && !url.pathname.startsWith("/does-not-exist")) {
        problems.push(`HTTP ${response.status()} ${url.pathname}`);
      }
    });
    await use(page);
    expect(problems, "JavaScript runtime errors or failed requests").toEqual([]);
  },
});

export { expect };

export const MAIN_PAGES = [
  { path: "/", heading: "Jason Liu", nav: null },
  { path: "/research/", heading: "Autoware Fuzzing for Autonomous Driving Systems", nav: "Research" },
  { path: "/projects/", heading: "Personal projects", nav: "Projects" },
  { path: "/blog/", heading: "Writeups", nav: "Blog" },
  { path: "/cv/", heading: "Tsung-Yen (Jason) Liu", nav: "CV" },
];
