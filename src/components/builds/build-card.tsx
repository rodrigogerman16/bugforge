import Link from "next/link";
import { AlertTriangle, Bug as BugIcon, CheckCircle2 } from "lucide-react";
import { formatPlatformList } from "@/lib/platform";
import { QUALITY_BAND_META } from "@/lib/quality-score";
import { BuildStatusControl } from "@/components/builds/build-status-control";
import { BuildRiskPanel } from "@/components/ai/build-risk-panel";
import type { BuildSummary } from "@/lib/data";

const releasedFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function BuildCard({ build }: { build: BuildSummary }) {
  const bandMeta = QUALITY_BAND_META[build.qualityBand];

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: build.game.coverColor }} />
            {build.game.name}
          </div>
          <p className="mt-0.5 font-mono text-base font-bold text-[color:var(--bf-ink-primary)]">{build.version}</p>
          <p className="text-[12px] text-[color:var(--bf-ink-muted)]">{formatPlatformList(build.game.platforms)}</p>
          <p className="text-[12px] text-[color:var(--bf-ink-muted)]">
            Released {releasedFormatter.format(build.releasedAt)}
          </p>
        </div>
        <BuildStatusControl buildId={build.id} status={build.status} />
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold tracking-wide text-[color:var(--bf-ink-muted)] uppercase">
          QA Status
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold" style={{ color: bandMeta.color }}>
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: bandMeta.color }} />
          {bandMeta.label}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[color:var(--bf-border)] pt-3 text-[12px] text-[color:var(--bf-ink-secondary)]">
        <Link
          href={`/bugs?game=${build.game.slug}&build=${encodeURIComponent(build.version)}`}
          className="flex items-center gap-1 hover:text-[color:var(--bf-brand)]"
        >
          <BugIcon size={12} />
          {build.bugTotal} bugs
        </Link>
        <span className="flex items-center gap-1" style={{ color: build.criticalOpenCount > 0 ? "var(--bf-status-critical)" : undefined }}>
          <AlertTriangle size={12} />
          {build.criticalOpenCount} critical
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} />
          {build.testPassRate === null ? "No test runs" : `${build.testPassRate}% test pass rate`}
        </span>
      </div>

      <BuildRiskPanel buildId={build.id} />
    </div>
  );
}
