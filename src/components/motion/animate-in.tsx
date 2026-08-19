"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { fadeSlideUp, baseTransition } from "@/lib/motion";

// A thin client boundary that lets server-rendered content (the AI
// analysis panel, the report quality card, a chart once its data is
// ready, ...) get a subtle "arrives" animation on mount without having to
// convert the whole section to a client component. Nothing here depends
// on interactivity — it only runs once, when the element first appears.
export function AnimateIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      variants={fadeSlideUp}
      initial="initial"
      animate="animate"
      transition={{ ...baseTransition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
