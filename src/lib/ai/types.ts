import type {
  SeveritySuggestion,
  PrioritySuggestion,
  DuplicateCandidate,
  ReproStepsReview,
  BugSummary,
  AffectedSystem,
  TestCaseDraft,
  RegressionRiskAnalysis,
} from "@/lib/ai/heuristics";

export const AI_ACTIONS = [
  { key: "ANALYZE", label: "Analyze this bug", description: "Full triage report: severity, priority, duplicates, systems, and regression risk." },
  { key: "SEVERITY", label: "Suggest severity", description: "Score the technical impact from the bug's own text." },
  { key: "PRIORITY", label: "Suggest priority", description: "Score urgency from build status, tags, and area health — independent of severity." },
  { key: "DUPLICATES", label: "Find duplicate bugs", description: "Scan this game's bugs for text overlap." },
  { key: "REPRO_STEPS", label: "Improve reproduction steps", description: "Flag gaps and clean up phrasing." },
  { key: "SUMMARY", label: "Summarize bug", description: "A one-paragraph triage brief." },
  { key: "AFFECTED_SYSTEMS", label: "Identify affected systems", description: "Cross-reference the area taxonomy and tags." },
  { key: "TEST_CASE", label: "Generate test case", description: "Draft a regression-check test case from the repro steps." },
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
  | { key: "TEST_CASE"; data: TestCaseDraft }
  | { key: "REGRESSION_RISK"; data: RegressionRiskAnalysis };
