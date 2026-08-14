import type { TestCasePriority } from "@/generated/prisma/enums";

export const TEST_CASE_PRIORITY_ORDER: TestCasePriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const TEST_CASE_PRIORITY_META: Record<TestCasePriority, { label: string; color: string }> = {
  LOW: { label: "Low", color: "var(--bf-status-low)" },
  MEDIUM: { label: "Medium", color: "var(--bf-status-warning)" },
  HIGH: { label: "High", color: "var(--bf-brand)" },
  CRITICAL: { label: "Critical", color: "var(--bf-status-critical)" },
};

// A test case has no independently-settable status — it's always derived
// from its most recent TestRun result, so it can never say "Passing" while
// the actual run history says otherwise.
export type TestCaseStatus = "PASSING" | "FAILING" | "BLOCKED" | "SKIPPED" | "NOT_RUN";

export const TEST_CASE_STATUS_META: Record<TestCaseStatus, { label: string; color: string }> = {
  PASSING: { label: "Passing", color: "var(--bf-status-good)" },
  FAILING: { label: "Failing", color: "var(--bf-status-critical)" },
  BLOCKED: { label: "Blocked", color: "var(--bf-status-warning)" },
  SKIPPED: { label: "Skipped", color: "var(--bf-ink-muted)" },
  NOT_RUN: { label: "Not Run", color: "var(--bf-ink-muted)" },
};

export function deriveTestCaseStatus(latestResult: string | null | undefined): TestCaseStatus {
  switch (latestResult) {
    case "PASS":
      return "PASSING";
    case "FAIL":
      return "FAILING";
    case "BLOCKED":
      return "BLOCKED";
    case "SKIPPED":
      return "SKIPPED";
    default:
      return "NOT_RUN";
  }
}

export const TEST_RUN_RESULT_META: Record<string, { label: string; color: string }> = {
  PASS: { label: "Pass", color: "var(--bf-status-good)" },
  FAIL: { label: "Fail", color: "var(--bf-status-critical)" },
  BLOCKED: { label: "Blocked", color: "var(--bf-status-warning)" },
  SKIPPED: { label: "Skipped", color: "var(--bf-ink-muted)" },
};
