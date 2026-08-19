"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared focus-management contract for every modal/overlay in the app
// (BugCreateModal, KeyboardShortcutsModal, MobileNotificationsSheet,
// CommandPalette, MobileNav): while `active`, keyboard focus moves into the
// container and Tab/Shift+Tab can't escape it, then on close focus returns
// to whatever triggered the overlay — the trigger button, in the common
// case — rather than snapping back to the top of the page.
export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const initial = focusables()[0];
    (initial ?? container).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [active, containerRef]);
}
