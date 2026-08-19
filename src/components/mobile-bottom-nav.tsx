"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bug, ListChecks, Bell, Plus } from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";
import { cn } from "@/lib/utils";

// The five things a tester reaches for constantly on a phone (see the
// mobile priorities: bug review, bug creation, test execution,
// notifications) get a real bottom tab bar instead of being buried behind
// the hamburger menu — that menu (still reachable from the topbar) keeps
// everything else (Builds, Sessions, Coverage, Analytics, Reports,
// Testers, Settings). This is additive, not a replacement.
export function MobileBottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const { openBugCreateModal, openMobileNotifications } = useShellUI();

  const isHome = pathname === "/";
  const isBugs = pathname.startsWith("/bugs");
  const isTests = pathname.startsWith("/test-cases");

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium",
      active ? "text-[color:var(--bf-brand)]" : "text-[color:var(--bf-ink-muted)]"
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-[color:var(--bf-border)] bg-[color:var(--bf-surface-raised)] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <Link href="/" className={tabClass(isHome)}>
        <LayoutDashboard size={19} strokeWidth={isHome ? 2.25 : 1.75} />
        Home
      </Link>

      <Link href="/bugs" className={tabClass(isBugs)}>
        <Bug size={19} strokeWidth={isBugs ? 2.25 : 1.75} />
        Bugs
      </Link>

      <div className="flex flex-1 items-center justify-center">
        <button
          onClick={() => openBugCreateModal()}
          aria-label="Report a bug"
          className="-mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--bf-brand)] text-black shadow-lg shadow-black/40"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <Link href="/test-cases" className={tabClass(isTests)}>
        <ListChecks size={19} strokeWidth={isTests ? 2.25 : 1.75} />
        Tests
      </Link>

      <button onClick={openMobileNotifications} className={tabClass(false)}>
        <span className="relative flex items-center justify-center">
          <Bell size={19} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[color:var(--bf-status-critical)] px-0.5 text-[9px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        Alerts
      </button>
    </nav>
  );
}
