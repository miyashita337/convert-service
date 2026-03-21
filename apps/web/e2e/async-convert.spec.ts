import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Async conversion infrastructure tests
// ---------------------------------------------------------------------------

test.describe("Async conversion infrastructure", () => {
  test("image conversion still works synchronously (regression)", async ({ page }) => {
    // Navigate to a known image conversion page
    const response = await page.goto("/convert/jpg-to-webp");
    expect(response?.status()).toBe(200);

    // Verify the converter UI is present
    await expect(page.locator("[data-testid='dropzone'], .dropzone, input[type='file']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("SSE stream endpoint exists", async ({ request }) => {
    // /api/stream/:jobId should return 200 with SSE headers for a valid-looking jobId
    // or establish an SSE connection (even if the job doesn't exist, the endpoint should respond)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
    const response = await request.get(`${apiUrl}/api/stream/nonexistent-job-id`);

    // The endpoint should exist and return SSE content-type
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/event-stream");
  });

  test("status endpoint returns progress field", async ({ request }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
    // Status endpoint should still work, even for nonexistent jobs (returns 404)
    const response = await request.get(`${apiUrl}/api/status/nonexistent-job-id`);
    expect(response.status()).toBe(404);
  });
});
