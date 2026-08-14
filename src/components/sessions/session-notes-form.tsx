"use client";

import { useState, useTransition } from "react";
import { updateSessionNotes } from "@/app/sessions/actions";
import { cn } from "@/lib/utils";

export function SessionNotesForm({ sessionId, initialNotes }: { sessionId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const isDirty = notes !== initialNotes;

  function handleSave() {
    if (!isDirty || isPending) return;
    startTransition(() => updateSessionNotes(sessionId, notes));
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Notes about this session — coverage gaps, blockers, environment quirks…"
        className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className={cn(
            "rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
            (!isDirty || isPending) && "cursor-not-allowed opacity-50 hover:opacity-50"
          )}
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}
