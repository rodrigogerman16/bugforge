"use server";

import {
  getBugForAi,
  getGameBugsForDuplicateScan,
  getAreaRiskContext,
  getAreas,
  getLatestBuildVersion,
  getGamePlatforms,
  getBuildRiskContext,
  type AiBugContext,
} from "@/lib/data";
import {
  suggestSeverity,
  suggestPriority,
  reviewReproSteps,
  summarizeBug,
  identifyAffectedSystems,
  analyzeRegressionRisk,
  buildQuickAnalysis,
  suggestReproSteps,
  assessBugReportQuality,
  type BugQuickAnalysis,
  type BugReportQuality,
  type SeveritySuggestion,
  type PrioritySuggestion,
} from "@/lib/ai/bug-analysis";
import { findDuplicateCandidates, type DuplicateCandidate } from "@/lib/ai/duplicate-detection";
import { generateTestCaseMatrix } from "@/lib/ai/test-generation";
import { analyzeBuildReleaseRisk, type BuildReleaseRiskAnalysis } from "@/lib/ai/release-analysis";
import { composeAnalyzeReport, type AiActionKey, type AiResult, type AnalyzeReport } from "@/lib/ai/chat";
import { capitalizeSentence } from "@/lib/ai/provider";
import type { BugSeverity, BuildStatus } from "@/generated/prisma/enums";

export type AiBugHeader = {
  id: string;
  number: number;
  title: string;
  severity: AiBugContext["severity"];
  status: AiBugContext["status"];
  gameId: string;
  gameName: string;
  gameSlug: string;
};

// Lightweight bug lookup for the assistant panel's context bar — deliberately
// separate from getBugForAi so opening the panel never pulls the full
// analysis payload before an action is actually run.
export async function getAiBugHeader(bugId: string): Promise<AiBugHeader | null> {
  const bug = await getBugForAi(bugId);
  if (!bug) return null;
  return {
    id: bug.id,
    number: bug.number,
    title: bug.title,
    severity: bug.severity,
    status: bug.status,
    gameId: bug.gameId,
    gameName: bug.gameName,
    gameSlug: bug.gameSlug,
  };
}

// Powers the compact "BugForge AI" analysis panel shown inline on the bug
// detail page — a smaller, five-field readout distinct from the fuller
// report the drawer's "Analyze this bug" action produces.
export async function getBugQuickAnalysis(bugId: string): Promise<BugQuickAnalysis | null> {
  const bug = await getBugForAi(bugId);
  if (!bug) return null;

  const [duplicateCandidates, areaRisk, areas, latestBuildVersion] = await Promise.all([
    getGameBugsForDuplicateScan(bug.gameId, bug.id),
    getAreaRiskContext(bug.gameId, bug.areaId, bug.id),
    getAreas(),
    getLatestBuildVersion(bug.gameId),
  ]);

  return buildQuickAnalysis(bug, duplicateCandidates, areaRisk, areas.map((a) => a.name), latestBuildVersion);
}

// Live duplicate search while a bug is still being drafted — same heuristic
// as the DUPLICATES action, just run against a title/description that
// hasn't been saved as a bug yet, so there's no bugId to key off of.
export async function searchDuplicateBugsForDraft(
  gameId: string,
  title: string,
  description: string
): Promise<DuplicateCandidate[]> {
  if (title.trim().length < 6) return [];
  const candidates = await getGameBugsForDuplicateScan(gameId);
  return findDuplicateCandidates({ title, description }, candidates);
}

export type BugDraftAiInput = {
  gameId: string;
  areaId: string | null;
  areaName: string | null;
  tags: string[];
  buildStatus: BuildStatus;
  title: string;
  description: string;
  severity: BugSeverity;
  stepsToReproduce: string;
  actualResult: string;
};

export type BugDraftAiSuggestions = {
  stepsToReproduce: string[];
  actualResult: string | null;
  area: { id: string; name: string; confidence: "primary" | "possible" } | null;
  severity: SeveritySuggestion;
  priority: PrioritySuggestion;
};

// Powers "Analyze with AI" on the bug report modal — the bug doesn't exist
// yet, so there's no bugId to key off of like every other AI action here.
// Every suggestion below is computed from the draft's own real field values
// (plus real sibling data: this area's open-bug/regression counts, this
// game's real areas and latest build) — the modal decides what to actually
// fill in from these, never silently overwriting something the tester
// already wrote. There's deliberately no "expected result" suggestion: what
// SHOULD happen isn't something BugForge AI can safely infer from a title
// and description without inventing a fact the tester never stated.
export async function analyzeBugDraft(input: BugDraftAiInput): Promise<BugDraftAiSuggestions> {
  const draftBug: AiBugContext = {
    id: "draft",
    number: 0,
    title: input.title,
    description: input.description,
    severity: input.severity,
    priority: "P2",
    status: "NEW",
    isRegression: false,
    platform: "PC",
    stepsToReproduce: input.stepsToReproduce || null,
    expectedResult: null,
    actualResult: input.actualResult || null,
    map: null,
    gameMode: null,
    createdAt: new Date(),
    evidenceCount: 0,
    tags: input.tags,
    gameId: input.gameId,
    gameName: "",
    gameSlug: "",
    areaId: input.areaId,
    areaName: input.areaName,
    areaDiscipline: null,
    buildVersion: "",
    buildStatus: input.buildStatus,
  };

  const [areaRisk, areas, latestBuildVersion] = await Promise.all([
    getAreaRiskContext(input.gameId, input.areaId),
    getAreas(),
    getLatestBuildVersion(input.gameId),
  ]);

  const stepsToReproduce = input.stepsToReproduce.trim()
    ? []
    : suggestReproSteps(`${input.title} ${input.description}`.trim(), latestBuildVersion);

  const actualResultSource = input.actualResult.trim() ? null : input.description.trim() || input.title.trim();
  const actualResult = actualResultSource ? capitalizeSentence(actualResultSource) : null;

  let area: BugDraftAiSuggestions["area"] = null;
  if (!input.areaId) {
    const topSystem = identifyAffectedSystems(draftBug, areas.map((a) => a.name))[0];
    const match = topSystem && areas.find((a) => a.name === topSystem.name);
    if (match) area = { id: match.id, name: match.name, confidence: topSystem.confidence };
  }

  return {
    stepsToReproduce,
    actualResult,
    area,
    severity: suggestSeverity(draftBug),
    priority: suggestPriority(draftBug, areaRisk),
  };
}

// The live "Report Quality" checklist on the report modal — a pure function
// of whatever the tester has typed so far (see assessBugReportQuality),
// kept behind a Server Action like every other AI computation rather than
// imported straight into the modal component.
export async function getBugDraftQuality(draft: {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  hasEnvironment: boolean;
  hasEvidence: boolean;
}): Promise<BugReportQuality> {
  return assessBugReportQuality(draft);
}

// The same "Report Quality" score, computed from an already-saved bug's
// real fields instead of an in-progress draft — powers the advisory Report
// Quality card on the bug detail page (see BugReportQualityCard). Optional
// and advisory only: nothing here blocks triage, assignment, or any status
// change.
export async function getBugQuality(bugId: string): Promise<BugReportQuality | null> {
  const bug = await getBugForAi(bugId);
  if (!bug) return null;
  return assessBugReportQuality({
    title: bug.title,
    description: bug.description,
    stepsToReproduce: bug.stepsToReproduce ?? "",
    expectedResult: bug.expectedResult ?? "",
    actualResult: bug.actualResult ?? "",
    hasEnvironment: Boolean(bug.buildVersion),
    hasEvidence: bug.evidenceCount > 0,
  });
}

// Powers the on-demand "Analyze build risk" panel on each build card.
export async function getBuildReleaseRisk(buildId: string): Promise<BuildReleaseRiskAnalysis | null> {
  const ctx = await getBuildRiskContext(buildId);
  if (!ctx) return null;
  return analyzeBuildReleaseRisk(ctx);
}

async function buildAnalyzeReport(bug: AiBugContext): Promise<AnalyzeReport> {
  const [duplicateCandidates, areaRisk, areas] = await Promise.all([
    getGameBugsForDuplicateScan(bug.gameId, bug.id),
    getAreaRiskContext(bug.gameId, bug.areaId, bug.id),
    getAreas(),
  ]);

  return composeAnalyzeReport(bug, duplicateCandidates, areaRisk, areas.map((a) => a.name));
}

export async function runAiAction(bugId: string, action: AiActionKey): Promise<AiResult | null> {
  const bug = await getBugForAi(bugId);
  if (!bug) return null;

  switch (action) {
    case "ANALYZE":
      return { key: "ANALYZE", data: await buildAnalyzeReport(bug) };

    case "SEVERITY":
      return { key: "SEVERITY", data: suggestSeverity(bug) };

    case "PRIORITY": {
      const areaRisk = await getAreaRiskContext(bug.gameId, bug.areaId, bug.id);
      return { key: "PRIORITY", data: suggestPriority(bug, areaRisk) };
    }

    case "DUPLICATES": {
      const candidates = await getGameBugsForDuplicateScan(bug.gameId, bug.id);
      return { key: "DUPLICATES", data: findDuplicateCandidates(bug, candidates) };
    }

    case "REPRO_STEPS":
      return { key: "REPRO_STEPS", data: reviewReproSteps(bug) };

    case "SUMMARY":
      return { key: "SUMMARY", data: summarizeBug(bug) };

    case "AFFECTED_SYSTEMS": {
      const areas = await getAreas();
      return { key: "AFFECTED_SYSTEMS", data: identifyAffectedSystems(bug, areas.map((a) => a.name)) };
    }

    case "TEST_CASE": {
      const gamePlatforms = await getGamePlatforms(bug.gameId);
      return { key: "TEST_CASE", data: generateTestCaseMatrix(bug, gamePlatforms) };
    }

    case "REGRESSION_RISK": {
      const areaRisk = await getAreaRiskContext(bug.gameId, bug.areaId, bug.id);
      return { key: "REGRESSION_RISK", data: analyzeRegressionRisk(bug, areaRisk) };
    }
  }
}
