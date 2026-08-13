"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TREND_RANGE_DAYS, type TrendRangeDays } from "@/lib/trend-range";
import { cn } from "@/lib/utils";

export function TrendRangeToggle({ active }: { active: TrendRangeDays }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(days: TrendRangeDays) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", String(days));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex shrink-0 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-0.5">
      {TREND_RANGE_DAYS.map((days) => (
        <button
          key={days}
          onClick={() => select(days)}
          aria-pressed={days === active}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium",
            days === active
              ? "bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-brand)]"
              : "text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
          )}
        >
          {days} days
        </button>
      ))}
    </div>
  );
}
