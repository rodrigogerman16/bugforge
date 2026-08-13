"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META, BUG_WORKFLOW_MAIN, BUG_WORKFLOW_EXITS } from "@/lib/status-labels";
import { AREAS } from "@/lib/areas";

const STATUS_OPTIONS = [...BUG_WORKFLOW_MAIN, ...BUG_WORKFLOW_EXITS];

const selectClass =
  "rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2.5 py-1.5 text-sm text-[color:var(--bf-ink-secondary)] outline-none hover:border-[color:var(--bf-border-strong)] focus:border-[color:var(--bf-border-strong)]";

export function BugToolbar({ initialQuery }: { initialQuery: string }) {
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

      <select
        value={searchParams.get("area") ?? ""}
        onChange={(e) => setParam("area", e.target.value)}
        className={selectClass}
      >
        <option value="">All areas</option>
        {AREAS.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
    </div>
  );
}
