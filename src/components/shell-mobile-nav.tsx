"use client";

import { MobileNav } from "@/components/sidebar";
import { useShellUI } from "@/components/shell-ui-provider";
import type { GameOption } from "@/components/game-switcher";

export function ShellMobileNav({ games }: { games: GameOption[] }) {
  const { mobileNavOpen, setMobileNavOpen } = useShellUI();
  return <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} games={games} />;
}
