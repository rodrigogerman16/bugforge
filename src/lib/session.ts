import type { SessionStatus } from "@/generated/prisma/enums";

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; color: string }> = {
  PLANNED: { label: "Planned", color: "var(--bf-ink-muted)" },
  ACTIVE: { label: "Active", color: "var(--bf-status-good)" },
  COMPLETED: { label: "Completed", color: "var(--bf-brand)" },
};

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

// A session's duration is only meaningful once it has actually started —
// ongoing sessions measure against now, so the number keeps ticking up
// rather than freezing at whatever it was on last page load.
export function sessionDurationLabel(startedAt: Date | null, endedAt: Date | null): string {
  if (!startedAt) return "Not started";
  const end = endedAt ?? new Date();
  const label = formatDuration(end.getTime() - startedAt.getTime());
  return endedAt ? label : `${label} (ongoing)`;
}
