"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2, Trash2, RotateCcw } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { BUG_STATUS_META, BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { bulkUpdateBugStatus, bulkDeleteBugs } from "@/app/bugs/actions";
import { cn } from "@/lib/utils";
import type { getBugList, BugSortField } from "@/lib/db";
import type { BugStatus } from "@/generated/prisma/enums";

type BugRow = Awaited<ReturnType<typeof getBugList>>["bugs"][number];
type ColumnKey = "severity" | "priority" | "status" | "area" | "build" | "reporter" | "assignee" | "updatedAt";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "severity", label: "Severity" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "area", label: "Area" },
  { key: "build", label: "Build" },
  { key: "reporter", label: "Reporter" },
  { key: "assignee", label: "Assignee" },
  { key: "updatedAt", label: "Updated" },
];

const STATUS_OPTIONS = [...BUG_WORKFLOW_MAIN, ...BUG_WORKFLOW_EXITS];
const STORAGE_KEY = "bugforge:bug-columns";

export function BugTable({
  bugs,
  sort,
  dir,
  showGameColumn,
}: {
  bugs: BugRow[];
  sort: BugSortField;
  dir: "asc" | "desc";
  showGameColumn: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<BugStatus>(BUG_WORKFLOW_MAIN[1]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setHiddenColumns(new Set(JSON.parse(stored)));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    setSelected(new Set());
  }, [bugs]);

  function toggleColumn(key: ColumnKey) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const isVisible = (key: ColumnKey) => !hiddenColumns.has(key);

  function sortHref(field: BugSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextDir = sort === field && dir === "desc" ? "asc" : "desc";
    params.set("sort", field);
    params.set("dir", nextDir);
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  }

  function renderSortHeader(field: BugSortField, label: string): ReactNode {
    const active = sort === field;
    return (
      <Link href={sortHref(field)} className="flex items-center gap-1 hover:text-[color:var(--bf-ink-primary)]">
        {label}
        {active ? (
          dir === "desc" ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronUp size={12} />
          )
        ) : (
          <ChevronsUpDown size={12} className="opacity-40" />
        )}
      </Link>
    );
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === bugs.length ? new Set() : new Set(bugs.map((b) => b.id))));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyBulkStatus() {
    const ids = [...selected];
    startTransition(async () => {
      await bulkUpdateBugStatus(ids, bulkStatus);
      setSelected(new Set());
    });
  }

  function applyBulkDelete() {
    if (!window.confirm(`Delete ${selected.size} bug${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    const ids = [...selected];
    startTransition(async () => {
      await bulkDeleteBugs(ids);
      setSelected(new Set());
    });
  }

  return (
    <div>
      <div className="mb-2 flex min-h-[38px] items-center justify-between gap-3">
        {selected.size > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-1.5 text-sm">
            <span className="text-[color:var(--bf-ink-secondary)]">{selected.size} selected</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as BugStatus)}
              className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2 py-1 text-[12px] text-[color:var(--bf-ink-secondary)]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {BUG_STATUS_META[s].label}
                </option>
              ))}
            </select>
            <button
              onClick={applyBulkStatus}
              disabled={isPending}
              className="rounded-md bg-[color:var(--bf-brand-soft)] px-2.5 py-1 text-[12px] font-medium text-[color:var(--bf-brand)] hover:opacity-80 disabled:opacity-50"
            >
              Apply
            </button>
            <button
              onClick={applyBulkDelete}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium text-[color:var(--bf-status-critical)] hover:bg-[color:var(--bf-status-critical)]/10 disabled:opacity-50"
            >
              <Trash2 size={12} />
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
            >
              Clear
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Column visibility only means something for the table — the
            mobile card layout below always shows the same fixed summary. */}
        <Dropdown
          align="right"
          trigger={({ toggle, open }) => (
            <button
              onClick={toggle}
              aria-haspopup="true"
              aria-expanded={open}
              className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2.5 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] md:flex"
            >
              <Settings2 size={13} />
              Columns
            </button>
          )}
        >
          {() => (
            <div className="py-1">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)]"
                >
                  <input
                    type="checkbox"
                    checked={isVisible(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="accent-[color:var(--bf-brand)]"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </Dropdown>
      </div>

      {bugs.length === 0 ? (
        <p className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-10 text-center text-sm text-[color:var(--bf-ink-muted)]">
          No bugs match this filter.
        </p>
      ) : (
        <>
          {/* Cards on mobile — a 900px-min table forced into a phone-width
              viewport is unreadable no matter how it scrolls, and "bug
              review" is a named mobile priority. Same data, same selection
              state, same bulk actions bar above; just a layout that fits. */}
          <ul className="space-y-2 md:hidden">
            {bugs.map((bug) => (
              <li
                key={bug.id}
                className={cn(
                  "rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3",
                  selected.has(bug.id) && "border-[color:var(--bf-brand)]/40 bg-[color:var(--bf-brand-soft)]"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(bug.id)}
                    onChange={() => toggleRow(bug.id)}
                    className="mt-1 shrink-0 accent-[color:var(--bf-brand)]"
                    aria-label={`Select BUG-${bug.number}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-[color:var(--bf-ink-muted)]">
                      <span className="font-mono">BUG-{bug.number}</span>
                      {showGameColumn && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="h-2 w-2 shrink-0 rounded" style={{ backgroundColor: bug.game.coverColor }} />
                          {bug.game.name}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/bugs/${bug.id}`}
                      className="mt-0.5 block text-[13px] font-medium leading-snug text-[color:var(--bf-ink-primary)]"
                    >
                      {bug.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SeverityBadge severity={bug.severity} />
                      <PriorityBadge priority={bug.priority} />
                      <StatusBadge status={bug.status} />
                      {bug.isRegression && (
                        <span className="flex items-center gap-1 text-[10px] text-[color:var(--bf-status-warning)]">
                          <RotateCcw size={10} />
                          Regressed
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[color:var(--bf-ink-muted)]">
                      {bug.area?.name && <span>{bug.area.name}</span>}
                      <span className="font-mono">{bug.build.version}</span>
                      <span>{bug.assignedTo?.name ?? "Unassigned"}</span>
                      <span>{formatRelativeTime(bug.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

        <div className="hidden overflow-x-auto rounded-lg border border-[color:var(--bf-border)] md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[color:var(--bf-surface)] text-[11px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
              <tr>
                <th className="w-8 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === bugs.length}
                    onChange={toggleAll}
                    className="accent-[color:var(--bf-brand)]"
                  />
                </th>
                <th className="px-2 py-2.5 font-medium">{renderSortHeader("number", "ID")}</th>
                <th className="px-4 py-2.5 font-medium">{renderSortHeader("title", "Title")}</th>
                {showGameColumn && <th className="px-4 py-2.5 font-medium">Game</th>}
                {isVisible("severity") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("severity", "Severity")}</th>
                )}
                {isVisible("priority") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("priority", "Priority")}</th>
                )}
                {isVisible("status") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("status", "Status")}</th>
                )}
                {isVisible("area") && <th className="px-4 py-2.5 font-medium">{renderSortHeader("area", "Area")}</th>}
                {isVisible("build") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("build", "Build")}</th>
                )}
                {isVisible("reporter") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("reporter", "Reporter")}</th>
                )}
                {isVisible("assignee") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("assignee", "Assignee")}</th>
                )}
                {isVisible("updatedAt") && (
                  <th className="px-4 py-2.5 font-medium">{renderSortHeader("updatedAt", "Updated")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {bugs.map((bug) => (
                <tr
                  key={bug.id}
                  className={cn(
                    "border-t border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] hover:bg-[color:var(--bf-surface-raised)]",
                    selected.has(bug.id) && "bg-[color:var(--bf-brand-soft)]"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(bug.id)}
                      onChange={() => toggleRow(bug.id)}
                      className="accent-[color:var(--bf-brand)]"
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 font-mono text-[12px] text-[color:var(--bf-ink-muted)]">
                    BUG-{bug.number}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/bugs/${bug.id}`}
                      className="text-[color:var(--bf-ink-primary)] hover:text-[color:var(--bf-brand)] hover:underline"
                    >
                      {bug.title}
                    </Link>
                  </td>
                  {showGameColumn && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[color:var(--bf-ink-secondary)]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded"
                          style={{ backgroundColor: bug.game.coverColor }}
                        />
                        {bug.game.name}
                      </span>
                    </td>
                  )}
                  {isVisible("severity") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <SeverityBadge severity={bug.severity} />
                    </td>
                  )}
                  {isVisible("priority") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <PriorityBadge priority={bug.priority} />
                    </td>
                  )}
                  {isVisible("status") && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <StatusBadge status={bug.status} />
                        {bug.isRegression && (
                          <span
                            title="Previously fixed, reopened after regressing"
                            className="flex items-center gap-1 text-[11px] text-[color:var(--bf-status-warning)]"
                          >
                            <RotateCcw size={11} />
                            Regressed
                          </span>
                        )}
                      </span>
                    </td>
                  )}
                  {isVisible("area") && (
                    <td className="whitespace-nowrap px-4 py-3 text-[color:var(--bf-ink-muted)]">
                      {bug.area?.name ?? "—"}
                    </td>
                  )}
                  {isVisible("build") && (
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] text-[color:var(--bf-ink-muted)]">
                      {bug.build.version}
                    </td>
                  )}
                  {isVisible("reporter") && (
                    <td className="whitespace-nowrap px-4 py-3 text-[color:var(--bf-ink-muted)]">
                      {bug.reportedBy?.name ?? "—"}
                    </td>
                  )}
                  {isVisible("assignee") && (
                    <td className="whitespace-nowrap px-4 py-3 text-[color:var(--bf-ink-muted)]">
                      {bug.assignedTo?.name ?? "Unassigned"}
                    </td>
                  )}
                  {isVisible("updatedAt") && (
                    <td className="whitespace-nowrap px-4 py-3 text-[color:var(--bf-ink-muted)]">
                      {formatRelativeTime(bug.updatedAt)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
