import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const authDir = path.resolve(__dirname, ".auth");
const authFile = path.join(authDir, "user.json");

setup("authenticate with Google", async ({ page }) => {
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

  // 5. Wait for password field
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.fill(password);

  // 6. Click "Next" for password
  await page.locator("#passwordNext, button:has-text('Next'), button:has-text('次へ')").first().click();

  // 7. Handle consent screen if it appears
  try {
    const consentButton = page.locator(
      'button:has-text("Allow"), button:has-text("許可"), button:has-text("Continue"), button:has-text("続行")'
    );
    await consentButton.first().click({ timeout: 5_000 });
  } catch {
    // No consent screen — already authorized
  }

  // 8. Wait for redirect back to quickconv.cc
  await page.waitForURL(/quickconv\.cc/, { timeout: 30_000 });

  // 9. Verify authentication succeeded
  await expect(page).toHaveURL(/quickconv\.cc/);

  // 10. Save storage state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
