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
};

/** Load JWT from auth-state.json */
function getAuthToken(): string {
  const statePath = path.join(__dirname, "auth-state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  return state.cookies[0]?.value || "";
}

/** Fill Stripe Checkout form and submit */
async function fillStripeCheckout(page: import("@playwright/test").Page) {
  await page.getByRole("textbox", { name: "カード番号" }).fill(TEST_CARD.number);
  await page.getByRole("textbox", { name: "有効期限" }).fill(TEST_CARD.expiry);
  await page.getByRole("textbox", { name: "CVC" }).fill(TEST_CARD.cvc);
  await page.getByRole("textbox", { name: "カード名義 (ローマ字)" }).fill(TEST_CARD.name);
  await page.getByTestId("hosted-payment-submit-button").click();
}

test.describe("Stripe 決済フロー", () => {
  test.beforeEach(async ({ page, context }) => {
    // Set auth cookie on API domain so credentials: "include" sends it
    const token = getAuthToken();
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
    await page.goto(`${STAGING_URL}/ja/pricing`);
    // Cookie同意バナーが表示されたら閉じる
    const consent = page.getByRole("button", { name: "同意する" });
    if (await consent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consent.click();
    }
  });

  test("Plus月額サブスク購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "始める" }).first().click();

    // Stripe Checkout 画面に遷移
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 10000 });

    await fillStripeCheckout(page);

    // 成功ページにリダイレクト
    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 30000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });

  test("7日パス購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "購入する" }).first().click();

    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 10000 });

    await fillStripeCheckout(page);

    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 30000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });

  test("30日パス購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "購入する" }).nth(1).click();

    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 10000 });

    await fillStripeCheckout(page);

    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 30000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });

  test("Pro月額サブスク購入 → 成功ページ表示", async ({ page }) => {
    await page.getByRole("button", { name: "始める" }).nth(1).click();

    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 10000 });

    await fillStripeCheckout(page);

    await expect(page).toHaveURL(/\/ja\/purchase\/success/, { timeout: 30000 });
    await expect(page.getByText("購入が完了しました")).toBeVisible();
  });
});
