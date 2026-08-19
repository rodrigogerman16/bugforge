"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META, BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";
import { PLATFORM_LABEL } from "@/lib/platform";
import type { Platform } from "@/generated/prisma/enums";

const STATUS_OPTIONS = [...BUG_WORKFLOW_MAIN, ...BUG_WORKFLOW_EXITS];

const selectClass =
  "w-full rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2.5 py-1.5 text-sm text-[color:var(--bf-ink-secondary)] outline-none hover:border-[color:var(--bf-border-strong)] focus:border-[color:var(--bf-border-strong)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[color:var(--bf-ink-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function BugToolbar({
  initialQuery,
  builds,
  platforms,
  testers,
  tags,
  areas,
  activeFilterCount,
}: {
  initialQuery: string;
  builds: string[];
  platforms: Platform[];
  testers: { id: string; name: string }[];
  tags: { id: string; name: string; color: string }[];
  areas: { id: string; name: string }[];
  activeFilterCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--bf-ink-muted)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bugs..."
          className="w-56 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-1.5 pl-8 pr-3 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] hover:border-[color:var(--bf-border-strong)] focus:border-[color:var(--bf-border-strong)]"
        />
      </div>

      <Dropdown
        align="left"
        panelClassName="w-[560px]"
        trigger={({ toggle, open }) => (
          <button
            onClick={toggle}
            data-open={open}
            aria-haspopup="true"
            aria-expanded={open}
            className="flex items-center gap-1.5 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2.5 py-1.5 text-sm text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] data-[open=true]:border-[color:var(--bf-border-strong)]"
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--bf-brand-soft)] px-1 text-[10px] font-semibold text-[color:var(--bf-brand)]">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      >
        {() => (
          <div className="grid grid-cols-2 gap-3 p-3">
            <Field label="Severity">
              <select
                value={searchParams.get("severity") ?? ""}
                onChange={(e) => setParam("severity", e.target.value)}
                className={selectClass}
              >
                <option value="">All severities</option>
                {SEVERITY_ORDER.map((sev) => (
                  <option key={sev} value={sev}>
                    {SEVERITY_META[sev].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={searchParams.get("priority") ?? ""}
                onChange={(e) => setParam("priority", e.target.value)}
                className={selectClass}
              >
                <option value="">All priorities</option>
                {PRIORITY_ORDER.map((pri) => (
                  <option key={pri} value={pri}>
                    {PRIORITY_META[pri].code} — {PRIORITY_META[pri].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={searchParams.get("status") ?? ""}
                onChange={(e) => setParam("status", e.target.value)}
                className={selectClass}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {BUG_STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Area">
              <select
                value={searchParams.get("area") ?? ""}
                onChange={(e) => setParam("area", e.target.value)}
                className={selectClass}
              >
                <option value="">All areas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Build">
              <select
                value={searchParams.get("build") ?? ""}
                onChange={(e) => setParam("build", e.target.value)}
                className={selectClass}
              >
                <option value="">All builds</option>
                {builds.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Platform">
              <select
                value={searchParams.get("platform") ?? ""}
                onChange={(e) => setParam("platform", e.target.value)}
                className={selectClass}
              >
                <option value="">All platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reporter">
              <select
                value={searchParams.get("reporter") ?? ""}
                onChange={(e) => setParam("reporter", e.target.value)}
                className={selectClass}
              >
                <option value="">Anyone</option>
                {testers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignee">
              <select
                value={searchParams.get("assignee") ?? ""}
                onChange={(e) => setParam("assignee", e.target.value)}
                className={selectClass}
              >
                <option value="">Anyone</option>
                <option value="unassigned">Unassigned</option>
                {testers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reported after">
              <input
                type="date"
                value={searchParams.get("dateFrom") ?? ""}
                onChange={(e) => setParam("dateFrom", e.target.value)}
                className={selectClass}
              />
            </Field>

            <Field label="Reported before">
              <input
                type="date"
                value={searchParams.get("dateTo") ?? ""}
                onChange={(e) => setParam("dateTo", e.target.value)}
                className={selectClass}
              />
            </Field>

            <Field label="Tag">
              <select
                value={searchParams.get("tag") ?? ""}
                onChange={(e) => setParam("tag", e.target.value)}
                className={selectClass}
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Dropdown>
    </div>
  );
}
