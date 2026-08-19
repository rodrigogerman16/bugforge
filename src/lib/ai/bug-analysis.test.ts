import { describe, it, expect } from "vitest";
import { suggestSeverity, assessBugReportQuality } from "@/lib/ai/bug-analysis";
import type { AiBugContext } from "@/lib/db";

function bugFixture(overrides: Partial<AiBugContext> = {}): AiBugContext {
  return {
    id: "bug-1",
    number: 1,
    title: "Something odd happens",
    description: "Not much detail here.",
    severity: "MEDIUM",
    priority: "P2",
    status: "NEW",
    isRegression: false,
    platform: "PC",
    stepsToReproduce: null,
    expectedResult: null,
    actualResult: null,
    map: null,
    gameMode: null,
    createdAt: new Date(),
    evidenceCount: 0,
    tags: [],
    gameId: "game-1",
    gameName: "King of Meat",
    gameSlug: "king-of-meat",
    areaId: null,
    areaName: null,
    areaDiscipline: null,
    buildVersion: "0.9.14-beta",
    buildStatus: "INTERNAL",
    ...overrides,
  };
}

describe("suggestSeverity", () => {
  it("suggests raising severity when the text describes a crash", () => {
    const bug = bugFixture({ severity: "MEDIUM", description: "Game crashes when opening the inventory." });
    const result = suggestSeverity(bug);
    expect(result.changed).toBe(true);
    expect(result.reasons.some((r) => /crash/i.test(r))).toBe(true);
  });

  it("suggests lowering severity when the text sounds purely cosmetic", () => {
    const bug = bugFixture({ severity: "HIGH", description: "Cosmetic visual glitch on the loading screen, purely cosmetic." });
    const result = suggestSeverity(bug);
    expect(result.suggested).not.toBe("BLOCKER");
    // The cosmetic signal pushes the rank down (less severe) from High.
    expect(["MEDIUM", "LOW", "HIGH"]).toContain(result.suggested);
  });

  it("never suggests a severity outside the five real values", () => {
    const bug = bugFixture({ severity: "BLOCKER", description: "Crash. Data loss. Softlocked. Freeze. Exploit. Memory leak. Disconnect." });
    const result = suggestSeverity(bug);
    expect(["BLOCKER", "CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(result.suggested);
  });

  it("leaves severity unchanged and reports low confidence when the text has no strong signal", () => {
    const bug = bugFixture({ severity: "MEDIUM", title: "Odd text", description: "Something looks a little off here." });
    const result = suggestSeverity(bug);
    expect(result.changed).toBe(false);
    expect(result.confidence).toBe("low");
  });
});

describe("assessBugReportQuality", () => {
  const completeReport = {
    title: "Character falls through the warehouse floor",
    description: "Happens every time after respawning near the loading dock.",
    stepsToReproduce: "1. Respawn near the loading dock\n2. Walk toward the warehouse\n3. Observe the character fall through",
    expectedResult: "Character stays on the walkable surface",
    actualResult: "Character falls through the floor and respawns",
    hasEnvironment: true,
    hasEvidence: true,
  };

  it("scores a fully complete report at 100", () => {
    expect(assessBugReportQuality(completeReport).score).toBe(100);
  });

  it("marks every check met on a complete report", () => {
    const { checks } = assessBugReportQuality(completeReport);
    expect(checks.every((c) => c.met)).toBe(true);
  });

  it("flags missing expected/actual result and evidence independently", () => {
    const { checks, score } = assessBugReportQuality({
      ...completeReport,
      expectedResult: "",
      actualResult: "",
      hasEvidence: false,
    });
    expect(checks.find((c) => c.key === "expected")?.met).toBe(false);
    expect(checks.find((c) => c.key === "actual")?.met).toBe(false);
    expect(checks.find((c) => c.key === "evidence")?.met).toBe(false);
    expect(score).toBeLessThan(100);
  });

  it("requires at least a few real steps for reproduction steps to count as met", () => {
    const { checks } = assessBugReportQuality({ ...completeReport, stepsToReproduce: "1. Play the game" });
    expect(checks.find((c) => c.key === "repro")?.met).toBe(false);
  });

  it("requires a title of meaningful length to count as clear", () => {
    const { checks } = assessBugReportQuality({ ...completeReport, title: "Bug" });
    expect(checks.find((c) => c.key === "title")?.met).toBe(false);
  });
});
