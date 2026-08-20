import { cookies } from "next/headers";
import type { TesterRole } from "@/generated/prisma/enums";
import { PREVIEW_ROLE_COOKIE, isPreviewableRole } from "@/lib/preview-role";

// Server-only half of preview-role.ts — split out so client components
// (the role switcher) can import the shared constants without dragging
// next/headers into the client bundle.
export async function getPreviewRole(): Promise<TesterRole | null> {
  const store = await cookies();
  const value = store.get(PREVIEW_ROLE_COOKIE)?.value;
  return isPreviewableRole(value) ? value : null;
}
