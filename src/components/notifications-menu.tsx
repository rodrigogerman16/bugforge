"use client";

import { Bell } from "lucide-react";
import { Dropdown } from "@/components/dropdown";
import { useNotificationsState } from "@/components/notifications/use-notifications-state";
import { NotificationRow } from "@/components/notifications/notification-row";
import type { NotificationSummary } from "@/lib/data";

// Every notification here is a real Notification row (see lib/data.ts's
// getNotifications) created at the moment its underlying event happened —
// read/unread is real state persisted in the database, not a client-only
// flag, so it stays correct across reloads and other tabs. The mobile
// equivalent (MobileNotificationsSheet) shares this same state hook and row
// rendering — same data, same interaction, different chrome.
export function NotificationsMenu({ notifications, userId }: { notifications: NotificationSummary[]; userId: string }) {
  const { items, unreadCount, handleOpen, handleMarkAllRead } = useNotificationsState(notifications, userId);

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
              items.map((n) => (
                <NotificationRow key={n.id} notification={n} onOpen={handleOpen} onNavigate={close} size="compact" />
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
