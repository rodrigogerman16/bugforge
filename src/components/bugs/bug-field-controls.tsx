"use client";

import { useTransition } from "react";
import { BUG_STATUS_META, BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { SEVERITY_META, SEVERITY_ORDER } from "@/lib/severity";
import {
  updateBugStatus,
  updateBugPriority,
  updateBugSeverity,
  updateBugAssignee,
  updateBugArea,
} from "@/app/bugs/[id]/bug-field-actions";
import type { BugStatus, BugPriority, BugSeverity } from "@/generated/prisma/enums";

const STATUS_OPTIONS: BugStatus[] = [...BUG_WORKFLOW_MAIN, ...BUG_WORKFLOW_EXITS];

const selectClass =
  "appearance-none rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-0.5 pl-2 pr-6 text-[13px] font-medium outline-none hover:border-[color:var(--bf-border-strong)] disabled:opacity-50";

export function BugFieldControls({
  bugId,
  status,
  priority,
  severity,
}: {
  bugId: string;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <select
        value={severity}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateBugSeverity(bugId, e.target.value as BugSeverity))}
        style={{ color: SEVERITY_META[severity].color }}
        className={selectClass}
      >
        {SEVERITY_ORDER.map((s) => (
          <option key={s} value={s} style={{ color: "initial" }}>
            {SEVERITY_META[s].label}
          </option>
        ))}
      </select>
      <span className="text-[color:var(--bf-ink-muted)]">·</span>
      <select
        value={priority}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateBugPriority(bugId, e.target.value as BugPriority))}
        style={{ color: PRIORITY_META[priority].color }}
        className={selectClass}
      >
        {PRIORITY_ORDER.map((p) => (
          <option key={p} value={p} style={{ color: "initial" }}>
            {PRIORITY_META[p].code} — {PRIORITY_META[p].label}
          </option>
        ))}
      </select>
      <span className="text-[color:var(--bf-ink-muted)]">·</span>
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateBugStatus(bugId, e.target.value as BugStatus))}
        style={{ color: BUG_STATUS_META[status].color }}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s} style={{ color: "initial" }}>
            {BUG_STATUS_META[s].label}
          </option>
        ))}
      </select>
    </>
  );
}

type Tester = { id: string; name: string };

export function BugAssigneeControl({
  bugId,
  assignedToId,
  testers,
}: {
  bugId: string;
  assignedToId: string | null;
  testers: Tester[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={assignedToId ?? ""}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateBugAssignee(bugId, e.target.value || null))}
      className="appearance-none rounded-md border border-transparent bg-transparent py-0 pr-4 text-[13px] text-[color:var(--bf-ink-muted)] outline-none hover:border-[color:var(--bf-border)] disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {testers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

type Area = { id: string; name: string };

export function BugAreaControl({
  bugId,
  areaId,
  areas,
}: {
  bugId: string;
  areaId: string | null;
  areas: Area[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={areaId ?? ""}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateBugArea(bugId, e.target.value || null))}
      className="appearance-none rounded-md border border-transparent bg-transparent py-0 pr-4 text-[13px] text-[color:var(--bf-ink-muted)] outline-none hover:border-[color:var(--bf-border)] disabled:opacity-50"
    >
      <option value="">No area</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
