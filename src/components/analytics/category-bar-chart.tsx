export type CategoryBarDatum = { label: string; value: number; color?: string };

// A single-series "magnitude by category" bar chart — the value is printed
// directly at the bar's end rather than hidden behind a hover-only tooltip,
// so nothing here depends on color alone to be read. Per-row color is an
// identity the row itself already carries (a severity, a status), never an
// arbitrarily cycled hue.
export function CategoryBarChart({
  title,
  data,
  color = "var(--bf-brand)",
  valueLabel,
  emptyMessage = "No data yet for this range.",
}: {
  title: string;
  data: CategoryBarDatum[];
  color?: string;
  valueLabel?: (v: number) => string;
  emptyMessage?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const format = (v: number) => (valueLabel ? valueLabel(v) : String(v));

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{title}</p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-[color:var(--bf-ink-muted)]">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => {
            const pct = (d.value / max) * 100;
            return (
              <li key={d.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                  <span className="truncate text-[color:var(--bf-ink-secondary)]">{d.label}</span>
                  <span className="shrink-0 font-mono font-semibold text-[color:var(--bf-ink-primary)]">{format(d.value)}</span>
                </div>
                <div className="h-3.5 w-full overflow-hidden rounded bg-[color:var(--bf-page)]">
                  <div
                    className="h-full rounded"
                    style={{ width: `${d.value > 0 ? Math.max(pct, 2) : 0}%`, backgroundColor: d.color ?? color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
