import { BugSeverity } from "@/generated/prisma/enums";

export const SEVERITY_ORDER: BugSeverity[] = [
  BugSeverity.BLOCKER,
  BugSeverity.CRITICAL,
  BugSeverity.HIGH,
  BugSeverity.MEDIUM,
  BugSeverity.LOW,
];

export const SEVERITY_META: Record<
  BugSeverity,
  { label: string; color: string; textClass: string }
> = {
  BLOCKER: { label: "Blocker", color: "var(--bf-status-blocker)", textClass: "text-[color:var(--bf-status-blocker)]" },
  CRITICAL: { label: "Critical", color: "var(--bf-status-critical)", textClass: "text-[color:var(--bf-status-critical)]" },
  HIGH: { label: "High", color: "var(--bf-brand)", textClass: "text-[color:var(--bf-brand)]" },
  MEDIUM: { label: "Medium", color: "var(--bf-status-warning)", textClass: "text-[color:var(--bf-status-warning)]" },
  LOW: { label: "Low", color: "var(--bf-status-low)", textClass: "text-[color:var(--bf-status-low)]" },
};

export type SeverityCounts = Record<BugSeverity, number>;

export function emptySeverityCounts(): SeverityCounts {
  return { BLOCKER: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
}
