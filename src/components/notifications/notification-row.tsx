import Link from "next/link";
import { AlertTriangle, PackagePlus, FlaskConical, UserRound, RotateCcw, AtSign, type LucideIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import type { NotificationSummary } from "@/lib/data";
import type { NotificationType } from "@/generated/prisma/enums";

export const NOTIFICATION_TYPE_META: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  BUG_ASSIGNED: { icon: UserRound, color: "var(--bf-brand)" },
  BUG_READY_FOR_QA: { icon: FlaskConical, color: "var(--bf-status-warning)" },
  BUILD_UPLOADED: { icon: PackagePlus, color: "var(--bf-brand)" },
  CRITICAL_BUG: { icon: AlertTriangle, color: "var(--bf-status-critical)" },
  REGRESSION_DETECTED: { icon: RotateCcw, color: "var(--bf-status-critical)" },
  COMMENT_MENTION: { icon: AtSign, color: "var(--bf-brand)" },
};

// One notification row — shared by the desktop dropdown and the mobile
// full-screen sheet so there's exactly one real rendering of a
// notification, not two that can quietly drift apart.
export function NotificationRow({
  notification,
  onOpen,
  onNavigate,
  size = "compact",
}: {
  notification: NotificationSummary;
  onOpen: (id: string) => void;
  onNavigate?: () => void;
  size?: "compact" | "roomy";
}) {
  const meta = NOTIFICATION_TYPE_META[notification.type];
  const Icon = meta.icon;
  const roomy = size === "roomy";

  const row = (
    <div
      className={
        roomy
          ? "flex gap-3 border-b border-[color:var(--bf-border)] px-4 py-4 active:bg-[color:var(--bf-surface)]"
          : "flex gap-2.5 border-b border-[color:var(--bf-border)] px-3.5 py-2.5 last:border-b-0 hover:bg-[color:var(--bf-surface)]"
      }
    >
      <div
        className={
          roomy
            ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            : "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        }
        style={{ backgroundColor: `${meta.color}1f` }}
      >
        <Icon size={roomy ? 15 : 12} style={{ color: meta.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={roomy ? "text-sm font-medium leading-snug text-[color:var(--bf-ink-primary)]" : "text-[13px] font-medium leading-snug text-[color:var(--bf-ink-primary)]"}>
          {notification.title}
        </p>
        <p className={roomy ? "mt-1 text-[13px] text-[color:var(--bf-ink-muted)]" : "mt-0.5 truncate text-[12px] text-[color:var(--bf-ink-muted)]"}>
          {notification.detail}
        </p>
        <p className="mt-1 text-[11px] text-[color:var(--bf-ink-muted)]">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--bf-brand)]" />}
    </div>
  );

  if (!notification.link) {
    return (
      <button onClick={() => onOpen(notification.id)} className="block w-full text-left">
        {row}
      </button>
    );
  }
  return (
    <Link
      href={notification.link}
      onClick={() => {
        onOpen(notification.id);
        onNavigate?.();
      }}
      className="block"
    >
      {row}
    </Link>
  );
}
