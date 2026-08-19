"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

const SIDEBAR_COLLAPSED_KEY = "bugforge:sidebar-collapsed";

type ShellUIContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  bugCreateModalOpen: boolean;
  bugCreateModalGameSlug: string | null;
  openBugCreateModal: (gameSlug?: string) => void;
  closeBugCreateModal: () => void;
  shortcutsHelpOpen: boolean;
  openShortcutsHelp: () => void;
  closeShortcutsHelp: () => void;
  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  mobileNotificationsOpen: boolean;
  openMobileNotifications: () => void;
  closeMobileNotifications: () => void;
};

export type ToastTone = "success" | "error" | "info";
export type Toast = { id: string; message: string; tone: ToastTone };

const ShellUIContext = createContext<ShellUIContextValue | null>(null);

export function ShellUIProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bugCreateModalOpen, setBugCreateModalOpen] = useState(false);
  const [bugCreateModalGameSlug, setBugCreateModalGameSlug] = useState<string | null>(null);

  function openBugCreateModal(gameSlug?: string) {
    setBugCreateModalGameSlug(gameSlug ?? null);
    setBugCreateModalOpen(true);
  }
  function closeBugCreateModal() {
    setBugCreateModalOpen(false);
  }

  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  function openShortcutsHelp() {
    setShortcutsHelpOpen(true);
  }
  function closeShortcutsHelp() {
    setShortcutsHelpOpen(false);
  }

  const [toasts, setToasts] = useState<Toast[]>([]);
  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }
  function pushToast(message: string, tone: ToastTone = "info") {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => dismissToast(id), 3200);
  }

  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false);
  function openMobileNotifications() {
    setMobileNotificationsOpen(true);
  }
  function closeMobileNotifications() {
    setMobileNotificationsOpen(false);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") setSidebarCollapsed(true);
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ShellUIContext.Provider
      value={{
        mobileNavOpen,
        setMobileNavOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        aiPanelOpen,
        setAiPanelOpen,
        sidebarCollapsed,
        toggleSidebarCollapsed,
        bugCreateModalOpen,
        bugCreateModalGameSlug,
        openBugCreateModal,
        closeBugCreateModal,
        shortcutsHelpOpen,
        openShortcutsHelp,
        closeShortcutsHelp,
        toasts,
        pushToast,
        dismissToast,
        mobileNotificationsOpen,
        openMobileNotifications,
        closeMobileNotifications,
      }}
    >
      {/* reducedMotion="user" makes every Motion animation in the app
          automatically respect prefers-reduced-motion — transform/layout
          animation is dropped, opacity fades remain (see src/lib/motion.ts). */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ShellUIContext.Provider>
  );
}

export function useShellUI() {
  const ctx = useContext(ShellUIContext);
  if (!ctx) throw new Error("useShellUI must be used within ShellUIProvider");
  return ctx;
}
