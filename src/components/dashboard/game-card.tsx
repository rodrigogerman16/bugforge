import { GitBranch, Radio } from "lucide-react";
import type { GameSummary } from "@/lib/db";
import { formatPlatformList } from "@/lib/platform";
import { SeverityMeter } from "@/components/dashboard/severity-meter";

export function GameCard({ game }: { game: GameSummary }) {
  const isActive = game.activeSession?.status === "ACTIVE";

  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5 transition-colors hover:border-[color:var(--bf-border-strong)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black"
            style={{ backgroundColor: game.coverColor }}
          >
            {game.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--bf-ink-primary)]">
              {game.name}
            </p>
            <p className="text-[12px] text-[color:var(--bf-ink-muted)]">
              {formatPlatformList(game.platforms)}
            </p>
          </div>
        </div>

        {game.activeSession && (
          <span
            className="flex items-center gap-1 rounded-full border border-[color:var(--bf-border)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--bf-ink-secondary)]"
          >
            <Radio
              size={10}
              className={isActive ? "text-[color:var(--bf-status-good)]" : "text-[color:var(--bf-ink-muted)]"}
            />
            {game.activeSession.name}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[12px] text-[color:var(--bf-ink-muted)]">
        {game.latestBuild && (
          <span className="flex items-center gap-1.5">
            <GitBranch size={12} />
            <span className="font-mono text-[color:var(--bf-ink-secondary)]">
              {game.latestBuild.version}
            </span>
          </span>
        )}
        <span>
          <span className="font-semibold text-[color:var(--bf-ink-primary)]">{game.bugTotal}</span>{" "}
          bugs tracked
        </span>
        <span>
          <span className="font-semibold text-[color:var(--bf-ink-primary)]">{game.openBugTotal}</span>{" "}
          open
        </span>
      </div>

      <div className="mt-4 border-t border-[color:var(--bf-border)] pt-4">
        <SeverityMeter
          counts={game.severityCounts}
          filterHref={(sev) => `/bugs?game=${game.slug}&severity=${sev}`}
        />
      </div>
    </div>
  );
}
