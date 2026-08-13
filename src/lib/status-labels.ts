import {
  Circle,
  CircleDot,
  Loader2,
  Wrench,
  FlaskConical,
  BadgeCheck,
  CheckCheck,
  XCircle,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { BugStatus, SessionStatus } from "@/generated/prisma/enums";

export type BugStatusMeta = { label: string; icon: LucideIcon; color: string };

// The bug workflow's main path, in order. Status is meant to be visually
// obvious without relying on color alone, so every status pairs a distinct
// icon with its label — color is reinforcement, not the only signal.
export const BUG_STATUS_META: Record<BugStatus, BugStatusMeta> = {
  NEW: { label: "New", icon: Circle, color: "var(--bf-ink-muted)" },
  CONFIRMED: { label: "Confirmed", icon: CircleDot, color: "var(--bf-brand)" },
  IN_PROGRESS: { label: "In Progress", icon: Loader2, color: "var(--bf-brand)" },
  FIXED: { label: "Fixed", icon: Wrench, color: "var(--bf-status-warning)" },
  READY_FOR_QA: { label: "Ready for QA", icon: FlaskConical, color: "var(--bf-status-warning)" },
  VERIFIED: { label: "Verified", icon: BadgeCheck, color: "var(--bf-status-good)" },
  CLOSED: { label: "Closed", icon: CheckCheck, color: "var(--bf-status-low)" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "var(--bf-status-critical)" },
  DUPLICATE: { label: "Duplicate", icon: Copy, color: "var(--bf-status-low)" },
};

// The main pipeline a bug is expected to flow through...
export const BUG_WORKFLOW_MAIN: BugStatus[] = [
  BugStatus.NEW,
  BugStatus.CONFIRMED,
  BugStatus.IN_PROGRESS,
  BugStatus.FIXED,
  BugStatus.READY_FOR_QA,
  BugStatus.VERIFIED,
  BugStatus.CLOSED,
];

// ...or one of two alternate exits, taken instead of the main path.
export const BUG_WORKFLOW_EXITS: BugStatus[] = [BugStatus.REJECTED, BugStatus.DUPLICATE];

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};
