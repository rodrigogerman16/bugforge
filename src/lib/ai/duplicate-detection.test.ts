import { describe, it, expect } from "vitest";
import { findDuplicateCandidates } from "@/lib/ai/duplicate-detection";
import type { DuplicateCandidateBug } from "@/lib/db";

function candidate(overrides: Partial<DuplicateCandidateBug> = {}): DuplicateCandidateBug {
  return {
    id: "c-1",
    number: 1,
    title: "",
    description: "",
    status: "NEW",
    severity: "MEDIUM",
    ...overrides,
  };
}

describe("findDuplicateCandidates", () => {
  it("surfaces a near-identical title as a strong match", () => {
    const results = findDuplicateCandidates(
      { title: "Character falls through the warehouse floor", description: "Happens after respawn near the loading dock." },
      [candidate({ id: "c-1", title: "Character falls through warehouse floor", description: "Happens after respawning near the loading dock." })]
    );
    expect(results).toHaveLength(1);
    expect(results[0].similarityPercent).toBeGreaterThan(50);
  });

  it("excludes bugs with no meaningful text overlap", () => {
    const results = findDuplicateCandidates(
      { title: "Character falls through the warehouse floor", description: "Happens after respawn." },
      [candidate({ id: "c-1", title: "Subtitle text overflows the dialogue box", description: "German localization only." })]
    );
    expect(results).toHaveLength(0);
  });

  it("ignores stopwords and short tokens rather than counting them toward overlap", () => {
    const results = findDuplicateCandidates(
      { title: "the a an and", description: "in on at to of" },
      [candidate({ id: "c-1", title: "the a an and", description: "in on at to of" })]
    );
    // Every token here is a stopword or too short, so both texts tokenize to
    // an empty set — Jaccard similarity of two empty sets is defined as 0,
    // not a false 100% match.
    expect(results).toHaveLength(0);
  });

  it("ranks results by similarity, most similar first", () => {
    const results = findDuplicateCandidates(
      { title: "Character falls through the warehouse floor after respawn", description: "Reproduced near the loading dock." },
      [
        candidate({ id: "weak", title: "Character animation looks slightly off after respawn", description: "Minor visual issue." }),
        candidate({ id: "strong", title: "Character falls through the warehouse floor after respawn", description: "Reproduced near the loading dock." }),
      ]
    );
    expect(results[0].id).toBe("strong");
    expect(results[0].similarityPercent).toBeGreaterThanOrEqual(results.at(-1)!.similarityPercent);
  });

  it("caps results at 5 even when more candidates clear the threshold", () => {
    const target = { title: "Character falls through the warehouse floor after respawn", description: "Reproduced near the loading dock area consistently." };
    const candidates = Array.from({ length: 8 }, (_, i) =>
      candidate({ id: `c-${i}`, title: "Character falls through the warehouse floor after respawn", description: "Reproduced near the loading dock area consistently." })
    );
    expect(findDuplicateCandidates(target, candidates)).toHaveLength(5);
  });
});
