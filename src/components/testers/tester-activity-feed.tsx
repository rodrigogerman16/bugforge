import Link from "next/link";
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
import { describeActivityEvent, formatEventTime, type ActivityEventRow, type ActivityDayGroup } from "@/lib/activity";

const EVENT_ICON: Record<ActivityEventRow["type"], LucideIcon> = {
  BUG_CREATED: PlusCircle,
  STATUS_CHANGED: ArrowRightLeft,
  PRIORITY_CHANGED: Flag,
  SEVERITY_CHANGED: GaugeCircle,
  ASSIGNED: UserPlus,
  UNASSIGNED: UserMinus,
  COMMENT_ADDED: MessageSquare,
};

type Row = ActivityEventRow & { bug: { id: string; number: number; title: string } };

export function TesterActivityFeed({ groups }: { groups: ActivityDayGroup<Row>[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-[color:var(--bf-ink-muted)]">No activity yet.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-3 text-[12px] font-semibold tracking-wide text-[color:var(--bf-ink-muted)] uppercase">
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
                  <Link
                    href={`/bugs/${event.bug.id}`}
                    className="text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-brand)] hover:underline"
                  >
                    BUG-{event.bug.number} — {event.bug.title}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
