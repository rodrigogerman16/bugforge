// BugForge AI's provider — the one place that declares what actually powers
// every suggestion in this module tree, selected by the AI_PROVIDER env var
// (see .env). If BugForge AI ever calls a real LLM provider, that call and
// its provider-name branch belong here (and nowhere else in lib/ai/*), so
// every other module keeps working against the same small surface.
//
// The only provider implemented today is "mock": the rest of lib/ai/*
// (bug-analysis.ts, duplicate-detection.ts, test-generation.ts,
// release-analysis.ts, chat.ts) IS the mock provider's implementation — a
// heuristic engine, not a generative model. Every result it produces is
// computed from a bug's own real fields (and, where noted, real sibling
// data queried alongside it) — never invented. That's what makes the
// results "realistic": they're free, instant, fully explainable, and never
// hallucinate a fact about a bug that isn't actually in the database. It's
// also what makes the app work with zero setup — no API key, no billing —
// so the whole product can be developed and demoed without paid API access.
//
// getAiProviderName() always resolves to a supported provider, even if
// AI_PROVIDER is unset or names a provider that isn't implemented yet: it
// falls back to "mock" rather than throwing, so a missing/misconfigured key
// degrades gracefully instead of breaking every AI action in the app.

export type AiProviderName = "mock";

const SUPPORTED_AI_PROVIDERS: readonly AiProviderName[] = ["mock"];

export const AI_PROVIDER_META: Record<AiProviderName, { label: string; tagline: string }> = {
  mock: {
    label: "Mock",
    tagline: "Mock provider · heuristic, not generative",
  },
};

export function getAiProviderName(): AiProviderName {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (raw && SUPPORTED_AI_PROVIDERS.includes(raw as AiProviderName)) {
    return raw as AiProviderName;
  }
  return "mock";
}

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
