import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const authDir = path.resolve(__dirname, ".auth");
const authFile = path.join(authDir, "user.json");

setup("authenticate with Google", async ({ page }) => {
  setup.setTimeout(60_000);
  const email = process.env.E2E_GOOGLE_EMAIL;
  const password = process.env.E2E_GOOGLE_PASSWORD;
  const apiUrl = process.env.E2E_API_URL ?? "https://api.quickconv.cc";

  if (!email || !password) {
    throw new Error(
      "E2E_GOOGLE_EMAIL and E2E_GOOGLE_PASSWORD must be set in e2e/.env"
    );
  }

  // Ensure .auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 1. Navigate to Google OAuth endpoint
  await page.goto(`${apiUrl}/api/auth/google`);

  // 2. Wait for Google login page
  await page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });

  // 3. Enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await emailInput.fill(email);

  // 4. Click "Next"
  await page.locator("#identifierNext, button:has-text('Next'), button:has-text('次へ')").first().click();

  // 5. Wait for password field (Google has a hidden + visible password input)
  const passwordInput = page.locator('input[name="Passwd"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.fill(password);

  // 6. Click "Next" for password
  await page.locator("#passwordNext, button:has-text('Next'), button:has-text('次へ')").first().click();

  // 7. Handle consent/confirmation screen if it appears
  //    Google shows different buttons: "次へ", "Allow", "許可", "Continue", "続行"
  try {
    await page.waitForURL(/quickconv\.cc/, { timeout: 5_000 });
    // Already redirected — no consent screen
  } catch {
    // Still on Google — click through consent/confirmation
    for (const label of ["次へ", "Allow", "許可", "Continue", "続行", "Next"]) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click();
        break;
      }
    }
    await page.waitForURL(/quickconv\.cc/, { timeout: 30_000 });
  }

  // 9. Verify authentication succeeded
  await expect(page).toHaveURL(/quickconv\.cc/);

  // 10. Save storage state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
