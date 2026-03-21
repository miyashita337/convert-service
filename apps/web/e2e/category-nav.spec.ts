import { test, expect } from "@playwright/test";

test.describe("Category navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/QuickConv/i);
  });

  test("header displays category links on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: /image/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /video/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /audio/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /pdf/i })).toBeVisible();
  });

  test("category links point to correct URLs", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const header = page.locator("header");

    const imageLink = header.getByRole("link", { name: /image/i });
    await expect(imageLink).toHaveAttribute("href", /\/$/);

    const videoLink = header.getByRole("link", { name: /video/i });
    await expect(videoLink).toHaveAttribute("href", /\/convert\/mp4-to-gif/);

    const audioLink = header.getByRole("link", { name: /audio/i });
    await expect(audioLink).toHaveAttribute("href", /\/convert\/mp3-to-wav/);

    const pdfLink = header.getByRole("link", { name: /pdf/i });
    await expect(pdfLink).toHaveAttribute("href", /\/convert\/jpg-to-pdf/);
  });

  test("mobile menu shows category links", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Category links should be hidden on mobile
    const header = page.locator("header");
    const desktopNav = header.locator(".hidden.md\\:flex");
    await expect(desktopNav).not.toBeVisible();

    // Open hamburger menu
    const menuButton = header.getByRole("button", { name: /toggle menu/i });
    await menuButton.click();

    // Category links should now be visible in the mobile menu
    await expect(header.getByRole("link", { name: /image/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /video/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /audio/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /pdf/i })).toBeVisible();
  });

  test("footer displays category-based conversion lists", async ({ page }) => {
    const footer = page.locator("footer");

    // Check that category headers exist in footer
    await expect(footer.getByText("Image")).toBeVisible();
    await expect(footer.getByText("Video")).toBeVisible();
    await expect(footer.getByText("Audio")).toBeVisible();
    await expect(footer.getByText("PDF")).toBeVisible();

    // Check representative conversions under each category
    await expect(
      footer.getByRole("link", { name: /HEIC.*JPG/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /MP4.*GIF/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /MP3.*WAV/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /JPG.*PDF/i }),
    ).toBeVisible();
  });

  test("Image category is highlighted on homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const header = page.locator("header");
    const imageLink = header.getByRole("link", { name: /image/i });

    // Image link should have the active highlight class
    await expect(imageLink).toHaveClass(/bg-primary/);
  });
});
