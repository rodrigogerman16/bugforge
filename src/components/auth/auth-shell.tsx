import type { ReactNode } from "react";

// The layout every auth page (login, signup, forgot/reset password) renders
// inside — deliberately not the app shell (no sidebar/topbar): the root
// layout skips those entirely when there's no session to show them for.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--bf-page)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--bf-brand)] text-lg font-bold text-black">
            B
          </div>
          <p className="text-sm font-semibold text-[color:var(--bf-ink-primary)]">BugForge</p>
        </div>
        <div className="rounded-xl border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-6">
          <h1 className="text-lg font-semibold text-[color:var(--bf-ink-primary)]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-[color:var(--bf-ink-muted)]">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-[13px] text-[color:var(--bf-ink-muted)]">{footer}</div>}
      </div>
    </div>
  );
}

export const authInputClass =
  "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";

export function AuthLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]">{children}</label>;
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-md border border-[color:var(--bf-status-critical)]/30 bg-[color:var(--bf-status-critical)]/10 px-3 py-2 text-[12px] text-[color:var(--bf-status-critical)]">
      {message}
    </p>
  );
}

export function AuthSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-md border border-[color:var(--bf-status-good)]/30 bg-[color:var(--bf-status-good)]/10 px-3 py-2 text-[12px] text-[color:var(--bf-status-good)]">
      {message}
    </p>
  );
}
