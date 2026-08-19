"use client";

import { Sparkles } from "lucide-react";
import { useShellUI } from "@/components/layout/shell-ui-provider";

export function AskAiButton() {
  const { setAiPanelOpen } = useShellUI();
  return (
    <button
      onClick={() => setAiPanelOpen(true)}
      className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-brand)]/30 px-2 py-1 text-[11px] font-medium text-[color:var(--bf-brand)] hover:bg-[color:var(--bf-brand-soft)]"
    >
      <Sparkles size={12} />
      Ask BugForge AI
    </button>
  );
}
