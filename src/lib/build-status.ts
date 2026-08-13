import { BuildStatus } from "@/generated/prisma/enums";

export const BUILD_STATUS_ORDER: BuildStatus[] = [
  BuildStatus.INTERNAL,
  BuildStatus.QA,
  BuildStatus.BETA,
  BuildStatus.RELEASE_CANDIDATE,
  BuildStatus.RELEASED,
  BuildStatus.DEPRECATED,
];

export const BUILD_STATUS_META: Record<BuildStatus, { label: string; color: string }> = {
  INTERNAL: { label: "Internal", color: "var(--bf-ink-muted)" },
  QA: { label: "QA", color: "var(--bf-brand)" },
  BETA: { label: "Beta", color: "var(--bf-status-warning)" },
  RELEASE_CANDIDATE: { label: "Release Candidate", color: "var(--bf-status-warning)" },
  RELEASED: { label: "Released", color: "var(--bf-status-good)" },
  DEPRECATED: { label: "Deprecated", color: "var(--bf-status-low)" },
};
