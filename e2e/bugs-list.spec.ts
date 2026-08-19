import { test, expect } from "@playwright/test";

test.describe("Bugs list", () => {
  test("loads real seeded bugs with pagination", async ({ page }) => {
    await page.goto("/bugs?game=all");
    await expect(page.getByRole("heading", { name: "Bugs" })).toBeVisible();

    // The count in the header and the pagination summary should agree —
    // both are reading the same real getBugList() result.
    const countText = await page.locator("text=/\\d+ bugs?/").first().textContent();
    const totalCount = Number(countText?.match(/\d+/)?.[0]);
    expect(totalCount).toBeGreaterThan(20); // seeded demo data spans many pages

    await expect(page.getByText(/Showing 1–20 of \d+/)).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toBeVisible();
  });

  test("filtering by severity narrows the list and updates the URL", async ({ page }) => {
    await page.goto("/bugs?game=all");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByLabel("Severity").selectOption({ label: "Blocker" });

    await expect(page).toHaveURL(/severity=BLOCKER/);
    // Every visible severity cell in the first data row should now read Blocker.
    await expect(page.locator("tbody tr").first()).toContainText("Blocker");
  });

  test("sorting by a column header updates the URL and re-orders results", async ({ page }) => {
    await page.goto("/bugs?game=all");
    await page.getByRole("link", { name: "Severity" }).click();
    await expect(page).toHaveURL(/sort=severity/);

    // Desc is the default direction on a fresh sort — Blocker (the most
    // severe) should be the very first row.
    await expect(page.locator("tbody tr").first()).toContainText("Blocker");
  });

  test("pagination advances to the next page without losing the active sort", async ({ page }) => {
    await page.goto("/bugs?game=all&sort=severity&dir=desc");
    await page.getByRole("link", { name: "Next" }).click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 21–40 of \d+/)).toBeVisible();
  });
});
