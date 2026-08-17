"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { SEVERITY_META } from "@/lib/severity";
import { PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { REGRESSION_RISK_META } from "@/lib/ai/heuristics";
import type { AiResult } from "@/lib/ai/types";
import { updateBugSeverity, updateBugPriority } from "@/app/bugs/[id]/bug-field-actions";
import { createRelationship } from "@/app/bugs/[id]/relationship-actions";
import { cn } from "@/lib/utils";

const CONFIDENCE_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

function ConfidenceBadge({ confidence }: { confidence: "low" | "medium" | "high" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        confidence === "high" && "border-[color:var(--bf-status-good)]/40 text-[color:var(--bf-status-good)]",
        confidence === "medium" && "border-[color:var(--bf-status-warning)]/40 text-[color:var(--bf-status-warning)]",
        confidence === "low" && "border-[color:var(--bf-border-strong)] text-[color:var(--bf-ink-muted)]"
      )}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {reasons.map((r, i) => (
        <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[color:var(--bf-ink-secondary)]">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--bf-ink-muted)]" />
          {r}
        </li>
      ))}
    </ul>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex shrink-0 items-center gap-1 rounded-md border border-[color:var(--bf-border)] px-2 py-1 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function AiResultView({ bugId, result }: { bugId: string; result: AiResult }) {
  switch (result.key) {
    case "ANALYZE":
      return (
        <div className="space-y-5">
          <Section title="Suggested severity">
            <SeverityResult bugId={bugId} data={result.data.severity} />
          </Section>
          <Section title="Suggested priority">
            <PriorityResult bugId={bugId} data={result.data.priority} />
          </Section>
          <Section title="Possible duplicates">
            <DuplicatesResult bugId={bugId} data={result.data.topDuplicates} />
          </Section>
          <Section title="Affected systems">
            <AffectedSystemsResult data={result.data.affectedSystems} />
          </Section>
          <Section title="Regression risk">
            <RegressionRiskResult data={result.data.regressionRisk} />
          </Section>
        </div>
      );
    case "SEVERITY":
      return <SeverityResult bugId={bugId} data={result.data} />;
    case "PRIORITY":
      return <PriorityResult bugId={bugId} data={result.data} />;
    case "DUPLICATES":
      return <DuplicatesResult bugId={bugId} data={result.data} />;
    case "REPRO_STEPS":
      return <ReproStepsResult data={result.data} />;
    case "SUMMARY":
      return <SummaryResult data={result.data} />;
    case "AFFECTED_SYSTEMS":
      return <AffectedSystemsResult data={result.data} />;
    case "TEST_CASE":
      return <TestCaseResult bugId={bugId} data={result.data} />;
    case "REGRESSION_RISK":
      return <RegressionRiskResult data={result.data} />;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{title}</h3>
      {children}
    </div>
  );
}

function SeverityResult({ bugId, data }: { bugId: string; data: Extract<AiResult, { key: "SEVERITY" }>["data"] }) {
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={SEVERITY_META[data.current].color} label={SEVERITY_META[data.current].label} sublabel="Current" />
        {data.changed && (
          <>
            <span className="text-[color:var(--bf-ink-muted)]">→</span>
            <Badge color={SEVERITY_META[data.suggested].color} label={SEVERITY_META[data.suggested].label} sublabel="Suggested" />
          </>
        )}
        <div className="ml-auto">
          <ConfidenceBadge confidence={data.confidence} />
        </div>
      </div>
      <ReasonList reasons={data.reasons} />
      {data.changed && (
        <button
          disabled={isPending || applied}
          onClick={() =>
            startTransition(async () => {
              await updateBugSeverity(bugId, data.suggested);
              setApplied(true);
            })
          }
          className="mt-3 flex items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-2.5 py-1.5 text-[11px] font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applied ? <Check size={12} /> : null}
          {applied ? "Applied" : `Apply — set to ${SEVERITY_META[data.suggested].label}`}
        </button>
      )}
    </div>
  );
}

function PriorityResult({ bugId, data }: { bugId: string; data: Extract<AiResult, { key: "PRIORITY" }>["data"] }) {
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={PRIORITY_META[data.current].color} label={`${PRIORITY_META[data.current].code} — ${PRIORITY_META[data.current].label}`} sublabel="Current" />
        {data.changed && (
          <>
            <span className="text-[color:var(--bf-ink-muted)]">→</span>
            <Badge color={PRIORITY_META[data.suggested].color} label={`${PRIORITY_META[data.suggested].code} — ${PRIORITY_META[data.suggested].label}`} sublabel="Suggested" />
          </>
        )}
        <div className="ml-auto">
          <ConfidenceBadge confidence={data.confidence} />
        </div>
      </div>
      <ReasonList reasons={data.reasons} />
      {data.changed && (
        <button
          disabled={isPending || applied}
          onClick={() =>
            startTransition(async () => {
              await updateBugPriority(bugId, data.suggested);
              setApplied(true);
            })
          }
          className="mt-3 flex items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-2.5 py-1.5 text-[11px] font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applied ? <Check size={12} /> : null}
          {applied ? "Applied" : `Apply — set to ${PRIORITY_META[data.suggested].code}`}
        </button>
      )}
    </div>
  );
}

function Badge({ color, label, sublabel }: { color: string; label: string; sublabel: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2 py-1 text-[12px]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium text-[color:var(--bf-ink-primary)]">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{sublabel}</span>
    </span>
  );
}

function DuplicatesResult({ bugId, data }: { bugId: string; data: Extract<AiResult, { key: "DUPLICATES" }>["data"] }) {
  const [isPending, startTransition] = useTransition();
  const [markedId, setMarkedId] = useState<string | null>(null);

  if (data.length === 0) {
    return <p className="text-[12px] text-[color:var(--bf-ink-muted)]">No bugs in this game share enough text overlap to look like a duplicate.</p>;
  }

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.id} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/bugs/${d.id}`} className="flex-1 text-[12px] font-medium text-[color:var(--bf-ink-primary)] hover:text-[color:var(--bf-brand)]">
              BUG-{d.number} — {d.title}
            </Link>
            <span className="shrink-0 rounded-full border border-[color:var(--bf-border-strong)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--bf-ink-secondary)]">
              {d.similarityPercent}% overlap
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[color:var(--bf-ink-muted)]">
            <span style={{ color: SEVERITY_META[d.severity].color }}>{SEVERITY_META[d.severity].label}</span>
            <span>·</span>
            <span>{BUG_STATUS_META[d.status].label}</span>
          </div>
          <button
            disabled={isPending || markedId === d.id}
            onClick={() =>
              startTransition(async () => {
                await createRelationship({ currentBugId: bugId, targetBugId: d.id, pickerLabel: "Duplicate of" });
                setMarkedId(d.id);
              })
            }
            className="mt-2 flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2 py-1 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markedId === d.id ? <Check size={11} /> : null}
            {markedId === d.id ? "Marked as duplicate" : "Mark as duplicate of this"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReproStepsResult({ data }: { data: Extract<AiResult, { key: "REPRO_STEPS" }>["data"] }) {
  return (
    <div className="space-y-4">
      {data.issues.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">Issues found</h3>
          <ul className="space-y-1.5">
            {data.issues.map((issue, i) => (
              <li
                key={i}
                className={cn(
                  "flex gap-2 text-[12px] leading-relaxed",
                  issue.level === "error" ? "text-[color:var(--bf-status-critical)]" : "text-[color:var(--bf-ink-secondary)]"
                )}
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.cleanedSteps.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">Cleaned steps</h3>
            <CopyButton text={data.cleanedSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")} />
          </div>
          <ol className="list-decimal space-y-1 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3 pl-7 text-[12px] text-[color:var(--bf-ink-secondary)]">
            {data.cleanedSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SummaryResult({ data }: { data: Extract<AiResult, { key: "SUMMARY" }>["data"] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
        <p className="text-[12px] leading-relaxed text-[color:var(--bf-ink-secondary)]">{data.paragraph}</p>
        <CopyButton text={data.paragraph} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {data.facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[10px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{f.label}</dt>
            <dd className="text-[12px] font-medium text-[color:var(--bf-ink-primary)]">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AffectedSystemsResult({ data }: { data: Extract<AiResult, { key: "AFFECTED_SYSTEMS" }>["data"] }) {
  return (
    <ul className="space-y-2">
      {data.map((s, i) => (
        <li key={i} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[color:var(--bf-ink-primary)]">{s.name}</span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                s.confidence === "primary"
                  ? "border-[color:var(--bf-brand)]/40 text-[color:var(--bf-brand)]"
                  : "border-[color:var(--bf-border-strong)] text-[color:var(--bf-ink-muted)]"
              )}
            >
              {s.confidence === "primary" ? "Primary" : "Possible"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">{s.reason}</p>
        </li>
      ))}
    </ul>
  );
}

function TestCaseResult({ bugId, data }: { bugId: string; data: Extract<AiResult, { key: "TEST_CASE" }>["data"] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
        <p className="text-[12px] font-medium text-[color:var(--bf-ink-primary)]">{data.title}</p>
        <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">{data.description}</p>
        <div className="mt-3 space-y-2 text-[12px] text-[color:var(--bf-ink-secondary)]">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">Preconditions</p>
            <p>{data.preconditions}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">Steps</p>
            <p className="whitespace-pre-line">{data.steps}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">Expected</p>
            <p>{data.expected}</p>
          </div>
        </div>
      </div>
      <Link
        href={`/test-cases/new?fromBug=${bugId}`}
        className="flex w-fit items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-2.5 py-1.5 text-[11px] font-medium text-black hover:opacity-90"
      >
        Create this test case
        <ExternalLink size={11} />
      </Link>
    </div>
  );
}

function RegressionRiskResult({ data }: { data: Extract<AiResult, { key: "REGRESSION_RISK" }>["data"] }) {
  const meta = REGRESSION_RISK_META[data.band];
  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-sm font-semibold" style={{ color: meta.color }}>
          {meta.label} risk
        </span>
      </div>
      <ReasonList reasons={data.reasons} />
    </div>
  );
}
