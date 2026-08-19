"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 14, right: 10, bottom: 26, left: 36 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
function formatTickDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatFullDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type TrendPoint = { date: string; value: number | null };

// A single-series line/area trend, generalized from the dashboard's quality
// trend chart so every "over time" chart on /analytics shares one real,
// interactive implementation (crosshair + tooltip + keyboard nav) instead
// of a one-off per chart. Handles leading/embedded nulls (e.g. no test runs
// logged yet) by breaking the line into segments rather than drawing
// through a fabricated zero.
export function TrendChart({
  title,
  points,
  color = "var(--bf-brand)",
  unit = "",
  maxValue,
  valueLabel,
}: {
  title: string;
  points: TrendPoint[];
  color?: string;
  unit?: string;
  maxValue?: number;
  valueLabel?: (v: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = points.length;
  const dataMax = Math.max(1, ...points.map((p) => p.value ?? 0));
  const yMax = maxValue ?? Math.max(1, Math.ceil(dataMax * 1.15));

  const x = (i: number) => PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (v: number) => PAD.top + (1 - v / yMax) * PLOT_H;

  const segments = useMemo(() => {
    const segs: string[] = [];
    let current = "";
    points.forEach((p, i) => {
      if (p.value === null) {
        if (current) segs.push(current);
        current = "";
        return;
      }
      current += `${current ? "L" : "M"} ${x(i).toFixed(2)} ${y(p.value).toFixed(2)} `;
    });
    if (current) segs.push(current);
    return segs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, yMax]);

  const lastDefinedIndex = (() => {
    for (let i = points.length - 1; i >= 0; i--) if (points[i].value !== null) return i;
    return null;
  })();
  const lastDefined = lastDefinedIndex !== null ? points[lastDefinedIndex] : null;

  const tickCount = Math.min(6, n);
  const tickIndexes = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / Math.max(tickCount - 1, 1)) * (n - 1))
  );

  function updateHoverFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * WIDTH;
    const ratio = Math.min(1, Math.max(0, (relX - PAD.left) / PLOT_W));
    setHoverIndex(Math.round(ratio * (n - 1)));
  }

  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (n === 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setHoverIndex((i) => Math.min(n - 1, (i ?? -1) + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHoverIndex((i) => Math.max(0, (i ?? n) - 1));
    } else if (e.key === "Escape") {
      setHoverIndex(null);
    }
  }

  const format = (v: number) => (valueLabel ? valueLabel(v) : `${v}${unit}`);

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverLeftPct = hoverIndex !== null ? (x(hoverIndex) / WIDTH) * 100 : 0;
  const hoverTopPct = hovered && hovered.value !== null ? (y(hovered.value) / HEIGHT) * 100 : 50;
  const tooltipAbove = hoverTopPct > 28;

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{title}</p>
        {lastDefined && lastDefined.value !== null && (
          <span className="text-[12px] text-[color:var(--bf-ink-muted)]">
            Now <span className="font-semibold" style={{ color }}>{format(lastDefined.value)}</span>
          </span>
        )}
      </div>

      {n === 0 ? (
        <p className="py-10 text-center text-sm text-[color:var(--bf-ink-muted)]">No data yet for this range.</p>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full touch-none"
            tabIndex={0}
            role="img"
            aria-label={`${title} trend`}
            onPointerMove={(e) => updateHoverFromClientX(e.clientX)}
            onPointerLeave={() => setHoverIndex(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setHoverIndex(null)}
          >
            {[0, 0.5, 1].map((frac) => {
              const v = yMax * frac;
              return (
                <g key={frac}>
                  <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--bf-border)" strokeWidth={1} />
                  <text x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--bf-ink-muted)">
                    {Math.round(v)}
                  </text>
                </g>
              );
            })}

            {tickIndexes.map((i) => (
              <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--bf-ink-muted)">
                {formatTickDate(points[i].date)}
              </text>
            ))}

            {segments.map((seg, i) => (
              <motion.path
                key={i}
                d={seg}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}

            {lastDefined && lastDefinedIndex !== null && lastDefined.value !== null && (
              <motion.circle
                cx={x(lastDefinedIndex)}
                cy={y(lastDefined.value)}
                r={4}
                fill={color}
                stroke="var(--bf-surface)"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.55 }}
              />
            )}

            {hovered && hovered.value !== null && hoverIndex !== null && (
              <>
                <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--bf-border-strong)" strokeWidth={1} />
                <circle cx={x(hoverIndex)} cy={y(hovered.value)} r={4} fill={color} stroke="var(--bf-surface)" strokeWidth={2} />
              </>
            )}
          </svg>

          {hovered && (
            <div
              className={cn(
                "pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-md border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] px-2.5 py-1.5 shadow-lg shadow-black/30",
                tooltipAbove ? "-translate-y-[calc(100%+10px)]" : "translate-y-[10px]"
              )}
              style={{ left: `${Math.min(94, Math.max(6, hoverLeftPct))}%`, top: `${hoverTopPct}%` }}
            >
              <p className="text-[11px] text-[color:var(--bf-ink-muted)]">{formatFullDate(hovered.date)}</p>
              <p className="text-sm font-semibold" style={{ color }}>
                {hovered.value !== null ? format(hovered.value) : "No data"}
              </p>
            </div>
          )}
        </div>
      )}

      {n > 0 && (
        <>
          <button
            onClick={() => setShowTable((s) => !s)}
            className="mt-2 text-[11px] text-[color:var(--bf-ink-muted)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--bf-ink-primary)]"
          >
            {showTable ? "Hide" : "View"} as table
          </button>
          {showTable && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[color:var(--bf-border)]">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-[color:var(--bf-surface-raised)] text-[color:var(--bf-ink-muted)]">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Date</th>
                    <th className="px-3 py-1.5 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.date} className="border-t border-[color:var(--bf-border)]">
                      <td className="px-3 py-1 text-[color:var(--bf-ink-secondary)]">{formatFullDate(p.date)}</td>
                      <td className="px-3 py-1 font-mono tabular-nums text-[color:var(--bf-ink-primary)]">
                        {p.value !== null ? format(p.value) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
