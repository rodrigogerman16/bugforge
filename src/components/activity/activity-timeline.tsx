import {
  Flag,
  MessageSquare,
  PlusCircle,
  UserMinus,
  UserPlus,
  ArrowRightLeft,
  GaugeCircle,
  type LucideIcon,
} from "lucide-react";
import { groupActivityByDay, describeActivityEvent, formatEventTime, type ActivityEventRow } from "@/lib/activity";

const EVENT_ICON: Record<ActivityEventRow["type"], LucideIcon> = {
  BUG_CREATED: PlusCircle,
  STATUS_CHANGED: ArrowRightLeft,
  PRIORITY_CHANGED: Flag,
  SEVERITY_CHANGED: GaugeCircle,
  ASSIGNED: UserPlus,
  UNASSIGNED: UserMinus,
  COMMENT_ADDED: MessageSquare,
};

export function ActivityTimeline({ events }: { events: ActivityEventRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[color:var(--bf-ink-muted)]">No activity yet.</p>;
  }

  const groups = groupActivityByDay(events);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
            {group.label}
          </h3>
          <ol className="space-y-4 border-l border-[color:var(--bf-border)] pl-4">
            {group.events.map((event) => {
              const { title, detail } = describeActivityEvent(event);
              const Icon = EVENT_ICON[event.type];
              return (
                <li key={event.id} className="relative">
                  <span
                    className="absolute top-1 left-[-21px] flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--bf-surface)] text-[color:var(--bf-ink-muted)]"
                    aria-hidden
                  >
                    <Icon size={11} strokeWidth={2.25} />
                  </span>
                  <p className="font-mono text-[11px] text-[color:var(--bf-ink-muted)]">{formatEventTime(event.createdAt)}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[color:var(--bf-ink-primary)]">{title}</p>
                  {detail && <p className="text-[13px] text-[color:var(--bf-ink-secondary)]">{detail}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
