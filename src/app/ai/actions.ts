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
  type BugQuickAnalysis,
} from "@/lib/ai/bug-analysis";
import { findDuplicateCandidates, type DuplicateCandidate } from "@/lib/ai/duplicate-detection";
import { generateTestCaseMatrix } from "@/lib/ai/test-generation";
import { analyzeBuildReleaseRisk, type BuildReleaseRiskAnalysis } from "@/lib/ai/release-analysis";
import { composeAnalyzeReport, type AiActionKey, type AiResult, type AnalyzeReport } from "@/lib/ai/chat";

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

// Suggests a reproduction-steps scaffold for a bug that's still being
// drafted, from whatever short description the tester has typed so far.
export async function suggestReproStepsForDraft(gameId: string, text: string): Promise<string[]> {
  if (text.trim().length < 8) return [];
  const latestBuildVersion = await getLatestBuildVersion(gameId);
  return suggestReproSteps(text, latestBuildVersion);
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
