"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isSupabaseAuthConfigured } from "@/lib/auth";
import { PREVIEW_ROLE_COOKIE, isPreviewableRole } from "@/lib/preview-role";
import type { TesterRole } from "@/generated/prisma/enums";

// No capability check on purpose — this is a cosmetic "view as" toggle for
// portfolio visitors, not a real permission grant. It's also a no-op the
// moment real Supabase Auth is configured, so it can never override a real
// signed-in session's actual role.
export async function setPreviewRole(role: TesterRole) {
  if (isSupabaseAuthConfigured() || !isPreviewableRole(role)) return;
  const store = await cookies();
  store.set(PREVIEW_ROLE_COOKIE, role, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function clearPreviewRole() {
  if (isSupabaseAuthConfigured()) return;
  const store = await cookies();
  store.delete(PREVIEW_ROLE_COOKIE);
  revalidatePath("/", "layout");
}
