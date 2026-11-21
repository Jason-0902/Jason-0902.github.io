import { MAIN_PAGES, expect, test } from "./fixtures.mjs";

// Motion is decoration: it must never leave content hidden, and it must switch off for reduced-motion users.

const settle = (page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  );

const hiddenBlocks = () =>
  [...document.querySelectorAll("main *")].filter((el) => {
    const style = getComputedStyle(el);
    return el.getClientRects().length > 0 && Number(style.opacity) < 1 && !el.closest("[aria-hidden='true']");
  }).length;

test("reduced motion turns every animation off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/\bmotion\b/);
  const running = await page.evaluate(() => document.getAnimations().length);
  expect(running).toBe(0);
  expect(await page.evaluate(hiddenBlocks)).toBe(0);
});

test("content is fully visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".terminal dd").first()).toBeVisible();
  await settle(page);
  expect(await page.evaluate(hiddenBlocks)).toBe(0);
  await context.close();
});

for (const { path } of MAIN_PAGES) {
  test(`animations on ${path} settle with all content visible`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/\bmotion\b/);
    // Scroll through the page so every scroll-reveal block enters the viewport.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 400) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(50);
    }
    await expect(page.locator(".reveal:not(.is-visible)")).toHaveCount(0);
    // Wait for every finite animation (entrance, typing, reveal) to finish.
    await settle(page);
    await page.waitForTimeout(700); // reveal uses transitions, which settle after their duration
    expect(await page.evaluate(hiddenBlocks)).toBe(0);
  });
}
