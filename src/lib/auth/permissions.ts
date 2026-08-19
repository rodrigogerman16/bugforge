import { getCurrentUser } from "@/lib/db";
import type { TesterRole, BugStatus } from "@/generated/prisma/enums";

// The real, granular permission matrix — item 47 only had a blanket
// "Viewer is read-only" rule; this replaces it with the specific
// capabilities each role was actually given:
//
//   QA Tester : create bugs, edit own bugs, execute tests, comment, upload evidence
//   QA Lead   : everything a Tester can do, + assign bugs, manage test
//               sessions, manage test cases, view analytics
//   Developer : view bugs, comment, update development status, upload fix
//               information (evidence) — nothing else
//   Producer  : view analytics, view release readiness — nothing else
//   Admin     : everything
//   Viewer    : nothing (read-only)
//
// A few capabilities aren't named in that spec but are clearly the same
// tier of "team configuration" as the ones that are (managing test cases,
// managing test sessions) — area taxonomy and build status are grouped
// with QA Lead/Admin on that basis, and bulk bug actions (which can touch
// bugs a QA Tester doesn't own) are treated as a QA Lead/Admin-only power
// rather than folded into "edit own bugs."
export type Capability =
  | "CREATE_BUG"
  | "EDIT_BUG_FIELDS"
  | "CHANGE_BUG_STATUS"
  | "ASSIGN_BUG"
  | "EXECUTE_TESTS"
  | "MANAGE_TEST_CASES"
  | "MANAGE_TEST_SESSIONS"
  | "COMMENT"
  | "UPLOAD_EVIDENCE"
  | "MANAGE_AREAS"
  | "MANAGE_BUILDS"
  | "VIEW_ANALYTICS"
  | "VIEW_RELEASE_READINESS"
  | "MANAGE_SETTINGS"
  | "MANAGE_ROLES"
  | "BULK_BUG_ACTIONS";

const TESTER_CAPABILITIES: Capability[] = [
  "CREATE_BUG",
  "EDIT_BUG_FIELDS",
  "CHANGE_BUG_STATUS",
  "EXECUTE_TESTS",
  "COMMENT",
  "UPLOAD_EVIDENCE",
];

const ALL_CAPABILITIES: Capability[] = [
  ...TESTER_CAPABILITIES,
  "ASSIGN_BUG",
  "MANAGE_TEST_CASES",
  "MANAGE_TEST_SESSIONS",
  "MANAGE_AREAS",
  "MANAGE_BUILDS",
  "VIEW_ANALYTICS",
  "VIEW_RELEASE_READINESS",
  "MANAGE_SETTINGS",
  "MANAGE_ROLES",
  "BULK_BUG_ACTIONS",
];

const ROLE_CAPABILITIES: Record<TesterRole, ReadonlySet<Capability>> = {
  ADMIN: new Set(ALL_CAPABILITIES),
  QA_LEAD: new Set([
    ...TESTER_CAPABILITIES,
    "ASSIGN_BUG",
    "MANAGE_TEST_CASES",
    "MANAGE_TEST_SESSIONS",
    "MANAGE_AREAS",
    "MANAGE_BUILDS",
    "VIEW_ANALYTICS",
    "VIEW_RELEASE_READINESS",
    "MANAGE_SETTINGS",
    "BULK_BUG_ACTIONS",
  ]),
  QA_TESTER: new Set(TESTER_CAPABILITIES),
  DEVELOPER: new Set<Capability>(["COMMENT", "CHANGE_BUG_STATUS", "UPLOAD_EVIDENCE"]),
  PRODUCER: new Set<Capability>(["VIEW_ANALYTICS", "VIEW_RELEASE_READINESS"]),
  VIEWER: new Set<Capability>([]),
};

// A Developer's "update development status" is the development half of the
// workflow specifically — picking a bug up and marking it fixed — not the
// QA-owned triage/verification stages (Confirmed, Ready for QA, Verified,
// Closed, Rejected, Duplicate).
export const DEVELOPER_ALLOWED_STATUSES: BugStatus[] = ["IN_PROGRESS", "FIXED"];

export function hasCapability(role: TesterRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].has(capability);
}

export function canViewAnalytics(role: TesterRole): boolean {
  return hasCapability(role, "VIEW_ANALYTICS");
}

export function canViewReleaseReadiness(role: TesterRole): boolean {
  return hasCapability(role, "VIEW_RELEASE_READINESS");
}

export function canManageSettings(role: TesterRole): boolean {
  return hasCapability(role, "MANAGE_SETTINGS");
}

export function canManageRoles(role: TesterRole): boolean {
  return hasCapability(role, "MANAGE_ROLES");
}

// Synchronous counterparts of the assert* guards below, for pages/components
// that already have `{ role }` and `{ reportedById }` in hand and just need
// a boolean to decide what to render (a real control vs. read-only text) —
// the assert* functions remain the actual enforcement at write time.
export function canEditBugFields(role: TesterRole, isOwnBug: boolean): boolean {
  if (!hasCapability(role, "EDIT_BUG_FIELDS")) return false;
  return role !== "QA_TESTER" || isOwnBug;
}

export function canChangeBugStatus(role: TesterRole, isOwnBug: boolean): boolean {
  if (!hasCapability(role, "CHANGE_BUG_STATUS")) return false;
  return role !== "QA_TESTER" || isOwnBug;
}

export function canAssignBug(role: TesterRole): boolean {
  return hasCapability(role, "ASSIGN_BUG");
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

async function requireCapability(capability: Capability, message: string) {
  const user = await getCurrentUser();
  if (!hasCapability(user.role, capability)) {
    throw new PermissionError(message);
  }
  return user;
}

export async function assertCanCreateBug() {
  return requireCapability("CREATE_BUG", "Your role can't create bugs.");
}

// "Edit own bugs" for a QA Tester — anyone with the broader capability
// (QA Lead, Admin) can edit any bug's fields; a QA Tester is additionally
// restricted to bugs they reported.
export async function assertCanEditBugFields(bug: { reportedById: string | null }) {
  const user = await requireCapability("EDIT_BUG_FIELDS", "Your role can't edit bug details.");
  if (user.role === "QA_TESTER" && bug.reportedById !== user.id) {
    throw new PermissionError("QA Testers can only edit bugs they reported.");
  }
  return user;
}

// Status is its own capability (not folded into EDIT_BUG_FIELDS) because
// Developer has it without the rest of EDIT_BUG_FIELDS, and only for the
// development-phase statuses.
export async function assertCanChangeBugStatus(bug: { reportedById: string | null }, targetStatus: BugStatus) {
  const user = await requireCapability("CHANGE_BUG_STATUS", "Your role can't change a bug's status.");
  if (user.role === "QA_TESTER" && bug.reportedById !== user.id) {
    throw new PermissionError("QA Testers can only update bugs they reported.");
  }
  if (user.role === "DEVELOPER" && !DEVELOPER_ALLOWED_STATUSES.includes(targetStatus)) {
    throw new PermissionError("Developers can only move a bug to In Progress or Fixed.");
  }
  return user;
}

export async function assertCanAssignBug() {
  return requireCapability("ASSIGN_BUG", "Only QA Leads and Admins can assign bugs.");
}

export async function assertCanExecuteTests() {
  return requireCapability("EXECUTE_TESTS", "Your role can't execute tests.");
}

export async function assertCanManageTestCases() {
  return requireCapability("MANAGE_TEST_CASES", "Only QA Leads and Admins can manage test cases.");
}

export async function assertCanManageTestSessions() {
  return requireCapability("MANAGE_TEST_SESSIONS", "Only QA Leads and Admins can manage test sessions.");
}

export async function assertCanComment() {
  return requireCapability("COMMENT", "Your role can't post comments.");
}

export async function assertCanUploadEvidence() {
  return requireCapability("UPLOAD_EVIDENCE", "Your role can't upload evidence.");
}

export async function assertCanManageAreas() {
  return requireCapability("MANAGE_AREAS", "Only QA Leads and Admins can manage areas.");
}

export async function assertCanManageBuilds() {
  return requireCapability("MANAGE_BUILDS", "Only QA Leads and Admins can manage builds.");
}

export async function assertCanBulkActOnBugs() {
  return requireCapability("BULK_BUG_ACTIONS", "Only QA Leads and Admins can bulk-edit bugs.");
}

export async function assertCanManageSettings() {
  return requireCapability("MANAGE_SETTINGS", "Only Admins and QA Leads can change quality gates.");
}

export async function assertCanManageRoles() {
  return requireCapability("MANAGE_ROLES", "Only Admins can change a teammate's role.");
}
