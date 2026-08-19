import type { BuildRiskContext } from "@/lib/db";

// Analyze build release risk — combines four independent, real signals about
// one build (open critical bugs, a regression-rate trend versus the previous
// build, real test-coverage gaps, and a real cluster of high-priority bugs
// sharing one game mode) into a release-risk band. Each concern only appears
// when its underlying signal actually fired — an empty list means none of
// these four checks found anything, not that the build is risk-free.

export type ReleaseRiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RELEASE_RISK_META: Record<ReleaseRiskBand, { label: string; color: string }> = {
  LOW: { label: "Low", color: "var(--bf-status-good)" },
  MEDIUM: { label: "Medium", color: "var(--bf-status-warning)" },
  HIGH: { label: "High", color: "var(--bf-brand)" },
  CRITICAL: { label: "Critical", color: "var(--bf-status-critical)" },
};

export type BuildReleaseRiskAnalysis = { band: ReleaseRiskBand; score: number; concerns: string[] };

export function analyzeBuildReleaseRisk(ctx: BuildRiskContext): BuildReleaseRiskAnalysis {
  let score = 0;
  const concerns: string[] = [];

  if (ctx.criticalOpenCount > 0) {
    score += Math.min(4, ctx.criticalOpenCount * 0.3);
    concerns.push(
      ctx.criticalOpenCount === 1
        ? "1 critical bug remains open"
        : `${ctx.criticalOpenCount} critical bugs remain open`
    );
  }

  if (ctx.regressionRateDeltaPct !== null && ctx.regressionRateDeltaPct > 0) {
    score += Math.min(2, ctx.regressionRateDeltaPct * 0.4);
    concerns.push(`Regression rate increased ${ctx.regressionRateDeltaPct.toFixed(1)}% versus the previous build`);
  }

  for (const d of ctx.belowTargetDisciplines) {
    score += 0.75;
    concerns.push(
      `${d.label} coverage is below target${d.coveragePercent !== null ? ` (${d.coveragePercent}%)` : " (no test cases mapped yet)"}`
    );
  }

  if (ctx.clusteredHighPriority) {
    score += 1;
    concerns.push(
      `${ctx.clusteredHighPriority.count} high-priority bugs affect the same game mode (${ctx.clusteredHighPriority.gameMode})`
    );
  }

  if (ctx.status === "RELEASE_CANDIDATE" || ctx.status === "RELEASED") {
    score += 0.5; // Same build, less runway — closer to release amplifies every other concern.
  }

  if (concerns.length === 0) {
    concerns.push("No significant release-risk signals found for this build.");
  }

  const band: ReleaseRiskBand = score >= 5 ? "CRITICAL" : score >= 3 ? "HIGH" : score >= 1.25 ? "MEDIUM" : "LOW";
  return { band, score, concerns };
}
