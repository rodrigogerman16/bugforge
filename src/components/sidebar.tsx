"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_GROUPS, NAV_FOOTER_ITEMS, type NavItem } from "@/lib/nav-items";
import { useShellUI } from "@/components/shell-ui-provider";
import { Brand } from "@/components/brand";
import { GameSwitcher, type GameOption } from "@/components/game-switcher";
import { cn } from "@/lib/utils";

function NavLink({
  item,
  compact,
  onNavigate,
}: {
  item: NavItem;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const Icon = item.icon;
  const isActive = item.enabled && item.href === pathname;
  const gameParam = searchParams.get("game");
  const href = gameParam ? `${item.href}?game=${gameParam}` : item.href;

  if (!item.enabled) {
    return (
      <span
        title={compact ? `${item.label} — Coming soon` : "Coming soon"}
        className={cn(
          "flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-[color:var(--bf-ink-muted)]/50",
          compact && "justify-center px-0"
        )}
      >
        <Icon size={16} strokeWidth={1.75} />
        {!compact && item.label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium",
        compact && "justify-center px-0",
        isActive
          ? "bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-ink-primary)]"
          : "text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)]"
      )}
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        className={isActive ? "text-[color:var(--bf-brand)]" : undefined}
      />
      {!compact && item.label}
    </Link>
  );
}

function NavGroups({
  compact,
  onNavigate,
}: {
  compact: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group, i) => (
        <div
          key={group.label}
          className={cn(i > 0 && (compact ? "mt-2 border-t border-[color:var(--bf-border)] pt-2" : "mt-4"))}
        >
          {!compact && (
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
              {group.label}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.label} item={item} compact={compact} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function Sidebar({ games }: { games: GameOption[] }) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellUI();

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-[color:var(--bf-border)] bg-[color:var(--bf-page)] py-4 transition-[width] duration-150 md:flex",
        sidebarCollapsed ? "w-16 px-2" : "w-60 px-3"
      )}
    >
      <div className="mb-1 shrink-0">
        <GameSwitcher games={games} compact={sidebarCollapsed} />
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto pt-2">
        <NavGroups compact={sidebarCollapsed} />
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-[color:var(--bf-border)] pt-2">
        {!sidebarCollapsed && (
          <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
            System
          </p>
        )}
        {NAV_FOOTER_ITEMS.map((item) => (
          <NavLink key={item.label} item={item} compact={sidebarCollapsed} />
        ))}
        <button
          onClick={toggleSidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)]",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.75} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.75} />
          )}
          {!sidebarCollapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({
  open,
  onClose,
  games,
}: {
  open: boolean;
  onClose: () => void;
  games: GameOption[];
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-3 py-4 shadow-lg transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-2 pb-4">
          <Brand />
        </div>
        <div className="mb-1 shrink-0">
          <GameSwitcher games={games} compact={false} />
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto pt-2">
          <NavGroups compact={false} onNavigate={onClose} />
        </nav>
        <div className="flex flex-col gap-0.5 border-t border-[color:var(--bf-border)] pt-2">
          <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]/70">
            System
          </p>
          {NAV_FOOTER_ITEMS.map((item) => (
            <NavLink key={item.label} item={item} compact={false} onNavigate={onClose} />
          ))}
        </div>
      </aside>
    </div>
  );
}
