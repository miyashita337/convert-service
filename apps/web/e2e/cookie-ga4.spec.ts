import { test, expect } from "@playwright/test";

const GA_SCRIPT_URL = "googletagmanager.com/gtag/js";

test.describe("Cookie consent and GA4 integration", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookie consent state before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("qc_cookie_consent"));
    await page.reload();
  });

  test("GA4 script is NOT loaded before cookie consent", async ({ page }) => {
    // Wait for page to fully load
    await expect(page).toHaveTitle(/QuickConv/i);

    // Verify cookie consent banner is visible
    const acceptButton = page.getByRole("button", { name: /accept/i });
    await expect(acceptButton).toBeVisible({ timeout: 10_000 });

    // Verify GA4 script is NOT present
    const gaScript = page.locator(`script[src*="${GA_SCRIPT_URL}"]`);
    await expect(gaScript).toHaveCount(0);
  });

  test("GA4 script loads immediately after accepting cookies (no reload)", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/QuickConv/i);

    // Set up a promise to detect the GA4 network request
    const gaRequestPromise = page.waitForRequest(
      (req) => req.url().includes(GA_SCRIPT_URL),
      { timeout: 10_000 },
    );

    // Click accept
    const acceptButton = page.getByRole("button", { name: /accept/i });
    await expect(acceptButton).toBeVisible({ timeout: 10_000 });
    await acceptButton.click();

    // Verify GA4 script request was made (without reload)
    const gaRequest = await gaRequestPromise;
    expect(gaRequest.url()).toContain(GA_SCRIPT_URL);
  });

  test("GA4 script does NOT load after rejecting cookies", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/QuickConv/i);

    // Click reject
    const rejectButton = page.getByRole("button", { name: /reject|decline/i });
    await expect(rejectButton).toBeVisible({ timeout: 10_000 });
    await rejectButton.click();

    // Wait a bit for any potential async loading
    await page.waitForTimeout(2_000);

    // Verify GA4 script is NOT present
    const gaScript = page.locator(`script[src*="${GA_SCRIPT_URL}"]`);
    await expect(gaScript).toHaveCount(0);
  });
});
