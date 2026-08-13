import type { ActivityEventType } from "@/generated/prisma/enums";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { PRIORITY_META } from "@/lib/priority";
import { SEVERITY_META } from "@/lib/severity";

export type ActivityEventRow = {
  id: string;
  type: ActivityEventType;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  actor: { id: string; name: string; role: string } | null;
  targetTester: { id: string; name: string; role: string } | null;
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayFormatterWithYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatEventTime(date: Date): string {
  return timeFormatter.format(date);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.getFullYear() === now.getFullYear() ? dayFormatter.format(date) : dayFormatterWithYear.format(date);
}

export type ActivityDayGroup = { label: string; events: ActivityEventRow[] };

// Events arrive newest-first; grouped by calendar day so each day's events
// stay in that same newest-first order within the group.
export function groupActivityByDay(events: ActivityEventRow[]): ActivityDayGroup[] {
  const now = new Date();
  const groups: ActivityDayGroup[] = [];

  for (const event of events) {
    const label = dayLabel(event.createdAt, now);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return groups;
}

function fieldLabel(type: "STATUS_CHANGED" | "PRIORITY_CHANGED" | "SEVERITY_CHANGED", value: string): string {
  if (type === "STATUS_CHANGED") return BUG_STATUS_META[value as keyof typeof BUG_STATUS_META]?.label ?? value;
  if (type === "PRIORITY_CHANGED") return PRIORITY_META[value as keyof typeof PRIORITY_META]?.label ?? value;
  return SEVERITY_META[value as keyof typeof SEVERITY_META]?.label ?? value;
}

export function describeActivityEvent(event: ActivityEventRow): { title: string; detail?: string } {
  const actorName = event.actor?.name ?? "Someone";

  switch (event.type) {
    case "BUG_CREATED":
      return { title: "Bug created", detail: event.actor ? `Reported by ${actorName}` : undefined };
    case "STATUS_CHANGED":
      return {
        title: "Status changed:",
        detail: `${fieldLabel("STATUS_CHANGED", event.fromValue ?? "")} → ${fieldLabel("STATUS_CHANGED", event.toValue ?? "")}`,
      };
    case "PRIORITY_CHANGED":
      return {
        title: "Priority changed:",
        detail: `${fieldLabel("PRIORITY_CHANGED", event.fromValue ?? "")} → ${fieldLabel("PRIORITY_CHANGED", event.toValue ?? "")}`,
      };
    case "SEVERITY_CHANGED":
      return {
        title: "Severity changed:",
        detail: `${fieldLabel("SEVERITY_CHANGED", event.fromValue ?? "")} → ${fieldLabel("SEVERITY_CHANGED", event.toValue ?? "")}`,
      };
    case "ASSIGNED":
      return {
        title: event.targetTester ? `Assigned to ${event.targetTester.name}` : "Developer assigned",
      };
    case "UNASSIGNED":
      return { title: "Unassigned" };
    case "COMMENT_ADDED":
      return { title: "Comment added", detail: event.actor ? `by ${actorName}` : undefined };
    default:
      return { title: event.type };
  }
}
