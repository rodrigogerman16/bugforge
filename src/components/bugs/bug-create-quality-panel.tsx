import { motion, AnimatePresence } from "motion/react";
import { Check, TriangleAlert } from "lucide-react";
import { fadeSlideUp, baseTransition, fastTransition } from "@/lib/utils/motion";
import { QUALITY_COLOR } from "@/components/bugs/bug-create-form-shared";
import { cn } from "@/lib/utils";
import type { BugReportQuality } from "@/lib/ai/bug-analysis";

export function BugCreateQualityPanel({ quality }: { quality: BugReportQuality | null }) {
  return (
    <AnimatePresence>
      {quality && (
        <motion.div
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={baseTransition}
          className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">Report Quality</span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={quality.score}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={fastTransition}
                className="text-sm font-bold"
                style={{ color: QUALITY_COLOR(quality.score) }}
              >
                {quality.score} / 100
              </motion.span>
            </AnimatePresence>
          </div>
          <ul className="space-y-1">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
