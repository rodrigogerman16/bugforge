"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronsUpDown, Check, Gamepad2, CalendarDays, GitBranch } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { formatPlatformList } from "@/lib/platform";
import { QUALITY_BAND_META, type QualityBand } from "@/lib/quality-score";
import type { Platform } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export type GameOption = {
  id: string;
  name: string;
  slug: string;
  platforms: Platform[];
  coverColor: string;
  latestBuildId: string | null;
  latestBuildVersion: string | null;
  qualityScore: number;
  qualityBand: QualityBand;
  releaseDateLabel: string;
};

export function GameSwitcher({
  games,
  compact,
}: {
  games: GameOption[];
  compact: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("game");
  const showingAll = selectedSlug === "all";
  const selected = showingAll
    ? null
    : selectedSlug
      ? (games.find((g) => g.slug === selectedSlug) ?? games[0] ?? null)
      : (games[0] ?? null);

  function select(slug: string | null, close: () => void) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("game", slug);
    else params.delete("game");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    close();
  }

  const label = selected ? selected.name : "All Games";
  const platformsLabel = selected ? formatPlatformList(selected.platforms) : "";
  const sublabel = selected
    ? selected.latestBuildVersion
      ? `Build ${selected.latestBuildVersion}`
      : platformsLabel
    : "All projects";

  return (
    <Dropdown
      align="left"
      panelClassName="w-80"
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          title={compact ? `${label} — ${sublabel}` : undefined}
          aria-label={compact ? `${label} — ${sublabel}` : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          data-open={open}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-2 text-left hover:border-[color:var(--bf-border-strong)] data-[open=true]:border-[color:var(--bf-border-strong)]",
            compact ? "justify-center px-0" : "px-2.5"
          )}
        >
          {selected ? (
            <span
              className="h-8 w-8 shrink-0 rounded-md"
              style={{ backgroundColor: selected.coverColor }}
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--bf-page)]">
              <Gamepad2 size={15} className="text-[color:var(--bf-ink-muted)]" />
            </span>
          )}
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
                  {label}
                </span>
                <span className="block truncate text-[11px] text-[color:var(--bf-ink-muted)]">
                  {sublabel}
                </span>
              </span>
              <ChevronsUpDown size={13} className="shrink-0 text-[color:var(--bf-ink-muted)]" />
            </>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <button
            onClick={() => select("all", close)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[color:var(--bf-ink-primary)] hover:bg-[color:var(--bf-surface)]"
          >
            <Gamepad2 size={14} className="text-[color:var(--bf-ink-muted)]" />
            <span className="flex-1">All Games</span>
            {showingAll && <Check size={14} className="text-[color:var(--bf-brand)]" />}
          </button>
          <div className="my-1 border-t border-[color:var(--bf-border)]" />
          {games.map((game) => {
            const statusMeta = QUALITY_BAND_META[game.qualityBand];
            const isSelected = !showingAll && selected?.id === game.id;
            return (
              <button
                key={game.id}
                onClick={() => select(game.slug, close)}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[color:var(--bf-surface)]",
                  isSelected && "bg-[color:var(--bf-brand-soft)]"
                )}
              >
                <span
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded"
                  style={{ backgroundColor: game.coverColor }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-[color:var(--bf-ink-primary)]">
                      {game.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-[color:var(--bf-ink-muted)]">
                      {formatPlatformList(game.platforms)}
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[color:var(--bf-ink-muted)]">
                    <span className="flex items-center gap-1 font-mono">
                      <GitBranch size={10} />
                      {game.latestBuildVersion ?? "—"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: statusMeta.color }}
                      />
                      {statusMeta.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={10} />
                      {game.releaseDateLabel}
                    </span>
                  </span>
                </span>
                {isSelected && (
                  <Check size={14} className="mt-0.5 shrink-0 text-[color:var(--bf-brand)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </Dropdown>
  );
}
