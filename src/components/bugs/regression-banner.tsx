import Link from "next/link";
import { AlertTriangle } from "lucide-react";

function BuildField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{label}</p>
      <p className="mt-0.5 font-mono text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">{value}</p>
    </div>
  );
}

export function RegressionBanner({
  originalBugId,
  originalBugNumber,
  previouslyFixedBuild,
  verifiedBuild,
  reproducedBuild,
}: {
  originalBugId: string;
  originalBugNumber: number;
  previouslyFixedBuild: string;
  verifiedBuild: string | null;
  reproducedBuild: string;
}) {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-lg border-2 px-4 py-3"
      style={{
        borderColor: "var(--bf-status-critical)",
        backgroundColor: "color-mix(in srgb, var(--bf-status-critical) 12%, transparent)",
      }}
    >
      <AlertTriangle size={22} className="mt-0.5 shrink-0" style={{ color: "var(--bf-status-critical)" }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--bf-status-critical)" }}>
          ⚠ Regression
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          <BuildField label="Originally fixed" value={previouslyFixedBuild} />
          {verifiedBuild && <BuildField label="Verified" value={verifiedBuild} />}
          <BuildField label="Regression" value={reproducedBuild} />
        </div>
        <Link
          href={`/bugs/${originalBugId}`}
          className="mt-2.5 inline-block text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)] hover:underline"
        >
          View original report — BUG-{originalBugNumber}
        </Link>
      </div>
    </div>
  );
}
