import type { BugSeverity, TestCasePriority, Platform } from "@/generated/prisma/enums";
import type { AiBugContext } from "@/lib/data";
import { PLATFORM_LABEL } from "@/lib/platform";
import { capitalizeFirst, stripTrailingPunctuation } from "@/lib/ai/provider";
import { reviewReproSteps } from "@/lib/ai/bug-analysis";

// ---------------------------------------------------------------------------
// Generate test case — converts the bug's own (cleaned) repro steps into a
// regression-check test case draft, ready to hand to the test case form.
// ---------------------------------------------------------------------------

export type TestCaseDraft = {
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expected: string;
  priority: TestCasePriority;
  categoryId: string | null;
  platform: Platform;
};

const BUG_SEVERITY_TO_TEST_CASE_PRIORITY: Record<BugSeverity, TestCasePriority> = {
  BLOCKER: "CRITICAL",
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

export function draftTestCaseFromBug(bug: AiBugContext): TestCaseDraft {
  const { cleanedSteps } = reviewReproSteps(bug);
  const steps =
    cleanedSteps.length > 0
      ? cleanedSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : `1. Reproduce the conditions described in BUG-${bug.number}.`;
  const preconditions =
    bug.map && bug.gameMode
      ? `Player has access to ${bug.map} in ${bug.gameMode} mode.`
      : "Player is in a normal play session.";

  return {
    title: `Regression check: ${bug.title}`,
    description: `Verifies the fix for BUG-${bug.number} (${bug.title}) does not reoccur.`,
    preconditions,
    steps,
    expected: bug.expectedResult ?? `The issue described in BUG-${bug.number} no longer reproduces.`,
    priority: BUG_SEVERITY_TO_TEST_CASE_PRIORITY[bug.severity],
    categoryId: bug.areaId,
    platform: bug.platform,
  };
}

// ---------------------------------------------------------------------------
// Generate test case matrix — expands one bug into a small spread of related
// test cases (the "Normal X / X after respawn / X under multiplayer
// conditions / X at different frame rates" pattern a QA engineer would write
// by hand). Every variant reuses the bug's own real repro steps as its
// mechanical core; only the precondition and expected-result qualifier
// change per variant, and only dimensions that actually make sense for the
// bug's area are generated — never a "Localization at different frame
// rates" case. The one variant with a real functional difference (a
// different platform) only ever uses a platform the game actually supports.
// ---------------------------------------------------------------------------

export type TestCaseVariant = TestCaseDraft & { key: string };

const AREA_TOPIC: Record<string, string> = {
  physics: "collision",
  movement: "movement",
  combat: "combat",
  audio: "audio playback",
  networking: "network sync",
  graphics: "rendering",
  performance: "performance",
  ui: "UI layout",
  animation: "animation",
  input: "input handling",
  ai: "AI behavior",
  accessibility: "accessibility",
  localization: "localization",
  gameplay: "gameplay",
};

type VariationDimension = {
  key: string;
  applicableAreas: string[];
  buildTitle: (topic: string) => string;
  precondition: string;
  expectedSuffix: string;
  extraFirstStep?: string;
};

const VARIATION_DIMENSIONS: VariationDimension[] = [
  {
    key: "after_respawn",
    applicableAreas: ["physics", "combat", "movement", "gameplay", "ai"],
    buildTitle: (topic) => `${topic} after respawn`,
    precondition: "Player has just respawned.",
    expectedSuffix: " immediately after respawning.",
    extraFirstStep: "Respawn.",
  },
  {
    key: "multiplayer",
    applicableAreas: ["physics", "combat", "movement", "gameplay", "networking", "ai", "audio", "animation"],
    buildTitle: (topic) => `${topic} under multiplayer conditions`,
    precondition: "Player is in a multiplayer session with at least one other connected player.",
    expectedSuffix: " with other players present in the session.",
  },
  {
    key: "frame_rate",
    applicableAreas: ["physics", "movement", "animation", "graphics", "performance", "combat"],
    buildTitle: (topic) => `${topic} at different frame rates`,
    precondition: "Frame rate is varied (e.g. capped at 30/60/144 fps) using debug/profiling tools.",
    expectedSuffix: " consistently regardless of frame rate.",
  },
];

function renumberSteps(existingSteps: string, prependStep?: string): string {
  const parsed = existingSteps
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  const all = prependStep ? [prependStep, ...parsed] : parsed;
  return all.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

export function generateTestCaseMatrix(bug: AiBugContext, gameSupportedPlatforms: Platform[]): TestCaseVariant[] {
  const base = draftTestCaseFromBug(bug);
  const areaKey = bug.areaName?.toLowerCase() ?? null;
  const topic = (areaKey && AREA_TOPIC[areaKey]) || areaKey || "the reported issue";

  const variants: TestCaseVariant[] = [
    { ...base, key: "baseline", title: capitalizeFirst(`Normal ${topic}`) },
  ];

  for (const dim of VARIATION_DIMENSIONS) {
    if (!areaKey || !dim.applicableAreas.includes(areaKey)) continue;
    variants.push({
      ...base,
      key: dim.key,
      title: capitalizeFirst(dim.buildTitle(topic)),
      preconditions: dim.precondition,
      steps: dim.extraFirstStep ? renumberSteps(base.steps, dim.extraFirstStep) : base.steps,
      expected: `${stripTrailingPunctuation(base.expected)}${dim.expectedSuffix}`,
    });
  }

  const otherPlatform = gameSupportedPlatforms.find((p) => p !== bug.platform);
  if (otherPlatform) {
    variants.push({
      ...base,
      key: "other_platform",
      title: capitalizeFirst(`${topic} on ${PLATFORM_LABEL[otherPlatform]}`),
      platform: otherPlatform,
      expected: `${stripTrailingPunctuation(base.expected)} on ${PLATFORM_LABEL[otherPlatform]}.`,
    });
  }

  return variants;
}
