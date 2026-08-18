import { getCurrentUser } from "@/lib/data";
import type { TesterRole } from "@/generated/prisma/enums";

// Viewer is the one universal rule: read-only everywhere in the app. Every
// other role can create/edit QA content (bugs, comments, test runs,
// evidence, sessions, test cases, areas). Only Admin and QA Lead can change
// Settings/Quality Gates — the requirements that decide what "release
// ready" means for the whole team — and only Admin can change a teammate's
// role.
export function canWrite(role: TesterRole): boolean {
  return role !== "VIEWER";
}

export function canManageSettings(role: TesterRole): boolean {
  return role === "ADMIN" || role === "QA_LEAD";
}

export function canManageRoles(role: TesterRole): boolean {
  return role === "ADMIN";
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

// The guard nearly every mutating server action calls first — resolves the
// real current user (from the Supabase session once auth is configured; see
// getCurrentUser in lib/data.ts) and throws before anything is written if
// their role is read-only.
export async function assertCanWrite() {
  const user = await getCurrentUser();
  if (!canWrite(user.role)) {
    throw new PermissionError("Viewers have read-only access — ask an Admin or QA Lead to change your role.");
  }
  return user;
}

export async function assertCanManageSettings() {
  const user = await getCurrentUser();
  if (!canManageSettings(user.role)) {
    throw new PermissionError("Only Admins and QA Leads can change quality gates.");
  }
  return user;
}

export async function assertCanManageRoles() {
  const user = await getCurrentUser();
  if (!canManageRoles(user.role)) {
    throw new PermissionError("Only Admins can change a teammate's role.");
  }
  return user;
}
