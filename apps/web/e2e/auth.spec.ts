import { test, expect } from "@playwright/test";

// These tests use storageState from auth.setup.ts (via production-authed project)
test.describe("Authenticated user", () => {
  test("avatar is visible instead of Sign in link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Sign in link should NOT be visible
    const signIn = page.getByText(/Sign in|ログイン/i);
    await expect(signIn).not.toBeVisible({ timeout: 5_000 });

    // Avatar or user menu should be visible
    const avatar = page.locator(
      'img[alt*="avatar" i], img[alt*="user" i], [data-testid="user-avatar"], button:has(img[referrerpolicy])'
    );
    await expect(avatar.first()).toBeVisible({ timeout: 5_000 });
  });

  test("/api/auth/me returns authenticated: true", async ({ page }) => {
    const apiUrl = process.env.E2E_API_URL ?? "https://api.quickconv.cc";

    const response = await page.request.get(`${apiUrl}/api/auth/me`, {
      headers: {
        Accept: "application/json",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.authenticated).toBe(true);
  });

  test("logout restores Sign in link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click user menu / avatar to open dropdown
    const avatar = page.locator(
      'img[alt*="avatar" i], img[alt*="user" i], [data-testid="user-avatar"], button:has(img[referrerpolicy])'
    );
    await avatar.first().click();

    // Click logout
    const logoutBtn = page.getByText(/Sign out|Logout|ログアウト/i);
    await logoutBtn.first().click();

    // Wait for page to reload/redirect
    await page.waitForLoadState("networkidle");

    // Sign in link should reappear
    const signIn = page.getByText(/Sign in|ログイン/i);
    await expect(signIn.first()).toBeVisible({ timeout: 10_000 });
  });
});
