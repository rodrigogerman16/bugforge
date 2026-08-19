"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";
import { useNotificationsState } from "@/components/notifications/use-notifications-state";
import { NotificationRow } from "@/components/notifications/notification-row";
import { fadeIn, fastTransition } from "@/lib/motion";
import type { NotificationSummary } from "@/lib/data";

// The bottom nav's "Notifications" tab has nowhere to route to (there's no
// /notifications page) — it opens this full-screen sheet instead, the
// mobile-appropriate equivalent of the topbar's small anchored dropdown.
// Same real data and read/unread state (useNotificationsState), just chrome
// sized for a touch screen instead of a mouse-hover dropdown.
export function MobileNotificationsSheet({ notifications, userId }: { notifications: NotificationSummary[]; userId: string }) {
  const { mobileNotificationsOpen, closeMobileNotifications } = useShellUI();
  const { items, unreadCount, handleOpen, handleMarkAllRead } = useNotificationsState(notifications, userId);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileNotificationsOpen) closeMobileNotifications();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNotificationsOpen, closeMobileNotifications]);

  return (
    <AnimatePresence>
      {mobileNotificationsOpen && (
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={fastTransition}
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          className="fixed inset-0 z-50 flex flex-col bg-[color:var(--bf-page)] md:hidden"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--bf-border)] px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <p className="text-lg font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Notifications</p>
            <button
              onClick={closeMobileNotifications}
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)]"
            >
              <X size={18} />
            </button>
          </div>

          {unreadCount > 0 && (
            <div className="flex shrink-0 justify-end border-b border-[color:var(--bf-border)] px-4 py-2.5">
              <button onClick={handleMarkAllRead} className="text-[12px] font-medium text-[color:var(--bf-brand)]">
                Mark all read
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[color:var(--bf-ink-muted)]">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onOpen={handleOpen}
                  onNavigate={closeMobileNotifications}
                  size="roomy"
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
