"use client";

import { MobileNav } from "@/components/layout/sidebar";
import { useShellUI } from "@/components/layout/shell-ui-provider";
import type { GameOption } from "@/components/layout/game-switcher";

export function ShellMobileNav({ games }: { games: GameOption[] }) {
  const { mobileNavOpen, setMobileNavOpen } = useShellUI();
  return <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} games={games} />;
}
