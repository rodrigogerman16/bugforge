import { cn } from "@/lib/utils";

// The base block every page skeleton composes from — a pulsing rectangle
// standing in for text, a badge, a card, etc. Callers size it with
// className (width/height/rounding); this just owns the fill + animation
// so every skeleton in the app pulses in sync and at the same opacity.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[color:var(--bf-border-strong)]", className)} />;
}
