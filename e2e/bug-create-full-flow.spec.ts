import { test, expect, type Locator } from "@playwright/test";

// Item 66's named E2E flow:
//   Login → Select game → Open Bugs → Create bug → Attach evidence →
//   Submit → Verify bug appears
//
// "Login" is a no-op in this app's current demo mode — Supabase Auth isn't
// configured (see .env), so every request already resolves to the seeded
// QA Lead tester (see getCurrentUser in lib/db/testers.ts). The flow below
// starts from the dashboard, which is exactly where a real login would
// land.
test("login → select game → bugs → create bug → attach evidence → submit → bug appears", async ({ page }) => {
  // Next dev's Fast Refresh can briefly commit a client component twice (or
  // remount it) right after a navigation — the SSR'd HTML always has each
  // element exactly once, so waiting for the count to settle rides that
  // out instead of racing a strict-mode violation.
  async function stable(locator: Locator) {
    await expect(locator).toHaveCount(1);
    return locator;
  }

  await page.goto("/");

  // Select a game via the sidebar game switcher.
  await page.getByRole("button", { name: /King of Meat/i }).click();
  await page.getByRole("button", { name: /King of Meat/ }).last().click();
  await expect(page).toHaveURL(/game=king-of-meat/);

  // Open Bugs.
  await (await stable(page.getByRole("link", { name: "Bugs", exact: true }))).click();
  await expect(page).toHaveURL(/\/bugs/);
  await expect(page).toHaveURL(/game=king-of-meat/);

  // Create bug.
  await (await stable(page.getByRole("button", { name: "Report Bug" }))).click();
  const title = `E2E full flow: HUD flickers after respawn ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Reproduced after respawning near the arena entrance.");

  // Attach evidence. Supabase Storage isn't configured in this environment
  // (see .env), so the real, correct outcome here is the graceful
  // SupabaseNotConfiguredError message, not a successful upload — both
  // paths are asserted for, since which one fires depends on environment
  // config, not app correctness.
  await page.setInputFiles("#bug-attachments-input", {
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  await expect(
    page.getByText("evidence.png").or(page.getByText(/Supabase Storage isn't configured/i))
  ).toBeVisible({ timeout: 10_000 });

  // Submit — attaching evidence is optional, so this proceeds regardless
  // of whether the upload above actually succeeded.
  await (await stable(page.getByRole("button", { name: "Create Bug" }))).click();

  // Verify the bug appears: lands on its own detail page with the exact
  // title, and shows up in the main list too.
  await expect(page).toHaveURL(/\/bugs\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/bugs?game=all");
  await page.getByPlaceholder("Search bugs...").fill(title);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});
