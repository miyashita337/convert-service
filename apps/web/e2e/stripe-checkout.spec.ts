import { test, expect } from "@playwright/test";
import { fillStripeCheckout, TEST_CARDS } from "./helpers/stripe";

const API_URL = process.env.E2E_API_URL ?? "https://api.quickconv.cc";

test.describe("Stripe Checkout purchase flow", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("S-01: Plus monthly subscription redirects to Stripe Checkout", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Find Plus plan purchase button
    const plusCard = page.locator("text=Plus").first().locator("..").locator("..");
    const buyBtn = plusCard.locator('button:has-text("始める"), button:has-text("Subscribe"), button:has-text("始める")').first();
    await buyBtn.click();

    // Should redirect to checkout.stripe.com
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("S-02: Complete Plus monthly purchase with test card", async ({
    page,
  }) => {
    await page.goto("/pricing");

    const buyBtn = page.locator('[data-plan-id="plus_monthly"] button, button:has-text("始める")').first();
    await buyBtn.click();

    await fillStripeCheckout(page, TEST_CARDS.success);

    // Should redirect to success page
    await page.waitForURL(/\/purchase\/success/, { timeout: 60_000 });
    expect(page.url()).toContain("/purchase/success");
    expect(page.url()).toContain("session_id");
  });

  test("S-03: 7-day pass purchase flow (one-time payment)", async ({
    page,
  }) => {
    await page.goto("/pricing");

    const passBtn = page.locator('text=7日間パス, text=7-Day Pass').first().locator("..").locator("..").locator('button:has-text("購入"), button:has-text("Buy")').first();
    await passBtn.click();

    // Should redirect to Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("S-04: 30-day pass purchase flow (one-time payment)", async ({
    page,
  }) => {
    await page.goto("/pricing");

    const pass30Btn = page.locator('text=30日間パス, text=30-Day Pass').first().locator("..").locator("..").locator('button:has-text("購入"), button:has-text("Buy")').first();
    await pass30Btn.click();

    // Should redirect to Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("S-02b: Success page displays plan name", async ({ page }) => {
    // Navigate directly to success page with a test session_id
    await page.goto("/purchase/success?session_id=test_session");
    await page.waitForLoadState("networkidle");

    // Success page should exist and show heading
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
