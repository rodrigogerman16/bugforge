// BugForge AI's provider — the one place that declares what actually powers
// every suggestion in this module tree. Today that's a heuristic engine, not
// a generative model: every result the other lib/ai/* modules produce is
// computed from a bug's own real fields (and, where noted, real sibling data
// queried alongside it) — never invented. That's a deliberate choice: it's
// free, instant, fully explainable, and never hallucinates a fact about a
// bug that isn't actually in the database. If BugForge AI ever calls a real
// LLM provider, that call belongs here (and nowhere else in lib/ai/*), so
// every other module keeps working against the same small surface.

export const AI_PROVIDER = {
  name: "heuristic",
  description: "Rule-based scoring and templated text over real application data. No external LLM calls.",
} as const;

export type Confidence = "low" | "medium" | "high";

// Assembles a bug's free-text fields into one lowercase blob for the
// pattern-matching heuristics in bug-analysis.ts to scan — the shared
// "what does this bug actually say" primitive every text-driven suggestion
// starts from.
export function bugText(bug: { title: string; description: string; actualResult: string | null; stepsToReproduce: string | null }): string {
  return `${bug.title} ${bug.description} ${bug.actualResult ?? ""} ${bug.stepsToReproduce ?? ""}`.toLowerCase();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function capitalizeFirst(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// Like capitalizeFirst, but also ensures the text ends with sentence
// punctuation — used wherever a fragment is rendered as a standalone step.
export function capitalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = capitalizeFirst(trimmed);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.!?]+$/, "");
}
