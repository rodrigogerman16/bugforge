import Link from "next/link";
import { ClipboardCheck, UserCheck, RotateCcw, FileText, ArrowRight } from "lucide-react";
import type { QaWorkQueue } from "@/lib/db";

function Row({
  icon: Icon,
  count,
  label,
  href,
  accent,
  cta,
}: {
  icon: typeof ClipboardCheck;
  count: number;
  label: string;
  href: string;
  accent?: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3 hover:border-[color:var(--bf-border-strong)]"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: accent ? `${accent}1f` : "var(--bf-brand-soft)" }}
      >
        <Icon size={16} strokeWidth={2} style={{ color: accent ?? "var(--bf-brand)" }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold leading-none tabular-nums text-[color:var(--bf-ink-primary)]">
          {count}
        </span>
        <span className="mt-1.5 block text-[12px] leading-none text-[color:var(--bf-ink-muted)]">{label}</span>
      </span>
      {cta && (
        <span className="hidden shrink-0 items-center gap-1 text-[11px] font-medium text-[color:var(--bf-brand)] group-hover:underline sm:flex">
          {cta}
          <ArrowRight size={12} />
        </span>
      )}
    </Link>
  );
}

export function QaWorkQueueCard({
  queue,
  gameSlug,
  userId,
}: {
  queue: QaWorkQueue;
  gameSlug: string;
  userId: string;
}) {
  const g = `game=${gameSlug}`;

  return (
    <div className="mb-8">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
        QA Work Queue
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Row
          icon={ClipboardCheck}
          count={queue.readyForQaCount}
          label="Ready for QA"
          href={`/bugs?${g}&status=READY_FOR_QA`}
          accent="var(--bf-status-warning)"
          cta="Review fixes"
        />
        <Row
          icon={UserCheck}
          count={queue.assignedToMeCount}
          label="Assigned to me"
          href={`/bugs?${g}&assignee=${userId}`}
        />
        <Row
          icon={RotateCcw}
          count={queue.regressionCount}
          label="Regression"
          href={`/bugs?${g}&regression=1`}
          accent="var(--bf-status-critical)"
        />
        <Row
          icon={FileText}
          count={queue.reportedByMeOpenCount}
          label="Open bugs reported by me"
          href={`/bugs?${g}&reporter=${userId}`}
        />
      </div>
    </div>
  );
}
