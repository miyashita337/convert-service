import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

// Load e2e environment variables
dotenv.config({ path: path.resolve(__dirname, "e2e/.env") });

const isProduction = process.env.E2E_TARGET === "production";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    // --- Local development ---
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
    },
    // --- Auth setup (production) ---
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.E2E_BASE_URL ?? "https://quickconv.cc",
      },
    },
    // --- Production (no auth required) ---
    {
      name: "production",
      dependencies: [],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.E2E_BASE_URL ?? "https://quickconv.cc",
      },
    },
    // --- Production (authenticated, requires auth-setup) ---
    {
      name: "production-authed",
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.E2E_BASE_URL ?? "https://quickconv.cc",
        storageState: path.resolve(__dirname, "e2e/.auth/user.json"),
      },
    },
  ],
  // Only start local dev server when not targeting production
  ...(!isProduction && {
    webServer: {
      command: "pnpm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
