import type { RelationshipType } from "@/generated/prisma/enums";

// The label shown on sourceBug's page, reading toward targetBug.
export const RELATIONSHIP_FORWARD_LABEL: Record<RelationshipType, string> = {
  DUPLICATE: "Duplicate of",
  BLOCKS: "Blocks",
  RELATED: "Related to",
  REGRESSION_OF: "Regression of",
  CAUSED_BY: "Caused by",
};

// The label shown on targetBug's page, reading back toward sourceBug —
// always derived, never stored, so the two sides can't drift apart.
export const RELATIONSHIP_INVERSE_LABEL: Record<RelationshipType, string> = {
  DUPLICATE: "Duplicated by",
  BLOCKS: "Blocked by",
  RELATED: "Related to",
  REGRESSION_OF: "Regressed by",
  CAUSED_BY: "Causes",
};

// The six choices offered when linking a bug, from the current bug's point
// of view. Every option maps onto one of the five stored types; "Blocked
// by" is the only one that reverses source/target when persisted, since
// BLOCKS is always stored from the blocker's side.
export const RELATIONSHIP_PICKER_OPTIONS: { label: string; type: RelationshipType; swap: boolean }[] = [
  { label: "Duplicate of", type: "DUPLICATE", swap: false },
  { label: "Blocks", type: "BLOCKS", swap: false },
  { label: "Blocked by", type: "BLOCKS", swap: true },
  { label: "Related to", type: "RELATED", swap: false },
  { label: "Regression of", type: "REGRESSION_OF", swap: false },
  { label: "Caused by", type: "CAUSED_BY", swap: false },
];

export type RelationshipRow = {
  id: string;
  type: RelationshipType;
  sourceBugId: string;
  targetBugId: string;
  sourceBug: { id: string; number: number; title: string; status: string };
  targetBug: { id: string; number: number; title: string; status: string };
};

export type RelationshipDisplayItem = {
  id: string;
  label: string;
  bug: { id: string; number: number; title: string; status: string };
};

// Resolves each raw edge into a "from this bug's perspective" display item —
// picking the forward or inverse label depending on which side `bugId` is on.
export function resolveRelationships(bugId: string, rows: RelationshipRow[]): RelationshipDisplayItem[] {
  return rows.map((row) => {
    const isSource = row.sourceBugId === bugId;
    const other = isSource ? row.targetBug : row.sourceBug;
    const label = isSource ? RELATIONSHIP_FORWARD_LABEL[row.type] : RELATIONSHIP_INVERSE_LABEL[row.type];
    return { id: row.id, label, bug: other };
  });
}
