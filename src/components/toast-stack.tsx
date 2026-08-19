"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useShellUI, type ToastTone } from "@/components/shell-ui-provider";
import { baseTransition } from "@/lib/motion";

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: "var(--bf-status-good)",
  error: "var(--bf-status-critical)",
  info: "var(--bf-brand)",
};

// Mounted once, globally, in the root layout. Real confirmations only —
// pushToast() is called from actual mutation call sites (bug created,
// comment posted, evidence uploaded, ...), never fired decoratively.
export function ToastStack() {
  const { toasts, dismissToast } = useShellUI();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={baseTransition}
              className="pointer-events-auto flex min-w-64 max-w-sm items-center gap-2 rounded-lg border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] px-3.5 py-2.5 shadow-lg shadow-black/40"
            >
              <Icon size={16} style={{ color: TONE_COLOR[t.tone] }} className="shrink-0" />
              <p className="flex-1 text-[13px] text-[color:var(--bf-ink-primary)]">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss"
                className="shrink-0 text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
