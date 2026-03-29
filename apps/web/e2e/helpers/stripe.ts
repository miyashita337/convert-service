import type { Page } from "@playwright/test";

/** Stripe test card numbers */
export const TEST_CARDS = {
  success: "4242424242424242",
  decline: "4000000000009995",
  threeDSecure: "4000002500003155",
} as const;

/** Fill Stripe Checkout form with test card */
export async function fillStripeCheckout(
  page: Page,
  cardNumber: string = TEST_CARDS.success
) {
  // Wait for Stripe checkout page to load
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

  // Card number - Stripe uses iframes, need to handle carefully
  const cardFrame = page.frameLocator("iframe[name*='__privateStripeFrame']").first();

  // Try standard input selectors
  const cardInput = page.locator('[autocomplete="cc-number"], [placeholder*="Card number"], [placeholder*="カード番号"]').first();
  if (await cardInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await cardInput.fill(cardNumber);
  } else {
    // Fallback: direct page input
    await page.locator("#cardNumber, input[data-elements-stable-field-name='cardNumber']").first().fill(cardNumber);
  }

  // Expiry
  const expiryInput = page.locator('[autocomplete="cc-exp"], [placeholder*="MM / YY"], [placeholder*="MM/YY"]').first();
  await expiryInput.fill("12/34");

  // CVC
  const cvcInput = page.locator('[autocomplete="cc-csc"], [placeholder*="CVC"], [placeholder*="セキュリティコード"]').first();
  await cvcInput.fill("123");

  // Cardholder name (if present)
  const nameInput = page.locator('[autocomplete="cc-name"], [placeholder*="Name"], [placeholder*="名前"]').first();
  if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await nameInput.fill("Test User");
  }

  // Submit payment
  const submitBtn = page.locator('button[type="submit"], .SubmitButton, [data-testid="hosted-payment-submit-button"]').first();
  await submitBtn.click();
}

/** Handle 3D Secure authentication test page */
export async function complete3DSAuth(page: Page) {
  // Stripe test 3DS page has "Complete authentication" and "Fail authentication" buttons
  const frame = page.frameLocator("iframe").first();

  // Try nested iframe structure (Stripe sometimes nests)
  try {
    const completeBtn = frame.locator('button:has-text("Complete"), #test-source-authorize-3ds');
    if (await completeBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await completeBtn.click();
      return;
    }
  } catch {
    // Try page-level
  }

  // Fallback: look for button directly on page
  const pageBtn = page.locator('button:has-text("Complete authentication"), button:has-text("Complete")');
  if (await pageBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await pageBtn.click();
  }
}

/** Click the back/cancel link on Stripe Checkout page */
export async function cancelStripeCheckout(page: Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  // Stripe has a back arrow or "Back" link
  const backLink = page.locator('a[data-testid="back-link"], a:has-text("Back"), a:has-text("戻る"), .Header-backArrow').first();
  await backLink.click();
}
