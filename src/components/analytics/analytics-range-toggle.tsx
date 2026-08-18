"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ANALYTICS_RANGE_PRESETS, formatDateInput, type AnalyticsRangeSelection } from "@/lib/analytics-range";
import { cn } from "@/lib/utils";

export function AnalyticsRangeToggle({
  selection,
  from,
  to,
}: {
  selection: AnalyticsRangeSelection;
  from: Date;
  to: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(selection === "custom");
  const [customFrom, setCustomFrom] = useState(formatDateInput(from));
  const [customTo, setCustomTo] = useState(formatDateInput(to));

  function selectPreset(days: (typeof ANALYTICS_RANGE_PRESETS)[number]) {
    setCustomOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", String(days));
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex shrink-0 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-0.5">
        {ANALYTICS_RANGE_PRESETS.map((days) => (
          <button
            key={days}
            onClick={() => selectPreset(days)}
            aria-pressed={selection === days}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] font-medium",
              selection === days
                ? "bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-brand)]"
                : "text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
            )}
          >
            {days} days
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          aria-pressed={selection === "custom"}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium",
            selection === "custom"
              ? "bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-brand)]"
              : "text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
          )}
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            max={customTo}
            className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1 text-[12px] text-[color:var(--bf-ink-primary)] outline-none focus:border-[color:var(--bf-border-strong)]"
          />
          <span className="text-[12px] text-[color:var(--bf-ink-muted)]">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            min={customFrom}
            className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1 text-[12px] text-[color:var(--bf-ink-primary)] outline-none focus:border-[color:var(--bf-border-strong)]"
          />
          <button
            onClick={applyCustom}
            className="rounded-md bg-[color:var(--bf-brand)] px-2.5 py-1 text-[12px] font-medium text-black hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
