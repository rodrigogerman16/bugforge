import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// The shared "nothing here" surface for list views — a genuinely empty
// list (no bugs/test cases/etc. exist yet) and a filtered-to-zero list
// (they exist, the current filters just don't match any) read as
// different situations to a user and get different copy/actions, but
// share the same layout so every list in the app looks consistent.
//
// `action` covers the common case (a plain navigation link). Pass
// `children` instead when the call-to-action needs real interactivity a
// link can't provide — e.g. opening a modal via a client component like
// ReportBugButton, rather than a route.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string; variant?: "primary" | "secondary" };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--bf-page)]">
        <Icon size={20} className="text-[color:var(--bf-ink-muted)]" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[color:var(--bf-ink-primary)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-[color:var(--bf-ink-muted)]">{description}</p>
      {action && (
        <Link
          href={action.href}
          className={
            action.variant === "secondary"
              ? "mt-5 rounded-md border border-[color:var(--bf-border)] px-3.5 py-1.5 text-[12px] font-medium text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
              : "mt-5 rounded-md bg-[color:var(--bf-brand)] px-3.5 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
          }
        >
          {action.label}
        </Link>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
