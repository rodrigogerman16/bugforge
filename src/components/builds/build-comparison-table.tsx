import { ArrowDown, ArrowRight, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import type { BuildSummary } from "@/lib/data";
import { cn } from "@/lib/utils";

type Metric = {
  label: string;
  valueA: number | null;
  valueB: number | null;
  format: (v: number) => string;
  unit: string;
  higherIsBetter: boolean;
};

function DeltaCell({ value, unit, higherIsBetter }: { value: number | null; unit: string; higherIsBetter: boolean }) {
  if (value === null) {
    return <span className="text-[color:var(--bf-ink-muted)]">—</span>;
  }
  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-[color:var(--bf-ink-muted)]">
        <ArrowRight size={12} />
        No change
      </span>
    );
  }
  const isGood = higherIsBetter ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  const color = isGood ? "var(--bf-status-good)" : "var(--bf-status-critical)";
  return (
    <span className="flex items-center gap-1 font-medium" style={{ color }}>
      <Icon size={12} />
      {value > 0 ? "+" : ""}
      {value}
      {unit}
    </span>
  );
}

export function BuildComparisonTable({ buildA, buildB }: { buildA: BuildSummary; buildB: BuildSummary }) {
  const metrics: Metric[] = [
    {
      label: "Critical",
      valueA: buildA.criticalOpenCount,
      valueB: buildB.criticalOpenCount,
      format: (v) => String(v),
      unit: "",
      higherIsBetter: false,
    },
    {
      label: "High",
      valueA: buildA.highOpenCount,
      valueB: buildB.highOpenCount,
      format: (v) => String(v),
      unit: "",
      higherIsBetter: false,
    },
    {
      label: "Test Pass",
      valueA: buildA.testPassRate,
      valueB: buildB.testPassRate,
      format: (v) => `${v}%`,
      unit: "%",
      higherIsBetter: true,
    },
    {
      label: "Regressions",
      valueA: buildA.regressionCount,
      valueB: buildB.regressionCount,
      format: (v) => String(v),
      unit: "",
      higherIsBetter: false,
    },
  ];

  const scoreDelta = buildB.qualityScore - buildA.qualityScore;
  const verdict = scoreDelta > 0 ? "improved" : scoreDelta < 0 ? "declined" : "unchanged";
  const VerdictIcon = verdict === "improved" ? TrendingUp : verdict === "declined" ? TrendingDown : ArrowRight;
  const verdictColor =
    verdict === "improved"
      ? "var(--bf-status-good)"
      : verdict === "declined"
        ? "var(--bf-status-critical)"
        : "var(--bf-ink-muted)";

  return (
    <div>
      <div
        className="mb-6 flex items-center gap-3 rounded-lg border-2 px-4 py-3"
        style={{
          borderColor: verdictColor,
          backgroundColor: `color-mix(in srgb, ${verdictColor} 10%, transparent)`,
        }}
      >
        <VerdictIcon size={22} className="shrink-0" style={{ color: verdictColor }} />
        <div>
          <p className="text-sm font-bold tracking-wide uppercase" style={{ color: verdictColor }}>
            Quality {verdict}
          </p>
          <p className="text-[13px] text-[color:var(--bf-ink-secondary)]">
            Quality score {buildA.qualityScore} → {buildB.qualityScore} ({scoreDelta > 0 ? "+" : ""}
            {scoreDelta}) from {buildA.version} to {buildB.version}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--bf-border)] bg-[color:var(--bf-surface)]">
              <th className="px-4 py-3 text-left font-medium text-[color:var(--bf-ink-muted)]"></th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[color:var(--bf-ink-primary)]">
                {buildA.version}
              </th>
              <th className="px-4 py-3 text-left font-mono font-semibold text-[color:var(--bf-ink-primary)]">
                {buildB.version}
              </th>
              <th className="px-4 py-3 text-left font-medium text-[color:var(--bf-ink-muted)]">Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, i) => {
              const delta =
                metric.valueA !== null && metric.valueB !== null
                  ? Math.round((metric.valueB - metric.valueA) * 10) / 10
                  : null;
              return (
                <tr
                  key={metric.label}
                  className={cn(i !== metrics.length - 1 && "border-b border-[color:var(--bf-border)]")}
                >
                  <td className="px-4 py-3 font-medium text-[color:var(--bf-ink-secondary)]">{metric.label}</td>
                  <td className="px-4 py-3 text-[color:var(--bf-ink-primary)]">
                    {metric.valueA === null ? "—" : metric.format(metric.valueA)}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--bf-ink-primary)]">
                    {metric.valueB === null ? "—" : metric.format(metric.valueB)}
                  </td>
                  <td className="px-4 py-3">
                    <DeltaCell value={delta} unit={metric.unit} higherIsBetter={metric.higherIsBetter} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
