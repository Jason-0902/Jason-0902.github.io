import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures.mjs";

const projects = JSON.parse(readFileSync(new URL("../../src/data/projects.json", import.meta.url), "utf8"));

test("projects page lists every project with its public repository and a working detail page", async ({ page }) => {
  await page.goto("/projects/");
  const cards = page.locator(".project-card");
  await expect(cards).toHaveCount(projects.length);
  for (const project of projects) {
    const card = cards.filter({ has: page.getByRole("heading", { name: project.name, exact: true }) });
    if (project.status) await expect(card).toContainText(`Status: ${project.status}`);
    else await expect(card.locator(".status")).toHaveCount(0);
    await expect(card.getByRole("link", { name: "Repository" })).toHaveAttribute("href", project.repo);
  }
  const first = projects[0];
  await page.getByRole("link", { name: first.name, exact: true }).click();
  await expect(page.locator("h1")).toHaveText(first.name);
  await expect(page.getByRole("link", { name: "View repository" })).toHaveAttribute("href", first.repo);
});

test("blog shows writeups as folders and opens a rendered post", async ({ page }) => {
  await page.goto("/blog/");
  const security = page.locator(".folder-root", { has: page.getByRole("heading", { name: "Security", level: 2 }) });
  await expect(security).toBeVisible();
  for (const category of ["Reverse Engineering", "Web Security"]) {
    const folder = security.locator("details.folder", {
      has: page.getByRole("heading", { name: category, level: 3 }),
    });
    await expect(folder).toHaveAttribute("open", "");
    expect(await folder.locator("a.file").count()).toBeGreaterThan(5);
  }
  // Variants of one challenge share a closed sub-folder that opens on click.
  const challenge = page.locator("details.folder", {
    has: page.locator(":scope > summary", { hasText: "A Basic cIMG" }),
  });
  await expect(challenge).not.toHaveAttribute("open", "");
  await challenge.locator("summary").click();
  await expect(challenge.getByRole("link", { name: "A Basic cIMG (C)", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "SQLi 1", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("SQLi 1");
  await expect(page.locator(".breadcrumbs")).toContainText("Blog / Security / Web Security");
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
