"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
};

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
      }}
    >
      {children}
    </ShellUIContext.Provider>
  );
}

export function useShellUI() {
  const ctx = useContext(ShellUIContext);
  if (!ctx) throw new Error("useShellUI must be used within ShellUIProvider");
  return ctx;
}
