"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, PackagePlus, FlaskConical, UserRound, RotateCcw, type LucideIcon } from "lucide-react";
import { Dropdown } from "@/components/dropdown";
import { formatRelativeTime } from "@/lib/relative-time";
import { markNotificationRead, markAllNotificationsRead } from "@/app/notifications/actions";
import type { NotificationSummary } from "@/lib/data";
import type { NotificationType } from "@/generated/prisma/enums";

const TYPE_META: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  BUG_ASSIGNED: { icon: UserRound, color: "var(--bf-brand)" },
  BUG_READY_FOR_QA: { icon: FlaskConical, color: "var(--bf-status-warning)" },
  BUILD_UPLOADED: { icon: PackagePlus, color: "var(--bf-brand)" },
  CRITICAL_BUG: { icon: AlertTriangle, color: "var(--bf-status-critical)" },
  REGRESSION_DETECTED: { icon: RotateCcw, color: "var(--bf-status-critical)" },
};

// Every notification here is a real Notification row (see lib/data.ts's
// getNotifications) created at the moment its underlying event happened —
// read/unread is real state persisted in the database, not a client-only
// flag, so it stays correct across reloads and other tabs.
export function NotificationsMenu({ notifications, userId }: { notifications: NotificationSummary[]; userId: string }) {
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();
  const unreadCount = items.filter((n) => !n.read).length;

  function handleOpen(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(() => {
      markAllNotificationsRead(userId);
    });
  }

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
      {({ close }) => (
        <div className="w-80">
          <div className="flex items-center justify-between border-b border-[color:var(--bf-border)] px-3.5 py-2.5">
            <p className="text-sm font-semibold text-[color:var(--bf-ink-primary)]">Notifications</p>
            {unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-[color:var(--bf-brand)] hover:underline"
              >
                Mark all read
              </button>
            ) : (
              <span className="text-[11px] text-[color:var(--bf-ink-muted)]">All read</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12px] text-[color:var(--bf-ink-muted)]">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                const row = (
                  <div className="flex gap-2.5 border-b border-[color:var(--bf-border)] px-3.5 py-2.5 last:border-b-0 hover:bg-[color:var(--bf-surface)]">
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${meta.color}1f` }}
                    >
                      <Icon size={12} style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-[color:var(--bf-ink-primary)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[color:var(--bf-ink-muted)]">{n.detail}</p>
                      <p className="mt-1 text-[11px] text-[color:var(--bf-ink-muted)]">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--bf-brand)]" />}
                  </div>
                );

                if (!n.link) {
                  return (
                    <button key={n.id} onClick={() => handleOpen(n.id)} className="block w-full text-left">
                      {row}
                    </button>
                  );
                }
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      handleOpen(n.id);
                      close();
                    }}
                    className="block"
                  >
                    {row}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
