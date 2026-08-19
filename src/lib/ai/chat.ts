import type { AiBugContext, DuplicateCandidateBug, AreaRiskContext } from "@/lib/data";
import {
  suggestSeverity,
  suggestPriority,
  identifyAffectedSystems,
  analyzeRegressionRisk,
  type SeveritySuggestion,
  type PrioritySuggestion,
  type ReproStepsReview,
  type BugSummary,
  type AffectedSystem,
  type RegressionRiskAnalysis,
} from "@/lib/ai/bug-analysis";
import { findDuplicateCandidates, type DuplicateCandidate } from "@/lib/ai/duplicate-detection";
import type { TestCaseVariant } from "@/lib/ai/test-generation";

// The action catalog and result-composition layer behind the "BugForge AI"
// assistant drawer (see components/ai/ai-assistant-panel.tsx) — this is the
// closest thing this app has to a "chat" surface: pick a bug, pick an
// action, get a result. There's no free-text conversation because BugForge
// AI is a heuristic engine (see provider.ts), not a generative one, so
// there's nothing for a real chat turn to generate; the drawer is a fixed
// menu over the analysis functions in the other lib/ai/* modules instead.

export const AI_ACTIONS = [
  { key: "ANALYZE", label: "Analyze this bug", description: "Full triage report: severity, priority, duplicates, systems, and regression risk." },
  { key: "SEVERITY", label: "Suggest severity", description: "Score the technical impact from the bug's own text." },
  { key: "PRIORITY", label: "Suggest priority", description: "Score urgency from build status, tags, and area health — independent of severity." },
  { key: "DUPLICATES", label: "Find duplicate bugs", description: "Scan this game's bugs for text overlap." },
  { key: "REPRO_STEPS", label: "Improve reproduction steps", description: "Flag gaps and clean up phrasing." },
  { key: "SUMMARY", label: "Summarize bug", description: "A one-paragraph triage brief." },
  { key: "AFFECTED_SYSTEMS", label: "Identify affected systems", description: "Cross-reference the area taxonomy and tags." },
  { key: "TEST_CASE", label: "Generate test cases", description: "Draft a small spread of related test cases from the repro steps — you approve which ones to save." },
  { key: "REGRESSION_RISK", label: "Analyze regression risk", description: "Score this area's history of regressions." },
] as const;

export type AiActionKey = (typeof AI_ACTIONS)[number]["key"];

export type AnalyzeReport = {
  severity: SeveritySuggestion;
  priority: PrioritySuggestion;
  topDuplicates: DuplicateCandidate[];
  affectedSystems: AffectedSystem[];
  regressionRisk: RegressionRiskAnalysis;
};

export type AiResult =
  | { key: "ANALYZE"; data: AnalyzeReport }
  | { key: "SEVERITY"; data: SeveritySuggestion }
  | { key: "PRIORITY"; data: PrioritySuggestion }
  | { key: "DUPLICATES"; data: DuplicateCandidate[] }
  | { key: "REPRO_STEPS"; data: ReproStepsReview }
  | { key: "SUMMARY"; data: BugSummary }
  | { key: "AFFECTED_SYSTEMS"; data: AffectedSystem[] }
  | { key: "TEST_CASE"; data: TestCaseVariant[] }
  | { key: "REGRESSION_RISK"; data: RegressionRiskAnalysis };

// Powers the "ANALYZE" action — the one case that composes several other
// modules' results into a single report instead of returning one of them
// directly. Pure composition: every input is passed in already-fetched, so
// this has no data-access concerns of its own (those live in app/ai/actions.ts).
export function composeAnalyzeReport(
  bug: AiBugContext,
  duplicateCandidates: DuplicateCandidateBug[],
  areaRisk: AreaRiskContext,
  allAreaNames: string[]
): AnalyzeReport {
  return {
    severity: suggestSeverity(bug),
    priority: suggestPriority(bug, areaRisk),
    topDuplicates: findDuplicateCandidates(bug, duplicateCandidates).slice(0, 3),
    affectedSystems: identifyAffectedSystems(bug, allAreaNames),
    regressionRisk: analyzeRegressionRisk(bug, areaRisk),
  };
}
