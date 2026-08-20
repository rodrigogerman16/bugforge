"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Check } from "lucide-react";
import { setPreviewRole, clearPreviewRole } from "@/app/preview-actions";
import { PREVIEWABLE_ROLES } from "@/lib/preview-role";
import { TESTER_ROLE_META } from "@/lib/tester";
import { cn } from "@/lib/utils";
import type { TesterRole } from "@/generated/prisma/enums";

// Demo/portfolio-only — see lib/preview-role.ts. Lets a visitor without a
// real session experience each role's real, unmodified permissions instead
// of always landing on the seeded QA Lead.
export function PreviewRoleSwitcher({ activeRole }: { activeRole: TesterRole | null }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function pick(role: TesterRole) {
    if (isPending) return;
    startTransition(async () => {
      await setPreviewRole(role);
      router.refresh();
    });
  }

  function exit() {
    if (isPending) return;
    startTransition(async () => {
      await clearPreviewRole();
      router.refresh();
    });
  }

  return (
    <div className="border-b border-[color:var(--bf-border)] py-1">
      <p className="flex items-center gap-1.5 px-3.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        <Eye size={11} />
        Preview as role
      </p>
      {PREVIEWABLE_ROLES.map((role) => {
        const meta = TESTER_ROLE_META[role];
        const active = role === activeRole;
        return (
          <button
            key={role}
            disabled={isPending}
            onClick={() => pick(role)}
            className={cn(
              "flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-sm hover:bg-[color:var(--bf-surface)] disabled:opacity-50",
              active ? "text-[color:var(--bf-ink-primary)]" : "text-[color:var(--bf-ink-secondary)]"
            )}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
            <span className="flex-1">{meta.label}</span>
            {active && <Check size={13} className="shrink-0 text-[color:var(--bf-brand)]" />}
          </button>
        );
      })}
      {activeRole && (
        <button
          disabled={isPending}
          onClick={exit}
          className="mt-0.5 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-[12px] text-[color:var(--bf-ink-muted)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--bf-ink-primary)] disabled:opacity-50"
        >
          Exit preview mode
        </button>
      )}
    </div>
  );
}
