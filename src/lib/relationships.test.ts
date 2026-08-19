import { describe, it, expect } from "vitest";
import { resolveRelationships, type RelationshipRow } from "@/lib/relationships";

function row(overrides: Partial<RelationshipRow> = {}): RelationshipRow {
  return {
    id: "rel-1",
    type: "REGRESSION_OF",
    sourceBugId: "bug-a",
    targetBugId: "bug-b",
    sourceBug: { id: "bug-a", number: 1, title: "Source bug", status: "NEW" },
    targetBug: { id: "bug-b", number: 2, title: "Target bug", status: "CLOSED" },
    ...overrides,
  };
}

describe("resolveRelationships", () => {
  it("shows the forward label and the other bug when viewed from the source side", () => {
    const [item] = resolveRelationships("bug-a", [row()]);
    expect(item.label).toBe("Regression of");
    expect(item.bug.id).toBe("bug-b");
  });

  it("shows the inverse label and the other bug when viewed from the target side", () => {
    const [item] = resolveRelationships("bug-b", [row()]);
    expect(item.label).toBe("Regressed by");
    expect(item.bug.id).toBe("bug-a");
  });

  it("picks the correct forward/inverse pair for every relationship type", () => {
    const cases: { type: RelationshipRow["type"]; forward: string; inverse: string }[] = [
      { type: "DUPLICATE", forward: "Duplicate of", inverse: "Duplicated by" },
      { type: "BLOCKS", forward: "Blocks", inverse: "Blocked by" },
      { type: "RELATED", forward: "Related to", inverse: "Related to" },
      { type: "CAUSED_BY", forward: "Caused by", inverse: "Causes" },
    ];
    for (const c of cases) {
      const r = row({ type: c.type });
      expect(resolveRelationships("bug-a", [r])[0].label).toBe(c.forward);
      expect(resolveRelationships("bug-b", [r])[0].label).toBe(c.inverse);
    }
  });

  it("resolves multiple rows independently, preserving order", () => {
    const rows = [row({ id: "rel-1" }), row({ id: "rel-2", targetBugId: "bug-c", targetBug: { id: "bug-c", number: 3, title: "Third bug", status: "NEW" } })];
    const items = resolveRelationships("bug-a", rows);
    expect(items.map((i) => i.id)).toEqual(["rel-1", "rel-2"]);
    expect(items[1].bug.id).toBe("bug-c");
  });
});
