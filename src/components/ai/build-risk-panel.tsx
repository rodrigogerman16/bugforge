"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Sparkles, Loader2, TriangleAlert } from "lucide-react";
import { getBuildReleaseRisk } from "@/app/ai/actions";
import { RELEASE_RISK_META, type BuildReleaseRiskAnalysis } from "@/lib/ai/release-analysis";
import { fadeSlideUp, baseTransition } from "@/lib/utils/motion";
import { cn } from "@/lib/utils";

// On-demand, not eager — a build risk analysis touches several real queries
// (regression-rate trend, coverage, bug clustering), so it only runs when a
// tester actually asks for it on this specific build card, not on every
// page load across a whole grid of builds.
export function BuildRiskPanel({ buildId }: { buildId: string }) {
  const [result, setResult] = useState<BuildReleaseRiskAnalysis | null>(null);
  const [isPending, startTransition] = useTransition();

  function analyze() {
    if (isPending) return;
    startTransition(async () => {
      setResult(await getBuildReleaseRisk(buildId));
    });
  }

  if (!result) {
    return (
      <button
        onClick={analyze}
        disabled={isPending}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-[color:var(--bf-brand)]/30 py-1.5 text-[11px] font-medium text-[color:var(--bf-brand)] hover:bg-[color:var(--bf-brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        Analyze build risk
      </button>
    );
  }

  const meta = RELEASE_RISK_META[result.band];

  return (
    <motion.div
      variants={fadeSlideUp}
      initial="initial"
      animate="animate"
      transition={baseTransition}
      className="mt-3 rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-page)] p-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        <Sparkles size={10} className="text-[color:var(--bf-brand)]" />
        Release Risk
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold" style={{ color: meta.color }}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        {meta.label}
      </p>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        Primary concerns
      </p>
      <ul className="mt-1 space-y-1">
        {result.concerns.map((c, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-[color:var(--bf-ink-secondary)]">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--bf-ink-muted)]" />
            {c}
          </li>
        ))}
      </ul>

      <p className={cn("mt-2 flex items-start gap-1.5 border-t border-[color:var(--bf-border)] pt-2 text-[10px] leading-relaxed text-[color:var(--bf-ink-muted)]")}>
        <TriangleAlert size={10} className="mt-0.5 shrink-0" />
        AI recommendations are suggestions, not authoritative decisions.
      </p>
    </motion.div>
  );
}
