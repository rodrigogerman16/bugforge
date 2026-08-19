import { BugPriority } from "@/generated/prisma/enums";

export const PRIORITY_ORDER: BugPriority[] = [
  BugPriority.P0,
  BugPriority.P1,
  BugPriority.P2,
  BugPriority.P3,
  BugPriority.P4,
];

// Mirrors SEVERITY_RANK — the Bug.priorityRank column stores this 0-based
// position so priority can be sorted/filtered at the database level. Every
// write path that sets priority must set priorityRank to match.
export const PRIORITY_RANK: Record<BugPriority, number> = Object.fromEntries(
  PRIORITY_ORDER.map((p, i) => [p, i])
) as Record<BugPriority, number>;

// Priority is a separate axis from severity — how urgently a bug should be
// worked, not how technically damaging it is. The two can and do diverge, so
// they're stored as independent fields and never derived from one another.
export const PRIORITY_META: Record<BugPriority, { code: string; label: string; color: string }> = {
  P0: { code: "P0", label: "Blocker", color: "var(--bf-status-blocker)" },
  P1: { code: "P1", label: "Critical", color: "var(--bf-status-critical)" },
  P2: { code: "P2", label: "High", color: "var(--bf-brand)" },
  P3: { code: "P3", label: "Medium", color: "var(--bf-status-warning)" },
  P4: { code: "P4", label: "Low", color: "var(--bf-status-low)" },
};
