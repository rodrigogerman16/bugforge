import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { fadeSlideUp, baseTransition } from "@/lib/utils/motion";
import { SEVERITY_META } from "@/lib/severity";
import { BUG_STATUS_META } from "@/lib/status-labels";
import type { DuplicateCandidate } from "@/lib/ai/duplicate-detection";

export function BugCreateDuplicatesPanel({
  searchingDuplicates,
  duplicates,
}: {
  searchingDuplicates: boolean;
  duplicates: DuplicateCandidate[];
}) {
  return (
    <AnimatePresence>
      {(searchingDuplicates || duplicates.length > 0) && (
        <motion.div
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={baseTransition}
          className="rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-surface)] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
            <Sparkles size={12} className="text-[color:var(--bf-brand)]" />
            Possible duplicates
            {searchingDuplicates && <Loader2 size={11} className="animate-spin text-[color:var(--bf-ink-muted)]" />}
          </div>

          {duplicates.length === 0 ? (
            <p className="text-[12px] text-[color:var(--bf-ink-muted)]">Searching...</p>
          ) : (
            <ul className="space-y-2">
              {duplicates.map((d) => (
                <li key={d.id} className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[color:var(--bf-ink-primary)]">BUG-{d.number}</p>
                      <p className="truncate text-[12px] text-[color:var(--bf-ink-secondary)]">{d.title}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[color:var(--bf-border-strong)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--bf-ink-secondary)]">
                      Similarity: {d.similarityPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[color:var(--bf-ink-muted)]">
                    <span style={{ color: SEVERITY_META[d.severity].color }}>{SEVERITY_META[d.severity].label}</span>
                    <span>·</span>
                    <span>{BUG_STATUS_META[d.status].label}</span>
                  </div>
                  <Link
                    href={`/bugs/${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2 py-1 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
                  >
                    Open bug
                    <ExternalLink size={10} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
            AI-generated matches from text overlap — not confirmed duplicates. Review before deciding; creating this bug is always your call.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
