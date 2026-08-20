import { test, expect, type Locator, type Page } from "@playwright/test";

// Item 66's second named E2E flow:
//   Open test case → Execute steps → Fail step → Create bug →
//   Verify relationship
test("failing a test execution step auto-creates a bug and links back to the test case", async ({ page }) => {
  // Next dev's Fast Refresh can briefly commit a client component twice (or
  // remount it, resetting local state) right after a navigation — the
  // SSR'd HTML always has each element exactly once, so waiting for the
  // count to settle rides that out instead of racing a strict-mode
  // violation or a silently-reset selection.
  async function stable(locator: Locator) {
    await expect(locator).toHaveCount(1);
    return locator;
  }

  // A remount can still land in the narrow window between confirming the
  // Fail selection and the submit's server round-trip actually landing,
  // reverting the step back to its default Pass. Rather than chase that
  // millisecond race, detect it from the real outcome (no bug created) and
  // redo the whole selection-to-submit sequence.
  async function failStepAndSubmit(page: Page): Promise<void> {
    const stepCards = page.locator("div.rounded-lg.border").filter({ hasText: /^1\./ });
    const failButton = stepCards.first().getByRole("button", { name: "Fail" });
    await (await stable(failButton)).click();
    await expect(failButton).toHaveAttribute("aria-pressed", "true");
    await (await stable(stepCards.first().getByPlaceholder("What happened at this step?"))).fill(
      "E2E: step did not behave as expected."
    );
    await expect(failButton).toHaveAttribute("aria-pressed", "true");
    await (await stable(page.getByRole("button", { name: "Finish Execution" }))).click();
    await expect(page.getByText("Test Result")).toBeVisible();
  }

  // Open test case — navigate through the real list rather than a
  // hardcoded id, so the test survives a reseed.
  await page.goto("/test-cases?game=all");
  const firstRow = page.locator("tbody tr").first();
  await (await stable(firstRow.getByRole("link").first())).click();
  await expect(page).toHaveURL(/\/test-cases\/[a-z0-9]+$/);

  await (await stable(page.getByRole("link", { name: "Execute" }))).click();
  await expect(page).toHaveURL(/\/execute$/);

  await failStepAndSubmit(page);
  const bugLink = page.getByRole("link", { name: /^BUG-\d+$/ });
  if ((await bugLink.count()) === 0) {
    // The Fail selection got wiped by a remount before the server saw it —
    // reset and run the exact same steps again.
    await (await stable(page.getByRole("button", { name: "Run Again" }))).click();
    await failStepAndSubmit(page);
  }

  // Verify a bug was created and linked.
  await expect(bugLink).toBeVisible();
  await expect(page.getByText("created automatically")).toBeVisible();

  // Verify relationship: the created bug references the originating test
  // case, not just a standalone bug.
  await (await stable(bugLink)).click();
  await expect(page).toHaveURL(/\/bugs\/[a-z0-9]+$/);
  await page.reload();
  await expect(page.getByText(/Created automatically from a failed/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /execution of TC-\d+/ }).first()).toBeVisible();
});
