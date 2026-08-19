import type { Metadata } from "next";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getBugList, getBugFilterOptions, isBugSortField, BUG_PAGE_SIZE, getCurrentUser } from "@/lib/db";
import { hasCapability } from "@/lib/auth/permissions";
import { SEVERITY_META } from "@/lib/severity";
import { PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { PLATFORM_LABEL } from "@/lib/platform";
import { BugWorkflowLegend } from "@/components/bugs/bug-workflow-legend";
import { BugToolbar } from "@/components/bugs/bug-toolbar";
import { BugTable } from "@/components/bugs/bug-table";
import { ReportBugButton } from "@/components/bugs/report-bug-button";
import { ExportLinks } from "@/components/ui/export-links";
import { BugSeverity, BugPriority, BugStatus, Platform } from "@/generated/prisma/enums";

function isBugSeverity(value: string | undefined): value is BugSeverity {
  return !!value && (Object.values(BugSeverity) as string[]).includes(value);
}
function isBugPriority(value: string | undefined): value is BugPriority {
  return !!value && (Object.values(BugPriority) as string[]).includes(value);
}
function isBugStatus(value: string | undefined): value is BugStatus {
  return !!value && (Object.values(BugStatus) as string[]).includes(value);
}
function isPlatform(value: string | undefined): value is Platform {
  return !!value && (Object.values(Platform) as string[]).includes(value);
}

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export const metadata: Metadata = { title: "Bugs — BugForge" };

export default async function BugsPage({
  searchParams,
}: {
  searchParams: Promise<{
    game?: string;
    severity?: string;
    priority?: string;
    status?: string;
    area?: string;
    build?: string;
    platform?: string;
    reporter?: string;
    assignee?: string;
    dateFrom?: string;
    dateTo?: string;
    tag?: string;
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
  const areaId = params.area || undefined;
  const build = params.build || undefined;
  const platform = isPlatform(params.platform) ? params.platform : undefined;
  const reporterId = params.reporter || undefined;
  const assigneeId = params.assignee || undefined;
  const tagId = params.tag || undefined;
  const dateFrom = params.dateFrom ? new Date(`${params.dateFrom}T00:00:00`) : undefined;
  const dateTo = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999`) : undefined;
  const q = params.q || undefined;
  const sort = isBugSortField(params.sort) ? params.sort : "updatedAt";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  const [{ bugs, totalCount, pageCount }, filterOptions, currentUser] = await Promise.all([
    getBugList({
      gameSlug: params.game,
      severity,
      priority,
      status,
      areaId,
      build,
      platform,
      reporterId,
      assigneeId,
      dateFrom,
      dateTo,
      tagId,
      q,
      sort,
      dir,
      page,
    }),
    getBugFilterOptions(params.game),
    getCurrentUser(),
  ]);
  const canCreateBug = hasCapability(currentUser.role, "CREATE_BUG");

  const showGameColumn = params.game === "all";

  function buildHref(overrides: Record<string, string | undefined> = {}) {
    const merged: Record<string, string | undefined> = {
      game: params.game,
      severity,
      priority,
      status,
      area: areaId,
      build,
      platform,
      reporter: reporterId,
      assignee: assigneeId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      tag: tagId,
      q,
      sort: sort !== "updatedAt" ? sort : undefined,
      dir: dir !== "desc" ? dir : undefined,
      ...overrides,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/bugs${p.toString() ? `?${p.toString()}` : ""}`;
  }

  const baseParams = new URLSearchParams();
  if (params.game) baseParams.set("game", params.game);
  const baseHref = `/bugs${baseParams.toString() ? `?${baseParams.toString()}` : ""}`;

  const activeFilters: { key: string; label: string; color?: string }[] = [];
  if (severity) activeFilters.push({ key: "severity", label: SEVERITY_META[severity].label, color: SEVERITY_META[severity].color });
  if (priority) activeFilters.push({ key: "priority", label: `${PRIORITY_META[priority].code} — ${PRIORITY_META[priority].label}`, color: PRIORITY_META[priority].color });
  if (status) activeFilters.push({ key: "status", label: BUG_STATUS_META[status].label, color: BUG_STATUS_META[status].color });
  if (areaId) {
    const area = filterOptions.areas.find((a) => a.id === areaId);
    activeFilters.push({ key: "area", label: area?.name ?? "…" });
  }
  if (build) activeFilters.push({ key: "build", label: build });
  if (platform) activeFilters.push({ key: "platform", label: PLATFORM_LABEL[platform] });
  if (reporterId) {
    const tester = filterOptions.testers.find((t) => t.id === reporterId);
    activeFilters.push({ key: "reporter", label: `Reported by ${tester?.name ?? "…"}` });
  }
  if (assigneeId) {
    const label = assigneeId === "unassigned" ? "Unassigned" : filterOptions.testers.find((t) => t.id === assigneeId)?.name;
    activeFilters.push({ key: "assignee", label: `Assigned to ${label ?? "…"}` });
  }
  if (tagId) {
    const tag = filterOptions.tags.find((t) => t.id === tagId);
    if (tag) activeFilters.push({ key: "tag", label: tag.name, color: tag.color });
  }
  if (dateFrom || dateTo) {
    const label = dateFrom && dateTo
      ? `${dateLabelFormatter.format(dateFrom)} – ${dateLabelFormatter.format(dateTo)}`
      : dateFrom
        ? `After ${dateLabelFormatter.format(dateFrom)}`
        : `Before ${dateLabelFormatter.format(dateTo!)}`;
    activeFilters.push({ key: "date", label });
  }
  if (q) activeFilters.push({ key: "q", label: `"${q}"` });

  function hrefWithout(key: string) {
    if (key === "date") return buildHref({ dateFrom: undefined, dateTo: undefined });
    return buildHref({ [key]: undefined });
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * BUG_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * BUG_PAGE_SIZE, totalCount);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--bf-ink-primary)]">Bugs</h1>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
            {totalCount} {totalCount === 1 ? "bug" : "bugs"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportLinks
            base="/api/export/bugs"
            params={{
              game: params.game,
              severity,
              priority,
              status,
              area: areaId,
              build,
              platform,
              reporter: reporterId,
              assignee: assigneeId,
              dateFrom: params.dateFrom,
              dateTo: params.dateTo,
              tag: tagId,
              q,
              sort,
              dir,
            }}
          />
          {canCreateBug && <ReportBugButton gameSlug={params.game} />}
        </div>
      </header>

      <BugWorkflowLegend />

      <BugToolbar
        initialQuery={q ?? ""}
        builds={filterOptions.builds}
        platforms={filterOptions.platforms}
        testers={filterOptions.testers}
        tags={filterOptions.tags}
        areas={filterOptions.areas}
        activeFilterCount={activeFilters.length - (q ? 1 : 0)}
      />

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
              href={buildHref({ page: page - 1 > 1 ? String(page - 1) : undefined })}
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
              href={buildHref({ page: page + 1 > 1 ? String(Math.min(pageCount, page + 1)) : undefined })}
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
