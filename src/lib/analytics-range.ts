export const ANALYTICS_RANGE_PRESETS = [7, 30, 90] as const;
export type AnalyticsRangePreset = (typeof ANALYTICS_RANGE_PRESETS)[number];
export type AnalyticsRangeSelection = AnalyticsRangePreset | "custom";

export type AnalyticsRange = { from: Date; to: Date; selection: AnalyticsRangeSelection };

const DAY_MS = 86_400_000;

function isPreset(value: number): value is AnalyticsRangePreset {
  return (ANALYTICS_RANGE_PRESETS as readonly number[]).includes(value);
}

// Resolves the ?range=&from=&to= search params into a concrete date window.
// A malformed or incomplete custom range falls back to the 30-day preset
// rather than silently showing an empty or unbounded chart.
export function resolveAnalyticsRange(params: { range?: string; from?: string; to?: string }): AnalyticsRange {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (params.range === "custom" && params.from && params.to) {
    const from = new Date(`${params.from}T00:00:00`);
    const to = new Date(`${params.to}T23:59:59.999`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from.getTime() <= to.getTime()) {
      return { from, to, selection: "custom" };
    }
  }

  const parsed = Number(params.range);
  const days = isPreset(parsed) ? parsed : 30;
  const from = new Date(endOfToday.getTime() - (days - 1) * DAY_MS);
  from.setHours(0, 0, 0, 0);
  return { from, to: endOfToday, selection: days };
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
