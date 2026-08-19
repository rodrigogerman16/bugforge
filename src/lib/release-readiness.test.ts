import { describe, it, expect } from "vitest";
import { computeReleaseReadiness, formatRequirement, type QualityGateDefinition, type ReadinessMetrics } from "@/lib/release-readiness";

function gate(overrides: Partial<QualityGateDefinition> = {}): QualityGateDefinition {
  return { id: "g1", metric: "CRITICAL_BUGS", operator: "EQUAL", threshold: 0, enabled: true, ...overrides };
}

const perfectMetrics: ReadinessMetrics = {
  criticalBugs: 0,
  testPassRate: 100,
  regressionRate: 0,
  coverage: 100,
  performance: 100,
};

describe("computeReleaseReadiness", () => {
  it("is READY when every enabled gate passes — item 68's own example", () => {
    const gates: QualityGateDefinition[] = [
      gate({ id: "g1", metric: "CRITICAL_BUGS", operator: "EQUAL", threshold: 0 }),
      gate({ id: "g2", metric: "TEST_PASS_RATE", operator: "GREATER_THAN_OR_EQUAL", threshold: 95 }),
      gate({ id: "g3", metric: "COVERAGE", operator: "GREATER_THAN_OR_EQUAL", threshold: 90 }),
    ];
    const result = computeReleaseReadiness(perfectMetrics, gates);
    expect(result.ready).toBe(true);
    expect(result.blockingIssues).toHaveLength(0);
    expect(result.gates.every((g) => g.passed)).toBe(true);
  });

  it("is NOT READY the instant a single gate fails — item 68's own example (regression rate)", () => {
    const gates: QualityGateDefinition[] = [
      gate({ id: "g1", metric: "CRITICAL_BUGS", operator: "EQUAL", threshold: 0 }),
      gate({ id: "g2", metric: "TEST_PASS_RATE", operator: "GREATER_THAN_OR_EQUAL", threshold: 95 }),
      gate({ id: "g3", metric: "REGRESSION_RATE", operator: "LESS_THAN", threshold: 2 }),
      gate({ id: "g4", metric: "COVERAGE", operator: "GREATER_THAN_OR_EQUAL", threshold: 90 }),
    ];
    const result = computeReleaseReadiness({ ...perfectMetrics, regressionRate: 5 }, gates);
    expect(result.ready).toBe(false);
    expect(result.blockingIssues.length).toBe(1);
    expect(result.gates.find((g) => g.metric === "REGRESSION_RATE")?.passed).toBe(false);
    // Every other gate still individually passed — "not ready" is derived
    // purely from the one real failure, never hardcoded.
    expect(result.gates.filter((g) => g.metric !== "REGRESSION_RATE").every((g) => g.passed)).toBe(true);
  });

  it("skips disabled gates entirely — they can't block or contribute to the score", () => {
    const gates: QualityGateDefinition[] = [
      gate({ id: "g1", metric: "CRITICAL_BUGS", operator: "EQUAL", threshold: 0, enabled: false }),
    ];
    const result = computeReleaseReadiness({ ...perfectMetrics, criticalBugs: 5 }, gates);
    expect(result.ready).toBe(true);
    expect(result.gates).toHaveLength(0);
  });

  it("treats missing data (null metric) as a real failure, not a silent pass", () => {
    const gates: QualityGateDefinition[] = [gate({ id: "g1", metric: "COVERAGE", operator: "GREATER_THAN_OR_EQUAL", threshold: 90 })];
    const result = computeReleaseReadiness({ ...perfectMetrics, coverage: null }, gates);
    expect(result.ready).toBe(false);
    expect(result.gates[0].value).toBeNull();
    expect(result.blockingIssues[0]).toMatch(/no data available/i);
  });

  it("scores 100 with no gates configured, and less than 100 for each real failure", () => {
    const clean = computeReleaseReadiness(perfectMetrics, []);
    expect(clean.score).toBe(100);

    const withFailure = computeReleaseReadiness(
      { ...perfectMetrics, criticalBugs: 3 },
      [gate({ metric: "CRITICAL_BUGS", operator: "EQUAL", threshold: 0 })]
    );
    expect(withFailure.score).toBeLessThan(100);
  });

  it("never produces a score outside 0-100 even with every gate failing badly", () => {
    const gates: QualityGateDefinition[] = [
      gate({ id: "g1", metric: "CRITICAL_BUGS", operator: "EQUAL", threshold: 0 }),
      gate({ id: "g2", metric: "TEST_PASS_RATE", operator: "GREATER_THAN_OR_EQUAL", threshold: 95 }),
      gate({ id: "g3", metric: "COVERAGE", operator: "GREATER_THAN_OR_EQUAL", threshold: 90 }),
    ];
    const result = computeReleaseReadiness({ criticalBugs: 500, testPassRate: 0, regressionRate: 100, coverage: 0, performance: 0 }, gates);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.ready).toBe(false);
  });

  it("evaluates every operator correctly", () => {
    const cases: { operator: QualityGateDefinition["operator"]; value: number; threshold: number; passes: boolean }[] = [
      { operator: "LESS_THAN", value: 1, threshold: 2, passes: true },
      { operator: "LESS_THAN", value: 2, threshold: 2, passes: false },
      { operator: "LESS_THAN_OR_EQUAL", value: 2, threshold: 2, passes: true },
      { operator: "GREATER_THAN", value: 3, threshold: 2, passes: true },
      { operator: "GREATER_THAN", value: 2, threshold: 2, passes: false },
      { operator: "GREATER_THAN_OR_EQUAL", value: 2, threshold: 2, passes: true },
      { operator: "EQUAL", value: 2, threshold: 2, passes: true },
      { operator: "EQUAL", value: 3, threshold: 2, passes: false },
    ];
    for (const c of cases) {
      const result = computeReleaseReadiness(
        { ...perfectMetrics, criticalBugs: c.value },
        [gate({ metric: "CRITICAL_BUGS", operator: c.operator, threshold: c.threshold })]
      );
      expect(result.gates[0].passed).toBe(c.passes);
    }
  });
});

describe("formatRequirement", () => {
  it("renders the operator symbol and a % unit for percentage metrics", () => {
    expect(formatRequirement("GREATER_THAN_OR_EQUAL", 95, "TEST_PASS_RATE")).toBe("Must be ≥ 95%");
  });

  it("renders no unit for a raw count metric", () => {
    expect(formatRequirement("EQUAL", 0, "CRITICAL_BUGS")).toBe("Must be = 0");
  });
});
