import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  valueColor,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: accent ? `${accent}1f` : "var(--bf-brand-soft)" }}
      >
        <Icon size={16} strokeWidth={2} style={{ color: accent ?? "var(--bf-brand)" }} />
      </div>
      <div>
        <p
          className="text-lg font-semibold leading-none tabular-nums"
          style={{ color: valueColor ?? "var(--bf-ink-primary)" }}
        >
          {value}
        </p>
        <p className="mt-1.5 text-[12px] leading-none text-[color:var(--bf-ink-muted)]">
          {label}
        </p>
      </div>
    </div>
  );
}
