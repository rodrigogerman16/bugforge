import type { QualityGateMetric, GateOperator } from "@/generated/prisma/enums";

// Release readiness is a deterministic scorecard, not a BugForge AI
// suggestion (see src/lib/ai/) — every number and every blocking issue is
// computed directly from real build data, evaluated against the
// configurable QualityGate rows from the Settings page. No hedging language
// is needed here because nothing in this file is a heuristic guess — a gate
// either passes its own configured requirement or it doesn't.

export type ReadinessMetrics = {
  criticalBugs: number;
  testPassRate: number | null;
  regressionRate: number;
  coverage: number | null;
  performance: number | null;
};

export type QualityGateDefinition = {
  id: string;
  metric: QualityGateMetric;
  operator: GateOperator;
  threshold: number;
  enabled: boolean;
};

export type GateEvaluation = {
  metric: QualityGateMetric;
  label: string;
  value: number | null;
  requirementLabel: string;
  passed: boolean;
};

export type ReleaseReadiness = {
  score: number;
  ready: boolean;
  gates: GateEvaluation[];
  blockingIssues: string[];
};

export const METRIC_LABEL: Record<QualityGateMetric, string> = {
  CRITICAL_BUGS: "Critical bugs",
  TEST_PASS_RATE: "Test pass rate",
  REGRESSION_RATE: "Regression rate",
  COVERAGE: "Coverage",
  PERFORMANCE: "Performance",
};

export const OPERATOR_LABEL: Record<GateOperator, string> = {
  LESS_THAN: "<",
  LESS_THAN_OR_EQUAL: "≤",
  GREATER_THAN: ">",
  GREATER_THAN_OR_EQUAL: "≥",
  EQUAL: "=",
};

const METRIC_HAS_UNIT: Record<QualityGateMetric, boolean> = {
  CRITICAL_BUGS: false,
  TEST_PASS_RATE: true,
  REGRESSION_RATE: true,
  COVERAGE: true,
  PERFORMANCE: true,
};

const METRIC_VALUE_KEY: Record<QualityGateMetric, keyof ReadinessMetrics> = {
  CRITICAL_BUGS: "criticalBugs",
  TEST_PASS_RATE: "testPassRate",
  REGRESSION_RATE: "regressionRate",
  COVERAGE: "coverage",
  PERFORMANCE: "performance",
};

function unitFor(metric: QualityGateMetric): string {
  return METRIC_HAS_UNIT[metric] ? "%" : "";
}

export function formatRequirement(operator: GateOperator, threshold: number, metric: QualityGateMetric): string {
  return `Must be ${OPERATOR_LABEL[operator]} ${threshold}${unitFor(metric)}`;
}

function evaluateOperator(value: number, operator: GateOperator, threshold: number): boolean {
  switch (operator) {
    case "LESS_THAN":
      return value < threshold;
    case "LESS_THAN_OR_EQUAL":
      return value <= threshold;
    case "GREATER_THAN":
      return value > threshold;
    case "GREATER_THAN_OR_EQUAL":
      return value >= threshold;
    case "EQUAL":
      return value === threshold;
  }
}

export function computeReleaseReadiness(metrics: ReadinessMetrics, gates: QualityGateDefinition[]): ReleaseReadiness {
  const evaluations: GateEvaluation[] = [];
  const blockingIssues: string[] = [];
  let score = 100;

  for (const gate of gates) {
    if (!gate.enabled) continue;

    const label = METRIC_LABEL[gate.metric];
    const requirementLabel = formatRequirement(gate.operator, gate.threshold, gate.metric);
    const value = metrics[METRIC_VALUE_KEY[gate.metric]];
    const unit = unitFor(gate.metric);

    if (value === null) {
      evaluations.push({ metric: gate.metric, label, value: null, requirementLabel, passed: false });
      blockingIssues.push(`${label}: no data available for this build yet.`);
      score -= 10;
      continue;
    }

    const passed = evaluateOperator(value, gate.operator, gate.threshold);
    evaluations.push({ metric: gate.metric, label, value, requirementLabel, passed });

    if (!passed) {
      blockingIssues.push(`${label} (${value}${unit}) does not meet the requirement: ${requirementLabel}.`);
      const distance = Math.abs(value - gate.threshold);
      // Critical-bug misses and larger misses cost more than a near-miss.
      score -= 10 + Math.min(15, distance * (gate.metric === "CRITICAL_BUGS" ? 2 : 0.5));
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    ready: blockingIssues.length === 0,
    gates: evaluations,
    blockingIssues,
  };
}
