"use client";

import { Menu, Search } from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";
import { Brand } from "@/components/brand";
import { NotificationsMenu } from "@/components/notifications-menu";
import { UserMenu } from "@/components/user-menu";

export function TopBar({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  const { setMobileNavOpen, setCommandPaletteOpen } = useShellUI();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-4 sm:px-6">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)] md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <Brand />

      <div className="mx-1 hidden h-6 w-px bg-[color:var(--bf-border)] md:block" />

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="ml-1 hidden min-w-56 items-center gap-2 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2.5 py-1.5 text-left text-sm text-[color:var(--bf-ink-muted)] hover:border-[color:var(--bf-border-strong)] sm:flex"
      >
        <Search size={14} />
        <span className="flex-1">Search...</span>
        <kbd className="rounded border border-[color:var(--bf-border)] px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)] sm:hidden"
        aria-label="Search"
      >
        <Search size={16} />
      </button>

      <NotificationsMenu />
      <UserMenu user={user} />
    </header>
  );
}
