// BugForge AI is a heuristic engine (see ../provider.ts) — it never calls an
// external LLM, so there are no natural-language prompts to template today.
// This directory exists so the AI abstraction's file layout is ready for
// that case: if a real model provider is ever wired in behind provider.ts,
// its prompt templates belong here, one file per concern (e.g.
// bug-analysis.prompts.ts), not inlined into the analysis modules that call
// them.
export {};
