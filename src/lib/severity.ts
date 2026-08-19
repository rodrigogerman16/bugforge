import { OctagonAlert, TriangleAlert, ArrowUp, Minus, ArrowDown, type LucideIcon } from "lucide-react";
import { BugSeverity } from "@/generated/prisma/enums";

export const SEVERITY_ORDER: BugSeverity[] = [
  BugSeverity.BLOCKER,
  BugSeverity.CRITICAL,
  BugSeverity.HIGH,
  BugSeverity.MEDIUM,
  BugSeverity.LOW,
];

// The Bug.severityRank column stores this same 0-based position (0 =
// Blocker) so the database can sort/filter by severity using a plain
// indexed integer column instead of loading every row into Node to sort by
// SEVERITY_ORDER.indexOf() — see queryBugOrderBy in lib/data.ts. Every write
// path that sets severity must set severityRank to match.
export const SEVERITY_RANK: Record<BugSeverity, number> = Object.fromEntries(
  SEVERITY_ORDER.map((s, i) => [s, i])
) as Record<BugSeverity, number>;

// Severity is meant to be visually obvious without relying on color alone
// (see BUG_STATUS_META's same principle) — every level pairs a distinct
// icon and label with its color, so it's still unambiguous in grayscale,
// for a colorblind reader, or read aloud by a screen reader.
export const SEVERITY_META: Record<
  BugSeverity,
  { label: string; color: string; textClass: string; icon: LucideIcon }
> = {
  BLOCKER: { label: "Blocker", color: "var(--bf-status-blocker)", textClass: "text-[color:var(--bf-status-blocker)]", icon: OctagonAlert },
  CRITICAL: { label: "Critical", color: "var(--bf-status-critical)", textClass: "text-[color:var(--bf-status-critical)]", icon: TriangleAlert },
  HIGH: { label: "High", color: "var(--bf-brand)", textClass: "text-[color:var(--bf-brand)]", icon: ArrowUp },
  MEDIUM: { label: "Medium", color: "var(--bf-status-warning)", textClass: "text-[color:var(--bf-status-warning)]", icon: Minus },
  LOW: { label: "Low", color: "var(--bf-status-low)", textClass: "text-[color:var(--bf-status-low)]", icon: ArrowDown },
};

export type SeverityCounts = Record<BugSeverity, number>;

export function emptySeverityCounts(): SeverityCounts {
  return { BLOCKER: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
}
