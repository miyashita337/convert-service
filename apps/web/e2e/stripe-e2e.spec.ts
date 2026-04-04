import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const STAGING_URL = process.env.E2E_TARGET === "production"
  ? "https://quickconv.cc"
  : "https://staging.quickconv.cc";

const API_DOMAIN = process.env.E2E_TARGET === "production"
  ? "api.quickconv.cc"
  : "api-staging.quickconv.cc";

const TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12 / 30",
  cvc: "123",
  name: "TEST USER",
  postalCode: "10001",
};

/** Load JWT from auth-state.json */
function getAuthToken(): string {
  const statePath = path.join(__dirname, "auth-state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  const token = state?.cookies?.find(
    (cookie: { name?: string; value?: string }) => cookie.name === "qc_auth",
  )?.value;
  if (!token) {
    throw new Error("qc_auth token is missing in e2e/auth-state.json");
  }
  return token;
}

// Force Japanese locale so button/form labels match regardless of CI environment
test.use({ locale: "ja-JP" });

/** Fill Stripe Checkout form and submit */
async function fillStripeCheckout(page: import("@playwright/test").Page) {
  // Stripe Checkout uses locale-dependent labels; use testid/placeholder selectors for robustness
  const cardInput = page.locator('[placeholder*="1234"], [name="cardNumber"]').first();
  await cardInput.waitFor({ timeout: 30000 });
  await cardInput.fill(TEST_CARD.number);

  const expiryInput = page.locator('[placeholder*="MM"], [name="cardExpiry"]').first();
  await expiryInput.fill(TEST_CARD.expiry);

  const cvcInput = page.locator('[placeholder*="CVC"], [name="cardCvc"]').first();
  await cvcInput.fill(TEST_CARD.cvc);

  const nameInput = page.locator('[name="billingName"], [autocomplete="cc-name"]').first();
  await nameInput.fill(TEST_CARD.name);

  // Stripe requires postal code for USD transactions
  const postalInput = page.locator('[name="postalCode"], [name="billingPostalCode"], [autocomplete="postal-code"]').first();
  await postalInput.fill(TEST_CARD.postalCode);

  await page.getByTestId("hosted-payment-submit-button").click();
}

test.describe("Stripe 決済フロー", () => {
  test.beforeEach(async ({ page, context }) => {
    const token = getAuthToken();

    // Set auth cookie on API domain
    await context.addCookies([
      {
        name: "qc_auth",
        value: token,
        domain: API_DOMAIN,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
    ]);

    // Intercept /api/auth/me to ensure authenticated state in frontend
    // (workaround for cross-domain cookie restrictions in CI headless browser)
    await page.route(`**/api/auth/me`, async (route) => {
      const response = await route.fetch({
        headers: { ...route.request().headers(), Cookie: `qc_auth=${token}` },
      });
      await route.fulfill({ response });
    });

    // Intercept /api/checkout to inject cookie
    await page.route(`**/api/checkout`, async (route) => {
      const response = await route.fetch({
        headers: { ...route.request().headers(), Cookie: `qc_auth=${token}` },
      });
      await route.fulfill({ response });
    });

    await page.goto(`${STAGING_URL}/ja/pricing`);
    // Cookie同意バナーが表示されたら閉じる（React hydration 後に出現するため waitFor で待つ）
    try {
      const consent = page.getByRole("button", { name: "同意する" });
      await consent.waitFor({ state: "visible", timeout: 5000 });
      await consent.click();
      // バナーが消えるのを待つ
      await consent.waitFor({ state: "hidden", timeout: 3000 });
    } catch {
      // Cookie同意バナーが表示されない場合（既に同意済み等）は無視
    }
  });

  test("Plus月額サブスク購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "始める" }).first().click();

    // Stripe Checkout 画面に遷移
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30000 });

    await fillStripeCheckout(page);

    // 成功ページにリダイレクト
    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 60000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });

  test("7日パス購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "購入する" }).first().click();

    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30000 });

    await fillStripeCheckout(page);

    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 60000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });

  test("30日パス購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "購入する" }).nth(1).click();

    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30000 });

    await fillStripeCheckout(page);

    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 60000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });

  test("Pro月額サブスク購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "始める" }).nth(1).click();

    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 30000 });

    await fillStripeCheckout(page);

    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 60000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });
});
