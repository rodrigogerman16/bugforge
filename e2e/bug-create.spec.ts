import { test, expect } from "@playwright/test";

// Creates a real bug against the seeded demo database — running this suite
// leaves that bug behind, the same way any E2E test against a real backend
// does. `npx tsx prisma/seed.ts` resets the demo data to a clean slate.
test.describe("Bug creation", () => {
  test("the submit button stays disabled until title and description are filled", async ({ page }) => {
    await page.goto("/bugs?game=all");
    await page.getByRole("button", { name: "Report Bug" }).click();

    const submit = page.getByRole("button", { name: "Create Bug" });
    await expect(submit).toBeDisabled();

    await page.getByLabel("Title").fill("E2E: sample bug for form validation");
    await expect(submit).toBeDisabled(); // description still empty

    await page.getByLabel("Description").fill("Filled in by the Playwright suite.");
    await expect(submit).toBeEnabled();
  });

  test("creating a bug end-to-end lands on its new detail page", async ({ page }) => {
    await page.goto("/bugs?game=all");
    await page.getByRole("button", { name: "Report Bug" }).click();

    const title = `E2E: character falls through the floor ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Reproduced after respawning near the loading dock.");
    await page.getByLabel("Severity").selectOption({ label: "Critical" });

    await page.getByRole("button", { name: "Create Bug" }).click();

    await expect(page).toHaveURL(/\/bugs\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });
});
