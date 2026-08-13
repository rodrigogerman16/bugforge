"use client";

import { Bell, AlertTriangle, PackagePlus, Radio, CheckCircle2 } from "lucide-react";
import { Dropdown } from "@/components/dropdown";

const NOTIFICATIONS = [
  {
    id: 1,
    icon: AlertTriangle,
    color: "var(--bf-status-critical)",
    title: "New critical bug reported",
    detail: "King of Meat — \"Critical hits dealing zero damage vs shielded enemies\"",
    time: "12m ago",
    unread: true,
  },
  {
    id: 2,
    icon: PackagePlus,
    color: "var(--bf-brand)",
    title: "Build 0.9.14-beta released",
    detail: "Voidrunner Protocol — release/beta branch",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    icon: Radio,
    color: "var(--bf-status-good)",
    title: "Beta Test #24 is now active",
    detail: "Hollow Frontier QA session started",
    time: "3h ago",
    unread: true,
  },
  {
    id: 4,
    icon: CheckCircle2,
    color: "var(--bf-status-good)",
    title: "3 bugs verified",
    detail: "King of Meat — fixes confirmed on latest build",
    time: "1d ago",
    unread: false,
  },
];

export function NotificationsMenu() {
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <Dropdown
      align="right"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)]"
          aria-label="Notifications"
        >
          <Bell size={16} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[color:var(--bf-status-critical)] px-0.5 text-[9px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {() => (
        <div className="w-80">
          <div className="flex items-center justify-between border-b border-[color:var(--bf-border)] px-3.5 py-2.5">
            <p className="text-sm font-semibold text-[color:var(--bf-ink-primary)]">
              Notifications
            </p>
            <span className="text-[11px] text-[color:var(--bf-ink-muted)]">
              {unreadCount} unread
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {NOTIFICATIONS.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className="flex gap-2.5 border-b border-[color:var(--bf-border)] px-3.5 py-2.5 last:border-b-0 hover:bg-[color:var(--bf-surface)]"
                >
                  <div
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${n.color}1f` }}
                  >
                    <Icon size={12} style={{ color: n.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug text-[color:var(--bf-ink-primary)]">
                      {n.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[color:var(--bf-ink-muted)]">
                      {n.detail}
                    </p>
                    <p className="mt-1 text-[11px] text-[color:var(--bf-ink-muted)]">{n.time}</p>
                  </div>
                  {n.unread && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--bf-brand)]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
