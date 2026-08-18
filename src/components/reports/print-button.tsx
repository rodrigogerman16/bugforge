"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2.5 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
    >
      <Printer size={13} />
      Print / Save as PDF
    </button>
  );
}
