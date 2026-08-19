"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShellUI } from "@/components/layout/shell-ui-provider";

// The single-key shortcuts (⌘K/Ctrl+K for the command palette lives in
// ShellUIProvider itself) — B for a new bug, T for a new test case, S to
// start a session, / to search, ? for this list. Mounted once, globally,
// renders nothing itself; see KeyboardShortcutsModal for the "?" readout.
//
// Never fires while the tester is actually typing: any INPUT/TEXTAREA/
// SELECT/contenteditable target is ignored outright, and modifier keys
// (so real browser/OS shortcuts on the same letter still work) are never
// intercepted. Also stays quiet while an overlay that already owns the
// keyboard (command palette, the bug report modal, this same help list) is
// open, so a shortcut typed to search for something inside one of those
// can't accidentally double-trigger another action.
export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    bugCreateModalOpen,
    openBugCreateModal,
    shortcutsHelpOpen,
    openShortcutsHelp,
  } = useShellUI();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (commandPaletteOpen || bugCreateModalOpen || shortcutsHelpOpen) return;

      const gameSlug = searchParams.get("game");
      const effectiveGameSlug = gameSlug && gameSlug !== "all" ? gameSlug : undefined;

      if (e.key === "/") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        openShortcutsHelp();
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        openBugCreateModal(effectiveGameSlug);
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        router.push(effectiveGameSlug ? `/test-cases/new?game=${effectiveGameSlug}` : "/test-cases/new");
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        router.push(effectiveGameSlug ? `/sessions/new?game=${effectiveGameSlug}` : "/sessions/new");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    router,
    searchParams,
    commandPaletteOpen,
    setCommandPaletteOpen,
    bugCreateModalOpen,
    openBugCreateModal,
    shortcutsHelpOpen,
    openShortcutsHelp,
  ]);

  return null;
}
