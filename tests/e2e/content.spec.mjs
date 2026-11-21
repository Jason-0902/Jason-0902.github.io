import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures.mjs";

const projects = JSON.parse(readFileSync(new URL("../../src/data/projects.json", import.meta.url), "utf8"));

test("projects page lists every project with a working detail page", async ({ page }) => {
  await page.goto("/projects/");
  const cards = page.locator(".project-card");
  await expect(cards).toHaveCount(projects.length);
  for (const project of projects) {
    const card = cards.filter({ has: page.getByRole("heading", { name: project.name, exact: true }) });
    if (project.status) await expect(card).toContainText(`Status: ${project.status}`);
    else await expect(card.locator(".status")).toHaveCount(0);
    if (project.repo)
      await expect(card.getByRole("link", { name: "Repository" })).toHaveAttribute("href", project.repo);
  }
  const unpublished = projects.find((project) => !project.repo);
  await page.getByRole("link", { name: unpublished.name, exact: true }).click();
  await expect(page.locator("h1")).toHaveText(unpublished.name);
  await expect(page.getByText("The repository is not public yet.")).toBeVisible();
});

test("blog lists writeups by category and opens a rendered post", async ({ page }) => {
  await page.goto("/blog/");
  for (const category of ["Reverse Engineering", "Web Security"]) {
    const section = page.locator("section", { has: page.getByRole("heading", { name: new RegExp(category) }) });
    expect(await section.locator(".post-list a").count()).toBeGreaterThan(5);
  }
  await page.getByRole("link", { name: "SQLi 1", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("SQLi 1");
  await expect(page.locator(".post .prose pre code").first()).toBeVisible();
  await expect(page.locator(".post script")).toHaveCount(0);
});

test("unknown URLs get the 404 page", async ({ page }) => {
  const response = await page.goto("/does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
});

test("every page in the sitemap loads without horizontal overflow", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>https:\/\/jason-0902\.github\.io([^<]*)<\/loc>/g)].map((match) => match[1]);
  expect(paths.length).toBeGreaterThan(40);
  const viewport = page.viewportSize()?.width ?? 0;
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, `${path} overflows the viewport`).toBeLessThanOrEqual(viewport);
  }
});
