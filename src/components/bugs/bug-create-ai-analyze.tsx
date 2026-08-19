import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2 } from "lucide-react";
import { fadeSlideUp, baseTransition } from "@/lib/utils/motion";

export function BugCreateAiAnalyze({
  onAnalyze,
  isAnalyzing,
  disabled,
  aiFillSummary,
}: {
  onAnalyze: () => void;
  isAnalyzing: boolean;
  disabled: boolean;
  aiFillSummary: string[] | null;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onAnalyze}
        disabled={disabled || isAnalyzing}
        className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-brand)]/30 px-3 py-1.5 text-[12px] font-medium text-[color:var(--bf-brand)] hover:bg-[color:var(--bf-brand-soft)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        Analyze with AI
      </button>

      <AnimatePresence>
        {aiFillSummary && (
          <motion.div
            variants={fadeSlideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={baseTransition}
            className="mt-2 rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-surface)] p-3"
          >
            <p className="mb-1 text-[12px] font-semibold text-[color:var(--bf-ink-primary)]">BugForge AI filled in:</p>
            <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-[color:var(--bf-ink-secondary)]">
              {aiFillSummary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
              Computed from your title, description, and this game&apos;s real data — review and edit anything before
              submitting. Expected Result isn&apos;t auto-filled; only you know what should happen instead.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
