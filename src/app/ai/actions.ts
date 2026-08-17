"use server";

import {
  getBugForAi,
  getGameBugsForDuplicateScan,
  getAreaRiskContext,
  getAreas,
  getLatestBuildVersion,
  type AiBugContext,
} from "@/lib/data";
import {
  suggestSeverity,
  suggestPriority,
  findDuplicateCandidates,
  reviewReproSteps,
  summarizeBug,
  identifyAffectedSystems,
  draftTestCaseFromBug,
  analyzeRegressionRisk,
  buildQuickAnalysis,
  type BugQuickAnalysis,
} from "@/lib/ai/heuristics";
import type { AiActionKey, AiResult, AnalyzeReport } from "@/lib/ai/types";
import type { DuplicateCandidate } from "@/lib/ai/heuristics";

export type AiBugHeader = {
  id: string;
  number: number;
  title: string;
  severity: AiBugContext["severity"];
  status: AiBugContext["status"];
  gameName: string;
  gameSlug: string;
};

// Lightweight bug lookup for the assistant panel's context bar — deliberately
// separate from getBugForAi so opening the panel never pulls the full
// heuristics payload before an action is actually run.
export async function getAiBugHeader(bugId: string): Promise<AiBugHeader | null> {
  const bug = await getBugForAi(bugId);
  if (!bug) return null;
  return {
    id: bug.id,
    number: bug.number,
    title: bug.title,
    severity: bug.severity,
    status: bug.status,
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

async function buildAnalyzeReport(bug: AiBugContext): Promise<AnalyzeReport> {
  const [duplicateCandidates, areaRisk, areas] = await Promise.all([
    getGameBugsForDuplicateScan(bug.gameId, bug.id),
    getAreaRiskContext(bug.gameId, bug.areaId, bug.id),
    getAreas(),
  ]);

  return {
    severity: suggestSeverity(bug),
    priority: suggestPriority(bug, areaRisk),
    topDuplicates: findDuplicateCandidates(bug, duplicateCandidates).slice(0, 3),
    affectedSystems: identifyAffectedSystems(bug, areas.map((a) => a.name)),
    regressionRisk: analyzeRegressionRisk(bug, areaRisk),
  };
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

    case "TEST_CASE":
      return { key: "TEST_CASE", data: draftTestCaseFromBug(bug) };

    case "REGRESSION_RISK": {
      const areaRisk = await getAreaRiskContext(bug.gameId, bug.areaId, bug.id);
      return { key: "REGRESSION_RISK", data: analyzeRegressionRisk(bug, areaRisk) };
    }
  }
}
