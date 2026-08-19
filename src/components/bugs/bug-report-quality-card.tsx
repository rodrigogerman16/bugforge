import { Check, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BugReportQuality } from "@/lib/ai/bug-analysis";

const QUALITY_COLOR = (score: number) =>
  score >= 80 ? "var(--bf-status-good)" : score >= 50 ? "var(--bf-status-warning)" : "var(--bf-status-critical)";

// An optional, advisory readout of how complete this bug report is — never
// a gate on triage, assignment, or any status change, and never rendered
// as a verdict on the bug itself (a Low-severity, well-written report can
// score 100; a Blocker filed in a hurry can score low — this measures the
// report, not the bug). Same seven checks as the report modal's live
// checklist (see assessBugReportQuality), just computed from what actually
// got saved instead of an in-progress draft.
export function BugReportQualityCard({ quality }: { quality: BugReportQuality }) {
  return (
    <section className="mb-6 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-[color:var(--bf-brand)]" />
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
            Report Quality
          </h2>
        </div>
        <span className="text-lg font-bold" style={{ color: QUALITY_COLOR(quality.score) }}>
          {quality.score} <span className="text-[12px] font-medium text-[color:var(--bf-ink-muted)]">/ 100</span>
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {quality.checks.map((c) => (
          <li
            key={c.key}
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              c.met ? "text-[color:var(--bf-ink-secondary)]" : "text-[color:var(--bf-status-warning)]"
            )}
          >
            {c.met ? (
              <Check size={12} className="shrink-0 text-[color:var(--bf-status-good)]" />
            ) : (
              <TriangleAlert size={12} className="shrink-0" />
            )}
            {c.met ? c.label : `Missing ${c.label.toLowerCase()}`}
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-[color:var(--bf-border)] pt-2.5 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
        Advisory only — how complete this report is, not how serious the bug is. Doesn&apos;t affect triage,
        assignment, or status in any way.
      </p>
    </section>
  );
}
