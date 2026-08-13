import Link from "next/link";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getBugList, isBugSortField, BUG_PAGE_SIZE } from "@/lib/data";
import { SEVERITY_META } from "@/lib/severity";
import { PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { BugWorkflowLegend } from "@/components/bug-workflow-legend";
import { BugToolbar } from "@/components/bugs/bug-toolbar";
import { BugTable } from "@/components/bugs/bug-table";
import { BugSeverity, BugPriority, BugStatus } from "@/generated/prisma/enums";

function isBugSeverity(value: string | undefined): value is BugSeverity {
  return !!value && (Object.values(BugSeverity) as string[]).includes(value);
}
function isBugPriority(value: string | undefined): value is BugPriority {
  return !!value && (Object.values(BugPriority) as string[]).includes(value);
}
function isBugStatus(value: string | undefined): value is BugStatus {
  return !!value && (Object.values(BugStatus) as string[]).includes(value);
}

export default async function BugsPage({
  searchParams,
}: {
  searchParams: Promise<{
    game?: string;
    severity?: string;
    priority?: string;
    status?: string;
    area?: string;
    q?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const severity = isBugSeverity(params.severity) ? params.severity : undefined;
  const priority = isBugPriority(params.priority) ? params.priority : undefined;
  const status = isBugStatus(params.status) ? params.status : undefined;
  const area = params.area || undefined;
  const q = params.q || undefined;
  const sort = isBugSortField(params.sort) ? params.sort : "updatedAt";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  const { bugs, totalCount, pageCount } = await getBugList({
    gameSlug: params.game,
    severity,
    priority,
    status,
    area,
    q,
    sort,
    dir,
    page,
  });

  const showGameColumn = params.game === "all";
  const baseParams = new URLSearchParams();
  if (params.game) baseParams.set("game", params.game);
  const baseHref = `/bugs${baseParams.toString() ? `?${baseParams.toString()}` : ""}`;

  function hrefWithout(key: string) {
    const p = new URLSearchParams();
    if (params.game) p.set("game", params.game);
    if (severity && key !== "severity") p.set("severity", severity);
    if (priority && key !== "priority") p.set("priority", priority);
    if (status && key !== "status") p.set("status", status);
    if (area && key !== "area") p.set("area", area);
    if (q && key !== "q") p.set("q", q);
    return `/bugs${p.toString() ? `?${p.toString()}` : ""}`;
  }

  function hrefForPage(target: number) {
    const p = new URLSearchParams();
    if (params.game) p.set("game", params.game);
    if (severity) p.set("severity", severity);
    if (priority) p.set("priority", priority);
    if (status) p.set("status", status);
    if (area) p.set("area", area);
    if (q) p.set("q", q);
    if (sort !== "updatedAt") p.set("sort", sort);
    if (dir !== "desc") p.set("dir", dir);
    if (target > 1) p.set("page", String(target));
    return `/bugs${p.toString() ? `?${p.toString()}` : ""}`;
  }

  const activeFilters: { key: string; label: string; color?: string }[] = [];
  if (severity) activeFilters.push({ key: "severity", label: SEVERITY_META[severity].label, color: SEVERITY_META[severity].color });
  if (priority) activeFilters.push({ key: "priority", label: `${PRIORITY_META[priority].code} — ${PRIORITY_META[priority].label}`, color: PRIORITY_META[priority].color });
  if (status) activeFilters.push({ key: "status", label: BUG_STATUS_META[status].label, color: BUG_STATUS_META[status].color });
  if (area) activeFilters.push({ key: "area", label: area });
  if (q) activeFilters.push({ key: "q", label: `"${q}"` });

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * BUG_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * BUG_PAGE_SIZE, totalCount);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[color:var(--bf-ink-primary)]">Bugs</h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
          {totalCount} {totalCount === 1 ? "bug" : "bugs"}
        </p>
      </header>

      <BugWorkflowLegend />

      <BugToolbar initialQuery={q ?? ""} />

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <Link
              key={f.key}
              href={hrefWithout(f.key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-1 pl-2.5 pr-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
            >
              {f.color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />}
              {f.label}
              <X size={12} className="text-[color:var(--bf-ink-muted)]" />
            </Link>
          ))}
          <Link href={baseHref} className="text-[12px] text-[color:var(--bf-ink-muted)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--bf-ink-primary)]">
            Clear all
          </Link>
        </div>
      )}

      <BugTable bugs={bugs} sort={sort} dir={dir} showGameColumn={showGameColumn} />

      {totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between text-[12px] text-[color:var(--bf-ink-muted)]">
          <span>
            Showing {rangeStart}–{rangeEnd} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={hrefForPage(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={
                page <= 1
                  ? "pointer-events-none flex items-center gap-1 rounded-md border border-[color:var(--bf-border)] px-2 py-1 opacity-40"
                  : "flex items-center gap-1 rounded-md border border-[color:var(--bf-border)] px-2 py-1 hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
              }
            >
              <ChevronLeft size={13} />
              Prev
            </Link>
            <span className="px-2">
              Page {page} of {pageCount}
            </span>
            <Link
              href={hrefForPage(Math.min(pageCount, page + 1))}
              aria-disabled={page >= pageCount}
              className={
                page >= pageCount
                  ? "pointer-events-none flex items-center gap-1 rounded-md border border-[color:var(--bf-border)] px-2 py-1 opacity-40"
                  : "flex items-center gap-1 rounded-md border border-[color:var(--bf-border)] px-2 py-1 hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
              }
            >
              Next
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
