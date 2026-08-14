"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ShieldAlert, SkipForward } from "lucide-react";
import { executeTestCase, type StepExecutionInput } from "@/app/test-cases/actions";
import { STEP_RESULT_OPTIONS, TEST_RUN_RESULT_META } from "@/lib/test-case";
import { cn } from "@/lib/utils";

type Session = { id: string; name: string; build: { version: string } };

const RESULT_ICON: Record<string, typeof CheckCircle2> = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  BLOCKED: ShieldAlert,
  SKIPPED: SkipForward,
};

export function ExecuteTestCaseForm({
  testCaseId,
  stepTexts,
  sessions,
  testCaseHref,
}: {
  testCaseId: string;
  stepTexts: string[];
  sessions: Session[];
  testCaseHref: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [results, setResults] = useState<string[]>(stepTexts.map(() => "PASS"));
  const [notes, setNotes] = useState<string[]>(stepTexts.map(() => ""));
  const [outcome, setOutcome] = useState<{ overallResult: string; createdBug: { id: string; number: number } | null } | null>(null);

  function setStepResult(index: number, result: string) {
    setResults((prev) => prev.map((r, i) => (i === index ? result : r)));
  }

  function setStepNotes(index: number, value: string) {
    setNotes((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function handleSubmit() {
    if (!sessionId || isPending) return;
    const steps: StepExecutionInput[] = stepTexts.map((stepText, i) => ({
      stepIndex: i,
      stepText,
      result: results[i],
      notes: notes[i],
    }));
    startTransition(async () => {
      const result = await executeTestCase({ testCaseId, sessionId, steps });
      if (result) setOutcome(result);
    });
  }

  function handleReset() {
    setOutcome(null);
    setResults(stepTexts.map(() => "PASS"));
    setNotes(stepTexts.map(() => ""));
  }

  if (outcome) {
    const meta = TEST_RUN_RESULT_META[outcome.overallResult] ?? { label: outcome.overallResult, color: "var(--bf-ink-muted)" };
    return (
      <div
        className="rounded-lg border-2 px-6 py-8 text-center"
        style={{
          borderColor: meta.color,
          backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
        }}
      >
        <p className="text-[12px] font-semibold tracking-wide text-[color:var(--bf-ink-muted)] uppercase">Test Result</p>
        <p className="mt-2 text-3xl font-extrabold tracking-wide uppercase" style={{ color: meta.color }}>
          {meta.label}
        </p>

        {outcome.createdBug && (
          <p className="mt-4 text-sm text-[color:var(--bf-ink-secondary)]">
            <Link href={`/bugs/${outcome.createdBug.id}`} className="font-semibold hover:underline" style={{ color: "var(--bf-status-critical)" }}>
              BUG-{outcome.createdBug.number}
            </Link>{" "}
            created automatically
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={handleReset}
            className="rounded-md border border-[color:var(--bf-border)] px-4 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
          >
            Run Again
          </button>
          <Link
            href={testCaseHref}
            className="rounded-md bg-[color:var(--bf-brand)] px-4 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
          >
            Back to Test Case
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]">Session</label>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full max-w-xs rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.build.version})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {stepTexts.map((stepText, i) => (
          <div key={i} className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--bf-ink-primary)]">
              {i + 1}. {stepText}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STEP_RESULT_OPTIONS.map((option) => {
                const meta = TEST_RUN_RESULT_META[option];
                const Icon = RESULT_ICON[option];
                const active = results[i] === option;
                return (
                  <button
                    key={option}
                    onClick={() => setStepResult(i, option)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium",
                      active ? "border-transparent" : "border-[color:var(--bf-border)] text-[color:var(--bf-ink-muted)] hover:border-[color:var(--bf-border-strong)]"
                    )}
                    style={active ? { backgroundColor: `color-mix(in srgb, ${meta.color} 20%, transparent)`, color: meta.color } : undefined}
                  >
                    <Icon size={13} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            {(results[i] === "FAIL" || results[i] === "BLOCKED") && (
              <textarea
                value={notes[i]}
                onChange={(e) => setStepNotes(i, e.target.value)}
                rows={2}
                placeholder="What happened at this step?"
                className="mt-3 w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)]"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!sessionId || isPending}
          className={cn(
            "rounded-md bg-[color:var(--bf-brand)] px-4 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
            (!sessionId || isPending) && "cursor-not-allowed opacity-50 hover:opacity-50"
          )}
        >
          Finish Execution
        </button>
      </div>
    </div>
  );
}
