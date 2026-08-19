// The shared error-handling surface for every category item 69 names:
// database, auth, AI, upload, validation, network. Two jobs, kept
// deliberately separate:
//
// 1. logError() — the "appropriate logging" half. Structured, one line per
//    error, always includes the category so a real log aggregator (or just
//    `grep` over server logs) can filter by failure class. Server-side only
//    in practice (called from Server Actions/Route Handlers/error.tsx),
//    which is where a real error report belongs — never silently dropped.
// 2. toSafeMessage() — the "clear message" half. Maps a category + the raw
//    error to copy a user can actually act on, without leaking internals
//    (stack traces, SQL, provider error bodies) into the UI. ValidationError
//    messages are already user-safe by construction (see lib/validation)
//    and pass through unchanged; everything else gets a generic,
//    category-appropriate fallback.

export type ErrorCategory = "database" | "auth" | "ai" | "upload" | "validation" | "network" | "unknown";

export function logError(category: ErrorCategory, error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(
    `[bugforge:${category}] ${message}`,
    context ? { ...context, stack } : { stack }
  );
}

const CATEGORY_FALLBACK: Record<ErrorCategory, string> = {
  database: "Something went wrong reading or saving data. Nothing was changed — try again in a moment.",
  auth: "We couldn't verify your session. Try signing in again.",
  ai: "BugForge AI couldn't finish that request. The rest of the app is unaffected — try again.",
  upload: "That file couldn't be uploaded. Check the file and try again.",
  validation: "Some of what you entered isn't valid.",
  network: "The request couldn't reach the server. Check your connection and try again.",
  unknown: "Something unexpected happened. Try again, and reload the page if it keeps happening.",
};

// ValidationError messages (see lib/validation) are already written to be
// shown directly to a user — everything else, we don't trust to be
// presentable, so it's replaced with a fixed, category-appropriate message.
export function toSafeMessage(category: ErrorCategory, error: unknown): string {
  if (error instanceof Error && error.name === "ValidationError") {
    return error.message;
  }
  return CATEGORY_FALLBACK[category];
}
