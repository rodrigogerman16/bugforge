"use client";

import { Plus } from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";

// Opens the bug report modal instead of navigating to a page — the same
// game context (if any) the caller already has just gets passed straight
// through, no query-string round trip needed.
export function ReportBugButton({ gameSlug }: { gameSlug?: string }) {
  const { openBugCreateModal } = useShellUI();
  return (
    <button
      onClick={() => openBugCreateModal(gameSlug && gameSlug !== "all" ? gameSlug : undefined)}
      className="flex shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
    >
      <Plus size={13} />
      Report Bug
    </button>
  );
}
