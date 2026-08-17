import type { BugSeverity, BugPriority, BugStatus, TestCasePriority } from "@/generated/prisma/enums";
import type { AiBugContext, DuplicateCandidateBug, AreaRiskContext } from "@/lib/data";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { PLATFORM_LABEL } from "@/lib/platform";

// BugForge AI is a heuristic engine, not a generative model — every result
// below is computed from the bug's own real fields (and, where noted, real
// sibling data queried alongside it), never invented. That's a deliberate
// choice: it's free, instant, fully explainable, and never hallucinates a
// fact about a bug that isn't actually in the database.

function bugText(bug: AiBugContext): string {
  return `${bug.title} ${bug.description} ${bug.actualResult ?? ""} ${bug.stepsToReproduce ?? ""}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// Suggest severity
// ---------------------------------------------------------------------------

export type SeveritySuggestion = {
  current: BugSeverity;
  suggested: BugSeverity;
  changed: boolean;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};

const SEVERITY_UP_SIGNALS: { pattern: RegExp; delta: number; reason: string }[] = [
  { pattern: /\bcrash(es|ed|ing)?\b/, delta: -2, reason: "Mentions a crash." },
  { pattern: /\b(data|save)\s*(loss|corrupt(ed|ion)?)\b/, delta: -2, reason: "Mentions data loss or save corruption." },
  { pattern: /\b(can(no|')?t|unable to)\s*(progress|continue|proceed)|soft.?lock(ed)?|permanently stuck\b/, delta: -1.5, reason: "Blocks the player from progressing." },
  { pattern: /\bfreeze[sd]?|hang(s|ing)?|unresponsive|deadlock\b/, delta: -1.5, reason: "Mentions a freeze or hang." },
  { pattern: /\bexploit|out of bounds|infinite (money|health|ammo)\b/, delta: -1, reason: "Mentions an exploitable issue." },
  { pattern: /\bmemory leak|severe (lag|stutter)|frame ?rate drop|fps drop\b/, delta: -1, reason: "Mentions a significant performance regression." },
  { pattern: /\bdisconnect(s|ed|ion)?|desync(s|ed)?\b/, delta: -0.75, reason: "Mentions a multiplayer disconnect/desync." },
];

const SEVERITY_DOWN_SIGNALS: { pattern: RegExp; delta: number; reason: string }[] = [
  { pattern: /\bcosmetic|visual (glitch|artifact)|typo|misspelled|text overlap\b/, delta: 1.5, reason: "Sounds cosmetic/visual rather than functional." },
  { pattern: /\b(rare(ly)?|edge case|only (happens|occurs) once)\b/, delta: 0.5, reason: "Described as rare or an edge case." },
];

export function suggestSeverity(bug: AiBugContext): SeveritySuggestion {
  const text = bugText(bug);
  const currentRank = SEVERITY_ORDER.indexOf(bug.severity);
  let delta = 0;
  const reasons: string[] = [];

  for (const signal of [...SEVERITY_UP_SIGNALS, ...SEVERITY_DOWN_SIGNALS]) {
    if (signal.pattern.test(text)) {
      delta += signal.delta;
      reasons.push(signal.reason);
    }
  }
  if (bug.isRegression) {
    delta -= 0.5;
    reasons.push("This is a confirmed regression of a previously-fixed bug.");
  }

  const suggestedRank = Math.min(4, Math.max(0, Math.round(currentRank + delta)));
  const suggested = SEVERITY_ORDER[suggestedRank];
  const changed = suggested !== bug.severity;

  const matchStrength = Math.abs(delta);
  const confidence: SeveritySuggestion["confidence"] =
    reasons.length === 0 ? "low" : matchStrength >= 1.5 ? "high" : "medium";

  if (reasons.length === 0) {
    reasons.push(`No strong severity signals found in the bug text — ${SEVERITY_META[bug.severity].label} looks reasonable as-is.`);
  }

  return { current: bug.severity, suggested, changed, confidence, reasons };
}

// ---------------------------------------------------------------------------
// Suggest priority — deliberately NOT a lookup from severity (see the
// BugPriority schema comment: severity is technical impact, priority is
// urgency to work, and the two can diverge). Severity is one weighted input
// among several independent signals below.
// ---------------------------------------------------------------------------

export type PrioritySuggestion = {
  current: BugPriority;
  suggested: BugPriority;
  changed: boolean;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};

export function suggestPriority(bug: AiBugContext, areaRisk: AreaRiskContext): PrioritySuggestion {
  const severityRank = SEVERITY_ORDER.indexOf(bug.severity); // 0 (Blocker) .. 4 (Low)
  let score = (4 - severityRank) * 0.3; // severity contributes at most 1.2 of the total
  const reasons: string[] = [];
  let independentSignals = 0;

  if (bug.tags.includes("release-blocker")) {
    score += 2.5;
    independentSignals++;
    reasons.push('Tagged "release-blocker".');
  }
  if (bug.isRegression || bug.tags.includes("regression-risk")) {
    score += 1;
    independentSignals++;
    reasons.push(bug.isRegression ? "Confirmed regression — previously fixed, now broken again." : 'Tagged "regression-risk".');
  }
  if (bug.buildStatus === "RELEASE_CANDIDATE" || bug.buildStatus === "RELEASED") {
    score += 1;
    independentSignals++;
    reasons.push(`Found on a ${bug.buildStatus === "RELEASED" ? "released" : "release-candidate"} build — little runway left before players see it.`);
  } else if (bug.buildStatus === "INTERNAL") {
    score -= 0.5;
    reasons.push("Found on an internal build — there's time before this ships.");
  }
  if (areaRisk.openBugsInArea >= 8) {
    score += 0.5;
    independentSignals++;
    reasons.push(`${areaRisk.openBugsInArea} other open bugs in ${bug.areaName ?? "this area"} — an unstable area worth prioritizing.`);
  }
  if (["FIXED", "READY_FOR_QA", "VERIFIED"].includes(bug.status)) {
    score -= 0.5;
    reasons.push(`Already ${BUG_STATUS_META[bug.status].label.toLowerCase()} — work is already underway or done.`);
  }

  reasons.unshift(`${SEVERITY_META[bug.severity].label} severity contributes a baseline pull toward urgency.`);

  const priorityRank = score >= 3.5 ? 0 : score >= 2.5 ? 1 : score >= 1.5 ? 2 : score >= 0.5 ? 3 : 4;
  const suggested = PRIORITY_ORDER[priorityRank];
  const changed = suggested !== bug.priority;
  const confidence: PrioritySuggestion["confidence"] = independentSignals === 0 ? "low" : independentSignals === 1 ? "medium" : "high";

  return { current: bug.priority, suggested, changed, confidence, reasons };
}

// ---------------------------------------------------------------------------
// Find duplicate bugs — token-overlap (Jaccard) similarity over title +
// description, restricted to the same game. No ML, no embeddings — just a
// real, explainable text-overlap score.
// ---------------------------------------------------------------------------

export type DuplicateCandidate = {
  id: string;
  number: number;
  title: string;
  status: BugStatus;
  severity: BugSeverity;
  similarityPercent: number;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "of", "for", "with", "is", "are", "was",
  "were", "be", "been", "this", "that", "it", "its", "after", "when", "while", "during", "from", "into",
  "not", "no", "does", "doesnt", "cant", "cannot", "into", "than", "then", "if", "as", "by",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.12;
const DUPLICATE_RESULT_LIMIT = 5;

export function findDuplicateCandidates(
  target: { title: string; description: string },
  candidates: DuplicateCandidateBug[]
): DuplicateCandidate[] {
  // The title is repeated so it counts roughly twice as heavily as the
  // description in the overlap score — two bugs with the same title but
  // unrelated descriptions should still surface as likely duplicates.
  const targetTokens = tokenize(`${target.title} ${target.title} ${target.description}`);

  return candidates
    .map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      status: c.status,
      severity: c.severity,
      similarityPercent: Math.round(jaccardSimilarity(targetTokens, tokenize(`${c.title} ${c.title} ${c.description}`)) * 100),
    }))
    .filter((c) => c.similarityPercent >= DUPLICATE_SIMILARITY_THRESHOLD * 100)
    .sort((a, b) => b.similarityPercent - a.similarityPercent)
    .slice(0, DUPLICATE_RESULT_LIMIT);
}

// ---------------------------------------------------------------------------
// Improve reproduction steps — a QA-process linter, not a rewrite engine: it
// flags real gaps (missing steps, vague timing, non-imperative phrasing) and
// returns a cleaned, consistently-numbered version of what's already there.
// ---------------------------------------------------------------------------

export type ReproStepIssue = { level: "error" | "warning"; message: string };
export type ReproStepsReview = {
  issues: ReproStepIssue[];
  originalSteps: string[];
  cleanedSteps: string[];
};

const IMPERATIVE_STARTERS = new Set([
  "start", "enter", "open", "go", "move", "walk", "run", "jump", "attack", "equip", "engage", "enable",
  "disable", "load", "save", "press", "hold", "select", "navigate", "trigger", "respawn", "die", "take",
  "complete", "approach", "interact", "wait", "observe", "check", "confirm", "kill", "hit", "cast", "fire",
  "aim", "switch", "join", "host", "invite", "pause", "resume", "exit", "quit", "restart", "reconnect",
  "sprint", "climb", "drop", "pick", "craft", "build", "place", "use", "activate", "deactivate",
]);

export function reviewReproSteps(bug: { stepsToReproduce: string | null; expectedResult: string | null; actualResult: string | null }): ReproStepsReview {
  const originalSteps = (bug.stepsToReproduce ?? "")
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  const issues: ReproStepIssue[] = [];

  if (originalSteps.length === 0) {
    issues.push({ level: "error", message: "No reproduction steps recorded — add the exact sequence of actions that triggers the issue." });
  } else if (originalSteps.length < 2) {
    issues.push({ level: "warning", message: "Only one step listed — this is rarely enough to reliably reproduce an issue." });
  }

  originalSteps.forEach((line, i) => {
    const firstWord = line.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    if (firstWord && !IMPERATIVE_STARTERS.has(firstWord)) {
      issues.push({
        level: "warning",
        message: `Step ${i + 1} ("${line}") doesn't read as a direct action — start with what the tester should do, e.g. "Enter", "Equip", "Press".`,
      });
    }
    if (/\b(sometimes|randomly|occasionally|may|might|often)\b/i.test(line)) {
      issues.push({
        level: "warning",
        message: `Step ${i + 1} describes an intermittent trigger — note how often it happens (e.g. "roughly 1 in 5 attempts") so testers know when to stop retrying.`,
      });
    }
  });

  if (!bug.expectedResult) issues.push({ level: "warning", message: "No expected result recorded — state what should happen if this were working correctly." });
  if (!bug.actualResult) issues.push({ level: "warning", message: "No actual result recorded — state exactly what happens instead." });

  const cleanedSteps = originalSteps.map((line) => {
    const trimmed = line.trim();
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
  });

  return { issues, originalSteps, cleanedSteps };
}

// ---------------------------------------------------------------------------
// Summarize bug — a templated triage brief assembled entirely from the
// bug's own structured fields, never a paraphrase of free text.
// ---------------------------------------------------------------------------

export type BugSummary = { paragraph: string; facts: { label: string; value: string }[] };

export function summarizeBug(bug: AiBugContext): BugSummary {
  const ageDays = Math.max(0, Math.floor((Date.now() - bug.createdAt.getTime()) / 86_400_000));
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "1 day ago" : `${ageDays} days ago`;

  const sentences = [
    `${SEVERITY_META[bug.severity].label}-severity bug in ${bug.areaName ?? "an unassigned area"} on ${bug.gameName} (${PLATFORM_LABEL[bug.platform]}, build ${bug.buildVersion}).`,
    `Reported ${ageLabel}, currently ${BUG_STATUS_META[bug.status].label}.`,
  ];
  if (bug.map && bug.gameMode) sentences.push(`Occurs during ${bug.gameMode} on ${bug.map}.`);
  if (bug.isRegression) sentences.push("This is a confirmed regression of a previously-fixed bug.");
  sentences.push(
    bug.evidenceCount > 0
      ? `${bug.evidenceCount} piece${bug.evidenceCount === 1 ? "" : "s"} of evidence attached.`
      : "No evidence attached."
  );
  if (bug.tags.length > 0) sentences.push(`Tagged: ${bug.tags.join(", ")}.`);

  return {
    paragraph: sentences.join(" "),
    facts: [
      { label: "Severity", value: SEVERITY_META[bug.severity].label },
      { label: "Priority", value: PRIORITY_META[bug.priority].label },
      { label: "Status", value: BUG_STATUS_META[bug.status].label },
      { label: "Area", value: bug.areaName ?? "Unassigned" },
      { label: "Platform", value: PLATFORM_LABEL[bug.platform] },
      { label: "Build", value: bug.buildVersion },
      { label: "Age", value: ageLabel },
    ],
  };
}

// ---------------------------------------------------------------------------
// Identify affected systems — starts from the bug's own Area, then scans its
// text for other real Area names and cross-references known system tags.
// ---------------------------------------------------------------------------

export type AffectedSystem = { name: string; confidence: "primary" | "possible"; reason: string };

const TAG_SYSTEM_HINTS: Record<string, string> = {
  audio: "Audio",
  networking: "Networking",
  performance: "Performance",
  "ui-polish": "UI",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function identifyAffectedSystems(bug: AiBugContext, allAreaNames: string[]): AffectedSystem[] {
  const systems: AffectedSystem[] = [];
  if (bug.areaName) {
    systems.push({ name: bug.areaName, confidence: "primary", reason: "The bug is filed against this area." });
  }

  const text = bugText(bug);
  for (const areaName of allAreaNames) {
    if (areaName === bug.areaName) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(areaName.toLowerCase())}\\b`);
    if (pattern.test(text)) {
      systems.push({ name: areaName, confidence: "possible", reason: `"${areaName}" is mentioned in the bug's description or steps.` });
    }
  }

  for (const tag of bug.tags) {
    const mapped = TAG_SYSTEM_HINTS[tag];
    if (mapped && !systems.some((s) => s.name === mapped)) {
      systems.push({ name: mapped, confidence: "possible", reason: `Tagged "${tag}".` });
    }
  }

  if (systems.length === 0) {
    systems.push({ name: "Unassigned", confidence: "possible", reason: "No area set and no other systems detected in the text — triage to assign an area." });
  }
  return systems;
}

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
  };
}

// ---------------------------------------------------------------------------
// Analyze regression risk
// ---------------------------------------------------------------------------

export type RegressionRiskBand = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export const REGRESSION_RISK_META: Record<RegressionRiskBand, { label: string; color: string }> = {
  LOW: { label: "Low", color: "var(--bf-status-good)" },
  MODERATE: { label: "Moderate", color: "var(--bf-status-warning)" },
  HIGH: { label: "High", color: "var(--bf-brand)" },
  SEVERE: { label: "Severe", color: "var(--bf-status-critical)" },
};

export type RegressionRiskAnalysis = { band: RegressionRiskBand; score: number; reasons: string[] };

export function analyzeRegressionRisk(bug: AiBugContext, areaRisk: AreaRiskContext): RegressionRiskAnalysis {
  let score = 0;
  const reasons: string[] = [];

  if (bug.isRegression) {
    score += 3;
    reasons.push("This bug is already a confirmed regression of a previously-fixed bug.");
  }
  if (areaRisk.regressionCountInArea > 0) {
    score += Math.min(2, areaRisk.regressionCountInArea * 0.5);
    reasons.push(
      `${areaRisk.regressionCountInArea} other confirmed regression${areaRisk.regressionCountInArea === 1 ? "" : "s"} recorded in ${bug.areaName ?? "this area"}.`
    );
  }
  if (areaRisk.openBugsInArea >= 8) {
    score += 1;
    reasons.push(`${areaRisk.openBugsInArea} other open bugs in ${bug.areaName ?? "this area"} — signals area instability.`);
  }
  if (bug.buildStatus === "RELEASE_CANDIDATE" || bug.buildStatus === "RELEASED") {
    score += 1;
    reasons.push(`Found on a ${bug.buildStatus === "RELEASED" ? "released" : "release-candidate"} build — little room to catch a reoccurrence before players see it.`);
  }
  if (bug.tags.includes("regression-risk")) {
    score += 1;
    reasons.push('Tagged "regression-risk" by QA.');
  }
  if (reasons.length === 0) {
    reasons.push(`No historical regression pattern or systemic signal found in ${bug.areaName ?? "this area"}.`);
  }

  const band: RegressionRiskBand = score >= 4 ? "SEVERE" : score >= 2.5 ? "HIGH" : score >= 1 ? "MODERATE" : "LOW";
  return { band, score, reasons };
}
