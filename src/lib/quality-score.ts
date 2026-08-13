import type { SeverityCounts } from "@/lib/severity";

export type QualityBand = "HEALTHY" | "AT_RISK" | "CRITICAL";

export const QUALITY_BAND_META: Record<QualityBand, { label: string; color: string }> = {
  HEALTHY: { label: "Healthy", color: "var(--bf-status-good)" },
  AT_RISK: { label: "At Risk", color: "var(--bf-status-warning)" },
  CRITICAL: { label: "Critical", color: "var(--bf-status-critical)" },
};

const SEVERITY_WEIGHT: SeverityCounts = {
  BLOCKER: 20,
  CRITICAL: 12,
  HIGH: 5,
  MEDIUM: 1.6,
  LOW: 0.5,
};

// The score starts at 100 (nothing open is shippable) and loses points for every
// currently-open bug — only open bugs count, since a fixed or verified bug no
// longer threatens release quality. Blocker and Critical bugs cost their full
// weight per bug (each one is a real release blocker on its own), while
// high/medium/low costs grow with the square root of the count, so the 10th open
// low-priority bug costs far less than the 1st — a game doesn't read as equally
// unhealthy for 3 vs 30 minor bugs.
export function computeQualityScore(openSeverityCounts: SeverityCounts): number {
  const penalty =
    openSeverityCounts.BLOCKER * SEVERITY_WEIGHT.BLOCKER +
    openSeverityCounts.CRITICAL * SEVERITY_WEIGHT.CRITICAL +
    Math.sqrt(openSeverityCounts.HIGH) * SEVERITY_WEIGHT.HIGH +
    Math.sqrt(openSeverityCounts.MEDIUM) * SEVERITY_WEIGHT.MEDIUM +
    Math.sqrt(openSeverityCounts.LOW) * SEVERITY_WEIGHT.LOW;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function qualityBand(score: number): QualityBand {
  if (score >= 75) return "HEALTHY";
  if (score >= 45) return "AT_RISK";
  return "CRITICAL";
}
