import { Platform } from "@/generated/prisma/enums";

export const PLATFORM_LABEL: Record<Platform, string> = {
  PC: "PC",
  PLAYSTATION: "PlayStation",
  XBOX: "Xbox",
  SWITCH: "Nintendo Switch",
  MOBILE: "Mobile",
};

// Display/selection order shared by every platform picker in the app.
export const PLATFORM_ORDER: Platform[] = ["PC", "PLAYSTATION", "XBOX", "SWITCH", "MOBILE"];

// Formats a game's supported platforms in the canonical order, e.g.
// "PC · PlayStation · Xbox" — never assume a game supports every platform.
export function formatPlatformList(platforms: Platform[]): string {
  const set = new Set(platforms);
  return PLATFORM_ORDER.filter((p) => set.has(p))
    .map((p) => PLATFORM_LABEL[p])
    .join(" · ");
}
