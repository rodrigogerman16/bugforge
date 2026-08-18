import type { TesterRole } from "@/generated/prisma/enums";

export const TESTER_ROLE_META: Record<TesterRole, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "var(--bf-status-critical)" },
  QA_LEAD: { label: "QA Lead", color: "var(--bf-brand)" },
  QA_TESTER: { label: "QA Tester", color: "var(--bf-status-good)" },
  DEVELOPER: { label: "Developer", color: "var(--bf-status-warning)" },
  PRODUCER: { label: "Producer", color: "var(--bf-ink-muted)" },
  VIEWER: { label: "Viewer", color: "var(--bf-status-low)" },
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Deliberately a plain, descriptive percentage — not a score, grade, or
// anything framed as a ranking. This is about a tester's own reports over
// time, never a comparison against anyone else.
export function reproductionQualityPercent(confirmed: number, rejected: number): number | null {
  const total = confirmed + rejected;
  if (total === 0) return null;
  return Math.round((confirmed / total) * 100);
}
