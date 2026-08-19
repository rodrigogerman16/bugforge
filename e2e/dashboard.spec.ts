import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("renders real quality metrics for the seeded game", async ({ page }) => {
    await page.goto("/");

    const qualityLabel = page.getByText("Quality Score", { exact: true });
    await expect(qualityLabel).toBeVisible();
    const qualityCard = qualityLabel.locator("..");
    await expect(page.getByText("Key Metrics", { exact: true })).toBeVisible();
    await expect(page.getByText("Total bugs")).toBeVisible();

    // The score is a real, computed 0-100 number, never blank/NaN.
    await expect(qualityCard.getByText("/ 100", { exact: true })).toBeVisible();
    const scoreText = await qualityCard.locator("span.text-5xl").textContent();
    const score = Number(scoreText);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("switching games updates the dashboard for that game", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /King of Meat/i }).click();
    await page.getByRole("button", { name: /Voidrunner Protocol/i }).click();

    await expect(page).toHaveURL(/game=voidrunner-protocol/);
    await expect(page.getByRole("heading", { name: "Voidrunner Protocol" })).toBeVisible();
  });
});
