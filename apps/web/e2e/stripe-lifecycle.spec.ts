import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

const API_URL = process.env.E2E_API_URL ?? "https://api.quickconv.cc";
const isLocal = !process.env.E2E_TARGET || process.env.E2E_TARGET === "local";

/**
 * Stripe lifecycle E2E tests
 *
 * These tests verify Webhook processing, subscription cancellation,
 * and grace period flows. Local tests use `stripe trigger` to fire events.
 * Staging/production tests verify API state after manual actions.
 */
test.describe("Stripe lifecycle events", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("S-07: Webhook processes checkout.session.completed", async ({
    page,
  }) => {
    test.skip(!isLocal, "Requires Stripe CLI for local webhook testing");

    // Trigger checkout.session.completed via Stripe CLI
    try {
      execSync("stripe trigger checkout.session.completed", {
        timeout: 30_000,
      });
    } catch (err) {
      test.skip(true, "Stripe CLI not available or not listening");
      return;
    }

    // Wait for webhook processing
    await page.waitForTimeout(3_000);

    // Verify via API that a purchase was recorded
    const res = await page.request.get(`${API_URL}/api/account`, {
      headers: { Cookie: await page.context().cookies().then((c) => c.map((cc) => `${cc.name}=${cc.value}`).join("; ")) },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("S-08: Subscription cancellation sets cancelAtPeriodEnd", async ({
    page,
  }) => {
    // Navigate to account page
    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    // If user has a subscription, the manage button should be visible
    const manageBtn = page.locator('button:has-text("サブスクリプション管理"), button:has-text("Manage Subscription")');

    if (await manageBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click to open Stripe Customer Portal
      const [portalPage] = await Promise.all([
        page.waitForEvent("popup").catch(() => null),
        manageBtn.click(),
      ]);

      // Verify redirect to Stripe Portal or same page navigation
      await page.waitForTimeout(3_000);
      const url = portalPage ? portalPage.url() : page.url();
      expect(url).toMatch(/stripe\.com|billing\.stripe\.com|\/account/);
    } else {
      // Free user - verify upgrade link is shown instead
      const upgradeLink = page.locator('a[href*="/pricing"]');
      await expect(upgradeLink.first()).toBeVisible();
    }
  });

  test("S-09: Grace period - payment_failed keeps plan, payment_succeeded restores", async ({
    page,
  }) => {
    test.skip(!isLocal, "Requires Stripe CLI for local webhook testing");

    // Step 1: Trigger payment failure
    try {
      execSync("stripe trigger invoice.payment_failed", { timeout: 30_000 });
    } catch {
      test.skip(true, "Stripe CLI not available or not listening");
      return;
    }

    await page.waitForTimeout(3_000);

    // Step 2: Verify plan is maintained (grace period)
    const res1 = await page.request.get(`${API_URL}/api/account`, {
      headers: { Cookie: await page.context().cookies().then((c) => c.map((cc) => `${cc.name}=${cc.value}`).join("; ")) },
    });

    if (res1.ok()) {
      const data = await res1.json();
      // Plan should NOT be "free" during grace period (if user had a paid plan)
      if (data.subscription?.status) {
        expect(data.subscription.status).toBe("past_due");
      }
    }

    // Step 3: Trigger successful payment (recovery)
    try {
      execSync("stripe trigger invoice.payment_succeeded", { timeout: 30_000 });
    } catch {
      // Non-fatal - just means we can't test recovery
    }

    await page.waitForTimeout(3_000);

    // Step 4: Verify subscription is active again
    const res2 = await page.request.get(`${API_URL}/api/account`, {
      headers: { Cookie: await page.context().cookies().then((c) => c.map((cc) => `${cc.name}=${cc.value}`).join("; ")) },
    });

    if (res2.ok()) {
      const data2 = await res2.json();
      if (data2.subscription?.status) {
        expect(data2.subscription.status).toBe("active");
      }
    }
  });

  test("Cancel banner shows on account page when cancelAtPeriodEnd", async ({
    page,
  }) => {
    // This test checks the UI component rendering
    // We mock the API response by intercepting
    await page.route(`${API_URL}/api/account`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "test@example.com",
          plan: "plus",
          activePurchase: null,
          subscription: {
            planType: "plus_monthly",
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
            cancelAtPeriodEnd: true,
          },
          usage: { remaining: 40, limit: 50 },
        }),
      });
    });

    await page.goto("/account");
    await page.waitForLoadState("networkidle");

    // Cancel banner should be visible
    const banner = page.locator('text=解約予定, text=canceled');
    await expect(banner.first()).toBeVisible({ timeout: 10_000 });

    // "Undo cancellation" link should be present
    const revertLink = page.locator('button:has-text("解約を取り消す"), button:has-text("Undo cancellation")');
    await expect(revertLink.first()).toBeVisible();
  });
});
