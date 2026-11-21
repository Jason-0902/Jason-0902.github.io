import AxeBuilder from "@axe-core/playwright";
import { MAIN_PAGES, expect, test } from "./fixtures.mjs";

for (const { path, heading, nav } of MAIN_PAGES) {
  test.describe(`page ${path}`, () => {
    test("renders with a single h1, title and description", async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(heading);
      await expect(page).toHaveTitle(/Jason Liu/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /^.{50,160}$/);
      if (nav) {
        await expect(page.locator(".site-nav a[aria-current='page']")).toHaveText(nav);
      }
    });

    test("has no horizontal overflow", async ({ page }) => {
      await page.goto(path);
      // Compare with the device viewport, not window.innerWidth: mobile browsers widen innerWidth to fit overflowing content.
      const viewport = page.viewportSize()?.width ?? 0;
      const overflow = (await page.evaluate(() => document.documentElement.scrollWidth)) - viewport;
      expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(0);
    });

    for (const theme of ["dark", "light"]) {
      test(`has no axe violations in ${theme} theme`, async ({ page }) => {
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
      });
    }
  });
}

test("navigation links reach every main page", async ({ page }) => {
  await page.goto("/");
  for (const { path, nav } of MAIN_PAGES.filter((item) => item.nav)) {
    await page.locator(".site-nav").getByRole("link", { name: nav, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator(".site-nav a[aria-current='page']")).toHaveText(nav);
  }
  await page.getByRole("link", { name: "Jason Liu", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("theme toggle switches theme and persists across pages", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("theme", "dark");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");
  const toggle = page.locator("[data-theme-toggle]");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to light theme");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to dark theme");
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/cv/");
  await expect(html).toHaveAttribute("data-theme", "light");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBg).not.toBe(lightBg);
});

test("default theme follows the system preference", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.close();
});
