"use client";

import { useState, useTransition } from "react";
import { logTestRun } from "@/app/test-cases/actions";
import { cn } from "@/lib/utils";

type Session = { id: string; name: string; build: { version: string } };

const RESULT_OPTIONS = ["PASS", "FAIL", "BLOCKED", "SKIPPED"];

export function LogTestRunForm({ testCaseId, sessions }: { testCaseId: string; sessions: Session[] }) {
  const [isPending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [result, setResult] = useState("PASS");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    if (!sessionId || isPending) return;
    startTransition(async () => {
      await logTestRun({ testCaseId, sessionId, result, notes });
      setNotes("");
    });
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-[color:var(--bf-ink-muted)]">No QA sessions exist for this game yet.</p>;
  }

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]">Session</label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2 py-1.5 text-sm text-[color:var(--bf-ink-primary)] outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.build.version})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]">Result</label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2 py-1.5 text-sm text-[color:var(--bf-ink-primary)] outline-none"
          >
            {RESULT_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)]"
          placeholder="What happened during this run?"
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className={cn(
            "rounded-md bg-[color:var(--bf-brand)] px-4 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
            isPending && "cursor-not-allowed opacity-50 hover:opacity-50"
          )}
        >
          Log Run
        </button>
      </div>
    </div>
  );
}
