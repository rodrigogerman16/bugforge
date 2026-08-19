import type { Transition, Variants } from "motion/react";

// A single, subtle motion language shared by every animated surface in the
// app (modals, the drawer, the command palette, toasts, AI responses,
// charts, status-change highlights, page transitions) — short durations, a
// quick-settle easing curve with no bounce or overshoot, and small offsets
// (a few pixels, not big slides). The goal is motion that reads as "the UI
// responding," never as decoration competing for attention.
//
// prefers-reduced-motion is handled centrally: the app is wrapped in
// <MotionConfig reducedMotion="user"> (see shell-ui-provider.tsx), which
// automatically strips every transform/layout animation below (x, y,
// scale) for anyone with that OS preference set, while leaving the opacity
// fade in place so state changes are still perceptible — never a jarring
// instant swap, just no movement.

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const fastTransition: Transition = { duration: 0.15, ease: EASE_OUT };
export const baseTransition: Transition = { duration: 0.2, ease: EASE_OUT };
export const drawerTransition: Transition = { duration: 0.25, ease: EASE_OUT };

// Backdrop overlays (modal/palette scrims).
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Centered modal/dialog panels (BugCreateModal, KeyboardShortcutsModal,
// command palette).
export const fadeScaleIn: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 2 },
};

// Content that "arrives" — AI responses, toasts, newly-revealed panels
// (the AI-fill summary, the report quality card, a chart once its data is
// ready).
export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

// The AI assistant side drawer.
export const drawerSlideRight: Variants = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
};

// A brief highlight pulse for an in-place value change (a status/severity/
// priority badge updating) — a background flash that decays back to
// nothing, not a shape/position change, so it reads as "this changed"
// without moving anything else on the page.
export const changeHighlight: Variants = {
  initial: { backgroundColor: "rgba(242, 118, 46, 0.35)" },
  animate: { backgroundColor: "rgba(242, 118, 46, 0)" },
};
export const changeHighlightTransition: Transition = { duration: 0.8, ease: "easeOut" };
