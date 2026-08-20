"use client";

import { useTransition } from "react";
import { motion } from "motion/react";
import { changeHighlight, changeHighlightTransition } from "@/lib/utils/motion";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { SEVERITY_META, SEVERITY_ORDER } from "@/lib/severity";
import {
  updateBugStatus,
  updateBugPriority,
  updateBugSeverity,
  updateBugAssignee,
  updateBugArea,
  updateBugFixedBuild,
  updateBugVerifiedBuild,
} from "@/app/bugs/[id]/bug-field-actions";
import type { BugStatus, BugPriority, BugSeverity } from "@/generated/prisma/enums";

const selectClass =
  "appearance-none rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-0.5 pl-2 pr-6 text-[13px] font-medium outline-none hover:border-[color:var(--bf-border-strong)] disabled:opacity-50";

// Role permissions decide which of these render as a real control vs. plain
// text (see lib/permissions.ts) — every mutation is re-checked server-side
// regardless, this is purely about not showing an editable-looking control
// for something the role can't actually change.
export function BugFieldControls({
  bugId,
  status,
  priority,
  severity,
  canEditFields,
  canChangeStatus,
  statusOptions,
}: {
  bugId: string;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
  canEditFields: boolean;
  canChangeStatus: boolean;
  statusOptions: BugStatus[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {canEditFields ? (
        <motion.span
          key={severity}
          variants={changeHighlight}
          initial="initial"
          animate="animate"
          transition={changeHighlightTransition}
          className="inline-block rounded-md"
        >
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
        </motion.span>
      ) : (
        <span className="text-[13px] font-medium" style={{ color: SEVERITY_META[severity].color }}>
          {SEVERITY_META[severity].label}
        </span>
      )}
      <span className="text-[color:var(--bf-ink-muted)]">·</span>
      {canEditFields ? (
        <motion.span
          key={priority}
          variants={changeHighlight}
          initial="initial"
          animate="animate"
          transition={changeHighlightTransition}
          className="inline-block rounded-md"
        >
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
        </motion.span>
      ) : (
        <span className="text-[13px] font-medium" style={{ color: PRIORITY_META[priority].color }}>
          {PRIORITY_META[priority].code} — {PRIORITY_META[priority].label}
        </span>
      )}
      <span className="text-[color:var(--bf-ink-muted)]">·</span>
      {canChangeStatus ? (
        <motion.span
          key={status}
          variants={changeHighlight}
          initial="initial"
          animate="animate"
          transition={changeHighlightTransition}
          className="inline-block rounded-md"
        >
          <select
            value={status}
            disabled={isPending}
            onChange={(e) => startTransition(() => updateBugStatus(bugId, e.target.value as BugStatus))}
            style={{ color: BUG_STATUS_META[status].color }}
            className={selectClass}
          >
            {/* The current status always shows even if this role couldn't
                have set it themselves (e.g. a Developer viewing a Verified
                bug) — only the *other* options are limited to what they're
                allowed to move it to. */}
            {(statusOptions.includes(status) ? statusOptions : [status, ...statusOptions]).map((s) => (
              <option key={s} value={s} style={{ color: "initial" }}>
                {BUG_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </motion.span>
      ) : (
        <span className="text-[13px] font-medium" style={{ color: BUG_STATUS_META[status].color }}>
          {BUG_STATUS_META[status].label}
        </span>
      )}
    </>
  );
}

type Tester = { id: string; name: string };

export function BugAssigneeControl({
  bugId,
  assignedToId,
  testers,
  canAssign,
}: {
  bugId: string;
  assignedToId: string | null;
  testers: Tester[];
  canAssign: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const assignedName = testers.find((t) => t.id === assignedToId)?.name ?? "Unassigned";

  if (!canAssign) {
    return <span className="text-[13px] text-[color:var(--bf-ink-muted)]">{assignedName}</span>;
  }

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
  canEdit,
}: {
  bugId: string;
  areaId: string | null;
  areas: Area[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const areaName = areas.find((a) => a.id === areaId)?.name ?? "No area";

  if (!canEdit) {
    return <span className="text-[13px] text-[color:var(--bf-ink-muted)]">{areaName}</span>;
  }

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

type Build = { id: string; version: string };

// Shared by BugFixedBuildControl/BugVerifiedBuildControl below — both are
// "which build" pickers that only ever appear once there's a real value to
// show (set automatically the first time the bug reaches Fixed/Verified,
// see updateBugStatus), never a way to set one before that happens.
function BuildField({
  label,
  bugId,
  buildId,
  builds,
  canEdit,
  onChange,
}: {
  label: string;
  bugId: string;
  buildId: string | null;
  builds: Build[];
  canEdit: boolean;
  onChange: (bugId: string, buildId: string | null) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  if (!buildId) return null;
  const version = builds.find((b) => b.id === buildId)?.version ?? "—";

  if (!canEdit) {
    return (
      <span className="flex items-center gap-1 text-[13px] text-[color:var(--bf-ink-muted)]">
        {label} <span className="font-mono font-medium text-[color:var(--bf-ink-secondary)]">{version}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[13px] text-[color:var(--bf-ink-muted)]">
      {label}
      <select
        value={buildId}
        disabled={isPending}
        onChange={(e) => startTransition(() => onChange(bugId, e.target.value))}
        className="appearance-none rounded-md border border-transparent bg-transparent py-0 pr-4 font-mono text-[13px] font-medium text-[color:var(--bf-ink-secondary)] outline-none hover:border-[color:var(--bf-border)] disabled:opacity-50"
      >
        {builds.map((b) => (
          <option key={b.id} value={b.id}>
            {b.version}
          </option>
        ))}
      </select>
    </span>
  );
}

export function BugFixedBuildControl(props: { bugId: string; buildId: string | null; builds: Build[]; canEdit: boolean }) {
  return <BuildField label="Fixed in" onChange={updateBugFixedBuild} {...props} />;
}

export function BugVerifiedBuildControl(props: { bugId: string; buildId: string | null; builds: Build[]; canEdit: boolean }) {
  return <BuildField label="Verified in" onChange={updateBugVerifiedBuild} {...props} />;
}
