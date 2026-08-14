"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createArea } from "@/app/areas/actions";
import { QA_DISCIPLINE_ORDER, QA_DISCIPLINE_META } from "@/lib/coverage";
import type { QADiscipline } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-1.5 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";

export function AreaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState<QADiscipline | "">("");

  const canSubmit = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(async () => {
      await createArea({ name: name.trim(), discipline: discipline || null });
      setName("");
      setDiscipline("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-[color:var(--bf-ink-muted)]">Area name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weather System"
          className={cn(inputClass, "w-56")}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-[color:var(--bf-ink-muted)]">Discipline (optional)</label>
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value as QADiscipline | "")}
          className={cn(inputClass, "w-44")}
        >
          <option value="">None</option>
          {QA_DISCIPLINE_ORDER.map((d) => (
            <option key={d} value={d}>
              {QA_DISCIPLINE_META[d].label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={!canSubmit || isPending}
        className={cn(
          "flex items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
          (!canSubmit || isPending) && "cursor-not-allowed opacity-50 hover:opacity-50"
        )}
      >
        <Plus size={13} />
        Add Area
      </button>
    </form>
  );
}
