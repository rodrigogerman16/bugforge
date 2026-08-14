import type { TestCasePriority, BugSeverity, BugPriority } from "@/generated/prisma/enums";

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

export const STEP_RESULT_OPTIONS = ["PASS", "FAIL", "BLOCKED", "SKIPPED"];

// Worst-case wins when rolling per-step results up into one run result — a
// single failed step fails the run even if every other step passed.
const RESULT_SEVERITY_RANK: Record<string, number> = { FAIL: 3, BLOCKED: 2, SKIPPED: 1, PASS: 0 };

export function computeOverallResult(stepResults: string[]): string {
  if (stepResults.length === 0) return "SKIPPED";
  return stepResults.reduce((worst, r) =>
    (RESULT_SEVERITY_RANK[r] ?? 0) > (RESULT_SEVERITY_RANK[worst] ?? 0) ? r : worst
  );
}

// A failed test execution auto-creates a bug — its severity/priority are
// derived from the test case's own priority rather than guessed, so a
// Critical-priority test case failing always files at least a High-severity
// bug, and a Low-priority one never over-files as a Blocker.
export const TEST_CASE_PRIORITY_TO_BUG_SEVERITY: Record<TestCasePriority, BugSeverity> = {
  CRITICAL: "BLOCKER",
  HIGH: "CRITICAL",
  MEDIUM: "HIGH",
  LOW: "MEDIUM",
};

export const TEST_CASE_PRIORITY_TO_BUG_PRIORITY: Record<TestCasePriority, BugPriority> = {
  CRITICAL: "P0",
  HIGH: "P1",
  MEDIUM: "P2",
  LOW: "P3",
};
