import { ShieldAlert } from "lucide-react";

// Shown in place of a page's real content when the current role doesn't
// have the capability that page requires (see lib/permissions.ts) — a
// clear, honest message rather than a 404 or a silent empty page.
export function RestrictedAccess({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-8 py-24 text-center">
      <ShieldAlert size={28} className="text-[color:var(--bf-ink-muted)]" />
      <h1 className="text-lg font-semibold text-[color:var(--bf-ink-primary)]">Restricted</h1>
      <p className="text-sm text-[color:var(--bf-ink-muted)]">{message}</p>
    </div>
  );
}
