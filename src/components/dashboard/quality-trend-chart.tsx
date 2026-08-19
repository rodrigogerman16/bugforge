"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { QUALITY_BAND_META, qualityBand } from "@/lib/quality-score";
import type { QualityTrendPoint } from "@/lib/db";
import { cn } from "@/lib/utils";

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 30 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function formatTickDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function QualityTrendChart({ points }: { points: QualityTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = points.length;
  const x = (i: number) => PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (score: number) => PAD.top + (1 - score / 100) * PLOT_H;

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p.score).toFixed(2)}`)
        .join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points]
  );
  const areaPath = useMemo(() => {
    if (n === 0) return "";
    return `${linePath} L ${x(n - 1).toFixed(2)} ${y(0).toFixed(2)} L ${x(0).toFixed(2)} ${y(0).toFixed(2)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, n]);

  const latest = n > 0 ? points[n - 1] : null;
  const latestBand = latest ? QUALITY_BAND_META[qualityBand(latest.score)] : null;

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

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredBand = hovered ? QUALITY_BAND_META[qualityBand(hovered.score)] : null;
  const hoverLeftPct = hoverIndex !== null ? (x(hoverIndex) / WIDTH) * 100 : 0;
  const hoverTopPct = hovered ? (y(hovered.score) / HEIGHT) * 100 : 0;
  const tooltipAbove = hoverTopPct > 28;

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
          Quality score over time
        </p>
        {latest && latestBand && (
          <span className="flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)]">
            Now
            <span className="font-semibold" style={{ color: latestBand.color }}>
              {latest.score}
            </span>
          </span>
        )}
      </div>

      {n === 0 ? (
        <p className="py-10 text-center text-sm text-[color:var(--bf-ink-muted)]">
          Not enough data yet for this range.
        </p>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full touch-none"
            tabIndex={0}
            role="img"
            aria-label={`Quality score trend, currently ${latest!.score} out of 100, ${latestBand!.label}`}
            onPointerMove={(e) => updateHoverFromClientX(e.clientX)}
            onPointerLeave={() => setHoverIndex(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setHoverIndex(null)}
          >
            <rect
              x={PAD.left}
              y={y(100)}
              width={PLOT_W}
              height={y(75) - y(100)}
              fill="var(--bf-status-good)"
              opacity={0.07}
            />
            <rect
              x={PAD.left}
              y={y(75)}
              width={PLOT_W}
              height={y(45) - y(75)}
              fill="var(--bf-status-warning)"
              opacity={0.07}
            />
            <rect
              x={PAD.left}
              y={y(45)}
              width={PLOT_W}
              height={y(0) - y(45)}
              fill="var(--bf-status-critical)"
              opacity={0.07}
            />

            {[0, 45, 75, 100].map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--bf-border)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={y(v)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--bf-ink-muted)"
                >
                  {v}
                </text>
              </g>
            ))}

            {tickIndexes.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--bf-ink-muted)"
              >
                {formatTickDate(points[i].date)}
              </text>
            ))}

            <motion.path
              d={areaPath}
              fill="var(--bf-brand)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.08 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke="var(--bf-brand)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />

            {latest && latestBand && (
              <motion.circle
                cx={x(n - 1)}
                cy={y(latest.score)}
                r={4}
                fill={latestBand.color}
                stroke="var(--bf-surface)"
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.55 }}
              />
            )}

            {hovered && hoveredBand && (
              <>
                <line
                  x1={x(hoverIndex!)}
                  x2={x(hoverIndex!)}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  stroke="var(--bf-border-strong)"
                  strokeWidth={1}
                />
                <circle
                  cx={x(hoverIndex!)}
                  cy={y(hovered.score)}
                  r={4}
                  fill={hoveredBand.color}
                  stroke="var(--bf-surface)"
                  strokeWidth={2}
                />
              </>
            )}
          </svg>

          {hovered && hoveredBand && (
            <div
              className={cn(
                "pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-md border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] px-2.5 py-1.5 shadow-lg shadow-black/30",
                tooltipAbove ? "-translate-y-[calc(100%+10px)]" : "translate-y-[10px]"
              )}
              style={{
                left: `${Math.min(94, Math.max(6, hoverLeftPct))}%`,
                top: `${hoverTopPct}%`,
              }}
            >
              <p className="text-[11px] text-[color:var(--bf-ink-muted)]">
                {formatFullDate(hovered.date)}
              </p>
              <p className="text-sm font-semibold" style={{ color: hoveredBand.color }}>
                {hovered.score}
                <span className="font-normal text-[color:var(--bf-ink-muted)]"> / 100</span>
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
                    <th className="px-3 py-1.5 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.date} className="border-t border-[color:var(--bf-border)]">
                      <td className="px-3 py-1 text-[color:var(--bf-ink-secondary)]">
                        {formatFullDate(p.date)}
                      </td>
                      <td className="px-3 py-1 font-mono tabular-nums text-[color:var(--bf-ink-primary)]">
                        {p.score}
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
