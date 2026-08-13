import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function RegressionBanner({
  originalBugId,
  originalBugNumber,
  previouslyFixedBuild,
  reproducedBuild,
}: {
  originalBugId: string;
  originalBugNumber: number;
  previouslyFixedBuild: string;
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
      <div>
        <p className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--bf-status-critical)" }}>
          ⚠ Regression
        </p>
        <p className="mt-1 text-[13px] text-[color:var(--bf-ink-secondary)]">
          Previously fixed in Build {previouslyFixedBuild}
          <br />
          Reproduced in Build {reproducedBuild}
        </p>
        <Link
          href={`/bugs/${originalBugId}`}
          className="mt-1.5 inline-block text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)] hover:underline"
        >
          View original report — BUG-{originalBugNumber}
        </Link>
      </div>
    </div>
  );
}
