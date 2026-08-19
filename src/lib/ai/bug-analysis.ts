import type { BugSeverity, BugPriority } from "@/generated/prisma/enums";
import type { AiBugContext, DuplicateCandidateBug, AreaRiskContext } from "@/lib/data";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { PLATFORM_LABEL } from "@/lib/platform";
import { bugText, escapeRegExp, capitalizeSentence, type Confidence } from "@/lib/ai/provider";
import { findDuplicateCandidates } from "@/lib/ai/duplicate-detection";

// ---------------------------------------------------------------------------
// Suggest severity
// ---------------------------------------------------------------------------

export type SeveritySuggestion = {
  current: BugSeverity;
  suggested: BugSeverity;
  changed: boolean;
  confidence: Confidence;
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
  const confidence: Confidence = reasons.length === 0 ? "low" : matchStrength >= 1.5 ? "high" : "medium";

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
  confidence: Confidence;
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
  const confidence: Confidence = independentSignals === 0 ? "low" : independentSignals === 1 ? "medium" : "high";

  return { current: bug.priority, suggested, changed, confidence, reasons };
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

// ---------------------------------------------------------------------------
// Recommend next test — a real, actionable retest suggestion: the game's own
// latest build plus a debug/diagnostic tool relevant to the bug's area. The
// tool mapping is a fixed lookup (not invented per bug); the build version is
// always the game's real latest build.
// ---------------------------------------------------------------------------

const AREA_DEBUG_TOOL: Record<string, string> = {
  physics: "collision debug visualization",
  movement: "collision debug visualization",
  combat: "hit-detection debug overlay",
  animation: "animation state debug overlay",
  audio: "audio debug overlay",
  graphics: "render debug overlay",
  networking: "network diagnostics overlay",
  performance: "performance profiler overlay",
  ui: "UI bounds/layout debug overlay",
  input: "input debug overlay",
  ai: "AI behavior debug overlay",
  accessibility: "accessibility debug overlay",
  localization: "localization debug overlay",
  gameplay: "verbose gameplay logging",
};

export function recommendNextTest(bug: AiBugContext, latestBuildVersion: string | null): string {
  const tool = (bug.areaName && AREA_DEBUG_TOOL[bug.areaName.toLowerCase()]) || "verbose logging";
  const buildLabel = latestBuildVersion ?? bug.buildVersion;
  return `Repeat on build ${buildLabel} with ${tool} enabled.`;
}

// ---------------------------------------------------------------------------
// Quick analysis — the compact, at-a-glance readout shown inline on the bug
// detail page itself (distinct from the fuller multi-duplicate/multi-system
// report the BugForge AI panel's "Analyze this bug" action produces): one
// likely subsystem, one possible duplicate, and one retest recommendation.
// ---------------------------------------------------------------------------

export type BugQuickAnalysis = {
  subsystem: { name: string; confidence: "primary" | "possible" } | null;
  severity: SeveritySuggestion;
  duplicate: { id: string; number: number; title: string; similarityPercent: number } | null;
  regressionProbability: RegressionRiskAnalysis;
  recommendedNextTest: string;
};

export function buildQuickAnalysis(
  bug: AiBugContext,
  duplicateCandidates: DuplicateCandidateBug[],
  areaRisk: AreaRiskContext,
  allAreaNames: string[],
  latestBuildVersion: string | null
): BugQuickAnalysis {
  const topSystem = identifyAffectedSystems(bug, allAreaNames)[0] ?? null;
  const topDuplicate = findDuplicateCandidates(bug, duplicateCandidates)[0] ?? null;

  return {
    subsystem: topSystem ? { name: topSystem.name, confidence: topSystem.confidence } : null,
    severity: suggestSeverity(bug),
    duplicate: topDuplicate
      ? { id: topDuplicate.id, number: topDuplicate.number, title: topDuplicate.title, similarityPercent: topDuplicate.similarityPercent }
      : null,
    regressionProbability: analyzeRegressionRisk(bug, areaRisk),
    recommendedNextTest: recommendNextTest(bug, latestBuildVersion),
  };
}

// ---------------------------------------------------------------------------
// Suggest reproduction steps — scaffolds a numbered repro sequence from a
// short free-text report. Deliberately does NOT invent specific locations,
// objects, or intermediate actions that weren't actually said: only the
// tester's own words and real data (the game's real latest build) appear in
// the output. What it adds is structure — a launch step, a navigate step
// built from whatever location phrase the text actually contains, the
// tester's own description as the repro action, and an observe step — a
// real head start the tester is expected to edit and flesh out, not a
// finished report.
// ---------------------------------------------------------------------------

const LOCATION_PREPOSITIONS = ["near", "inside", "within", "in", "at", "on", "by", "around"];
const LOCATION_PATTERN = new RegExp(
  `\\b(?:${LOCATION_PREPOSITIONS.join("|")})\\s+(?:the\\s+)?([a-z][a-z\\s'-]{2,30}?)(?=[.,;!?]|\\s+(?:and|while|when)\\b|$)`,
  "gi"
);

function extractLocationPhrase(text: string): string | null {
  const matches = [...text.matchAll(LOCATION_PATTERN)];
  if (matches.length === 0) return null;
  // The last spatial phrase in the sentence is usually the most specific
  // one ("near the eastern edge of the warehouse" over an earlier "in the
  // level"), so it wins over earlier matches.
  const phrase = matches[matches.length - 1][1].trim().split(/\s+/).slice(0, 4).join(" ");
  return phrase.length >= 3 ? phrase : null;
}

export function suggestReproSteps(rawText: string, latestBuildVersion: string | null): string[] {
  const cleaned = rawText.trim().replace(/\s+/g, " ");
  if (!cleaned) return [];

  const location = extractLocationPhrase(cleaned);
  const steps: string[] = [];

  steps.push(latestBuildVersion ? `Launch build ${latestBuildVersion}.` : "Launch the current build.");
  if (location) {
    steps.push(`Navigate to ${/^(the|a|an)\b/i.test(location) ? location : `the ${location}`}.`);
  }
  steps.push(`Attempt to reproduce: ${capitalizeSentence(cleaned)}`);
  steps.push("Observe whether the issue occurs as described.");

  return steps;
}

// ---------------------------------------------------------------------------
// Report quality score — an optional, advisory "is this a well-formed bug
// report" readout, shared by the report modal's live draft checklist (see
// BugCreateModal) and the "Report Quality" card on an already-saved bug's
// detail page. Same seven checks either way: not a suggestion to apply, not
// a gate on submitting or triaging — just an honest checklist of what a
// well-formed report needs, computed straight from the bug's own real
// fields. No field is scored on content it doesn't actually have.
// ---------------------------------------------------------------------------

export type BugReportQualityCheck = { key: string; label: string; met: boolean };
export type BugReportQuality = { score: number; checks: BugReportQualityCheck[] };

// Catches an explicit statement of how often the bug happens — "always",
// "about 1 in 5", "rarely", a bare percentage, etc. Deliberately narrow: it
// only recognizes real frequency language the tester actually wrote, never
// infers a frequency that isn't there.
const FREQUENCY_PATTERN =
  /\b(always|every time|consistently|constantly|sometimes|occasionally|intermittent(ly)?|randomly|rarely|repeatedly|once|\d{1,3}\s?%|\d+\s?(out of|\/)\s?\d+)\b/i;

export function assessBugReportQuality(report: {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  hasEnvironment: boolean;
  hasEvidence: boolean;
}): BugReportQuality {
  const { issues, originalSteps } = reviewReproSteps({
    stepsToReproduce: report.stepsToReproduce,
    expectedResult: report.expectedResult || null,
    actualResult: report.actualResult || null,
  });
  const frequencyText = `${report.title} ${report.description} ${report.stepsToReproduce} ${report.actualResult}`;

  const checks: BugReportQualityCheck[] = [
    {
      key: "repro",
      label: "Reproduction steps",
      met: originalSteps.length >= 2 && !issues.some((i) => i.level === "error"),
    },
    { key: "expected", label: "Expected result", met: report.expectedResult.trim().length > 0 },
    { key: "actual", label: "Actual result", met: report.actualResult.trim().length > 0 },
    { key: "environment", label: "Environment", met: report.hasEnvironment },
    { key: "evidence", label: "Evidence", met: report.hasEvidence },
    { key: "frequency", label: "Frequency", met: FREQUENCY_PATTERN.test(frequencyText) },
    { key: "title", label: "Clear title", met: report.title.trim().length >= 15 },
  ];

  const metCount = checks.filter((c) => c.met).length;
  return { score: Math.round((metCount / checks.length) * 100), checks };
}
