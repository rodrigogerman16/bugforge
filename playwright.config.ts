import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests for the golden paths — reading/filtering/sorting the bug
// list and creating a bug end-to-end. Runs against a real `next dev` server
// on real seeded demo data (see prisma/seed.ts); Playwright starts and
// tears that server down itself, so `npm run test:e2e` works standalone.
export default defineConfig({
  testDir: "./e2e",
  // All specs share one real dev server backed by one real SQLite file
  // (dev.db) — there's no per-worker database isolation, so running many
  // workers concurrently causes write contention and flaky navigations
  // under load. Serial execution is deliberate here, not a fallback.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
