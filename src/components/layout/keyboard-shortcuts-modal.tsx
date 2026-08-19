"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useShellUI } from "@/components/layout/shell-ui-provider";
import { fadeIn, fadeScaleIn, fastTransition } from "@/lib/utils/motion";
import { useFocusTrap } from "@/lib/utils/use-focus-trap";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Command palette" },
  { keys: ["B"], label: "New bug" },
  { keys: ["T"], label: "New test case" },
  { keys: ["S"], label: "Start session" },
  { keys: ["/"], label: "Search" },
  { keys: ["?"], label: "Keyboard shortcuts" },
];

// Mounted once, globally, opened by "?" (see GlobalKeyboardShortcuts) — a
// real, live list of every shortcut this app actually wires up, not a
// static help page that can drift out of sync with what the keys do.
export function KeyboardShortcutsModal() {
  const { shortcutsHelpOpen, closeShortcutsHelp } = useShellUI();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(shortcutsHelpOpen, dialogRef);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && shortcutsHelpOpen) closeShortcutsHelp();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutsHelpOpen, closeShortcutsHelp]);

  return (
    <AnimatePresence>
      {shortcutsHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fastTransition}
            onClick={closeShortcutsHelp}
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
          />

          <motion.div
            ref={dialogRef}
            variants={fadeScaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fastTransition}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            tabIndex={-1}
            className="relative w-full max-w-sm overflow-hidden rounded-xl border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-page)] shadow-2xl shadow-black/50"
          >
        <div className="flex items-center justify-between border-b border-[color:var(--bf-border)] px-5 py-4">
          <h2 id="keyboard-shortcuts-title" className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={closeShortcutsHelp}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)]"
          >
            <X size={15} />
          </button>
        </div>

        <ul className="divide-y divide-[color:var(--bf-border)] px-5">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between py-3">
              <span className="text-sm text-[color:var(--bf-ink-secondary)]">{s.label}</span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-[22px] rounded border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface)] px-1.5 py-0.5 text-center font-mono text-[11px] font-medium text-[color:var(--bf-ink-primary)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <p className="border-t border-[color:var(--bf-border)] px-5 py-3 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
          Shortcuts never fire while you&apos;re typing in a field.
        </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
