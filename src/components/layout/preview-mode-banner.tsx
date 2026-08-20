"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { clearPreviewRole } from "@/app/preview-actions";
import { TESTER_ROLE_META } from "@/lib/tester";
import type { TesterRole } from "@/generated/prisma/enums";

// Demo/portfolio-only — see lib/preview-role.ts. Shown whenever a visitor
// is browsing as a role other than their real (default QA Lead) identity,
// so it's always obvious this isn't a real signed-in session.
export function PreviewModeBanner({ role }: { role: TesterRole }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const meta = TESTER_ROLE_META[role];

  function exit() {
    if (isPending) return;
    startTransition(async () => {
      await clearPreviewRole();
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[color:var(--bf-border)] bg-[color:var(--bf-brand-soft)] px-4 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)]">
      <Eye size={12} className="shrink-0 text-[color:var(--bf-brand)]" />
      <span>
        Preview mode — <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span>
      </span>
      <span className="text-[color:var(--bf-ink-muted)]">·</span>
      <button
        onClick={exit}
        disabled={isPending}
        className="text-[color:var(--bf-brand)] underline decoration-dotted underline-offset-2 hover:opacity-80 disabled:opacity-50"
      >
        Return to QA Lead
      </button>
    </div>
  );
}
