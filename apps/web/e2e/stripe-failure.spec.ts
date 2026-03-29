import { test, expect } from "@playwright/test";
import { fillStripeCheckout, cancelStripeCheckout, complete3DSAuth, TEST_CARDS } from "./helpers/stripe";

test.describe("Stripe payment failure and edge cases", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("S-04: Card decline shows error on Stripe Checkout", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Click Plus purchase button
    const buyBtn = page.locator('button:has-text("始める"), button:has-text("Subscribe")').first();
    await buyBtn.click();

    // Fill with declined card
    await fillStripeCheckout(page, TEST_CARDS.decline);

    // Should stay on Stripe Checkout with error message
    await page.waitForTimeout(5_000);
    expect(page.url()).toContain("checkout.stripe.com");

    // Should NOT redirect to success
    expect(page.url()).not.toContain("/purchase/success");

    // Stripe shows an error message for declined cards
    const errorText = page.locator('[class*="error"], [role="alert"], .FieldError');
    await expect(errorText.first()).toBeVisible({ timeout: 10_000 });
  });

  test("S-05: Cancel from Stripe Checkout redirects to /purchase/cancel", async ({
    page,
  }) => {
    await page.goto("/pricing");

    const buyBtn = page.locator('button:has-text("始める"), button:has-text("Subscribe")').first();
    await buyBtn.click();

    await cancelStripeCheckout(page);

    // Should redirect to cancel page
    await page.waitForURL(/\/purchase\/cancel/, { timeout: 30_000 });
    expect(page.url()).toContain("/purchase/cancel");

    // Cancel page should have a link back to pricing
    const pricingLink = page.locator('a[href*="/pricing"]');
    await expect(pricingLink.first()).toBeVisible({ timeout: 10_000 });
  });

  test("S-06: 3D Secure authentication flow", async ({ page }) => {
    await page.goto("/pricing");

    const buyBtn = page.locator('button:has-text("始める"), button:has-text("Subscribe")').first();
    await buyBtn.click();

    // Fill with 3DS card
    await fillStripeCheckout(page, TEST_CARDS.threeDSecure);

    // 3DS authentication page should appear
    await page.waitForTimeout(3_000);

    // Complete 3DS authentication
    await complete3DSAuth(page);

    // Should redirect to success page after 3DS
    await page.waitForURL(/\/purchase\/success/, { timeout: 60_000 });
    expect(page.url()).toContain("/purchase/success");
  });
});
