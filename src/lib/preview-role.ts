import type { TesterRole } from "@/generated/prisma/enums";

// Demo/portfolio-only: lets a visitor pick which real seeded tester's role
// they see the app as, without a real login. This never touches the actual
// permission system (see lib/auth/permissions.ts) — it only changes which
// real Tester row getCurrentUser() resolves to, so every capability check
// downstream still runs for real against that tester's real role. Admin is
// deliberately excluded from the preview set; it isn't one of the roles a
// portfolio visitor needs to experience.
//
// Client-safe constants only — the cookie *read* (getPreviewRole) lives in
// preview-role.server.ts, since it needs next/headers and this file is
// imported from client components (the switcher UI).
export const PREVIEW_ROLE_COOKIE = "bf_preview_role";

export const PREVIEWABLE_ROLES: TesterRole[] = ["QA_LEAD", "QA_TESTER", "DEVELOPER", "PRODUCER", "VIEWER"];

export function isPreviewableRole(value: string | undefined): value is TesterRole {
  return !!value && (PREVIEWABLE_ROLES as string[]).includes(value);
}
