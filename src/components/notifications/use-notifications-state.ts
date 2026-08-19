"use client";

import { useState, useTransition } from "react";
import { markNotificationRead, markAllNotificationsRead } from "@/app/notifications/actions";
import type { NotificationSummary } from "@/lib/data";

// Shared read/unread state + mutation handlers behind both the desktop
// notifications dropdown and the mobile full-screen sheet — one real
// interaction with the same Notification rows either way, just different
// chrome around it.
export function useNotificationsState(initial: NotificationSummary[], userId: string) {
  const [items, setItems] = useState(initial);
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

  return { items, unreadCount, handleOpen, handleMarkAllRead };
}
