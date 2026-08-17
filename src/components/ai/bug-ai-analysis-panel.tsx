"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronDown, TriangleAlert } from "lucide-react";
import { SEVERITY_META } from "@/lib/severity";
import { REGRESSION_RISK_META } from "@/lib/ai/heuristics";
import type { BugQuickAnalysis } from "@/lib/ai/heuristics";
import { cn } from "@/lib/utils";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-[12px] font-medium text-[color:var(--bf-ink-muted)]">{label}</dt>
      <dd className="text-[13px] text-[color:var(--bf-ink-primary)]">{children}</dd>
    </div>
  );
}

// The inline, on-page counterpart to the BugForge AI drawer's "Analyze this
// bug" action — a compact, always-labeled-as-AI five-field readout shown
// right where a tester is already looking, not tucked behind a search flow.
export function BugAiAnalysisPanel({ analysis }: { analysis: BugQuickAnalysis | null }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!analysis) return null;

  const severityMeta = SEVERITY_META[analysis.severity.suggested];
  const riskMeta = REGRESSION_RISK_META[analysis.regressionProbability.band];

  return (
    <section className="mb-6 rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-surface)]">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-brand)]">
          <Sparkles size={13} />
        </span>
        <span className="flex-1">
          <span className="block text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
            BugForge AI
          </span>
          <span className="block text-[11px] text-[color:var(--bf-ink-muted)]">AI-generated analysis, optional</span>
        </span>
        <ChevronDown size={15} className={cn("shrink-0 text-[color:var(--bf-ink-muted)] transition-transform", !collapsed && "rotate-180")} />
      </button>

      {!collapsed && (
        <div className="border-t border-[color:var(--bf-border)] px-4 py-3">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">Analysis</h3>
          <dl className="divide-y divide-[color:var(--bf-border)]">
            <Row label="Likely subsystem">
              {analysis.subsystem ? (
                <>
                  {analysis.subsystem.name}
                  {analysis.subsystem.confidence === "possible" && (
                    <span className="ml-1.5 text-[11px] text-[color:var(--bf-ink-muted)]">(possible, not certain)</span>
                  )}
                </>
              ) : (
                <span className="text-[color:var(--bf-ink-muted)]">Not enough signal to guess.</span>
              )}
            </Row>

            <Row label="Suggested severity">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: severityMeta.color }} />
                <span style={{ color: severityMeta.color }}>{severityMeta.label}</span>
                {analysis.severity.changed && (
                  <span className="text-[11px] text-[color:var(--bf-ink-muted)]">
                    (currently {SEVERITY_META[analysis.severity.current].label})
                  </span>
                )}
              </span>
            </Row>

            <Row label="Possible duplicate">
              {analysis.duplicate ? (
                <Link href={`/bugs/${analysis.duplicate.id}`} className="hover:text-[color:var(--bf-brand)]">
                  BUG-{analysis.duplicate.number} — {analysis.duplicate.title}
                  <span className="ml-1.5 text-[11px] text-[color:var(--bf-ink-muted)]">
                    ({analysis.duplicate.similarityPercent}% text overlap)
                  </span>
                </Link>
              ) : (
                <span className="text-[color:var(--bf-ink-muted)]">None found with strong text overlap.</span>
              )}
            </Row>

            <Row label="Regression probability">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: riskMeta.color }} />
                <span style={{ color: riskMeta.color }}>{riskMeta.label}</span>
              </span>
            </Row>

            <Row label="Recommended next test">{analysis.recommendedNextTest}</Row>
          </dl>

          <p className="mt-3 flex items-start gap-1.5 border-t border-[color:var(--bf-border)] pt-3 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
            <TriangleAlert size={12} className="mt-0.5 shrink-0" />
            AI-generated from this bug&apos;s own data — a starting point for triage, not a confirmed finding. Verify before acting on it.
          </p>
        </div>
      )}
    </section>
  );
}
