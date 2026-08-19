"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { fadeIn, fastTransition } from "@/lib/motion";

// Wraps the routed page content so navigating between routes gets a quick,
// subtle cross-fade instead of an abrupt swap. initial={false} skips the
// animation on first load (nothing to transition from yet); mode isn't set
// to "wait" so the outgoing and incoming page fade concurrently — a brief
// overlap reads as "the page changed," a wait-for-exit gap would just read
// as a flash of empty page, which is the opposite of subtle.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence initial={false}>
      <motion.div key={pathname} variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={fastTransition}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
