import { z, type ZodType } from "zod";

// Server Actions and Route Handlers are reachable by any client that can
// send the right POST, not just the app's own UI — TypeScript types are
// erased at runtime and give zero protection against a malformed or
// malicious direct request. Every schema below is the actual runtime
// boundary; each mutating entry point that accepts free-text or nested
// input parses through one of these before touching the database.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Parses `input` against `schema`, throwing a single-line ValidationError
// (safe to surface directly to the client — no stack traces, no internal
// detail) on the first failing field instead of Zod's full issue tree.
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    throw new ValidationError(`${field}${issue.message}`);
  }
  return result.data;
}

const nonEmptyId = z.string().trim().min(1, "Required");
const shortText = (max: number) => z.string().trim().min(1, "Required").max(max);
const longText = (max: number) => z.string().max(max);

// ── Bugs ─────────────────────────────────────────────────────────────────

export const createBugSchema = z.object({
  gameId: nonEmptyId,
  buildId: nonEmptyId,
  title: shortText(200),
  description: shortText(5000),
  severity: z.enum(["BLOCKER", "CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  priority: z.enum(["P0", "P1", "P2", "P3", "P4"]),
  areaId: z.string().trim().min(1).nullable(),
  platform: z.enum(["PC", "PLAYSTATION", "XBOX", "SWITCH", "MOBILE"]),
  stepsToReproduce: longText(4000),
  expectedResult: longText(2000),
  actualResult: longText(2000),
});

// ── Comments ─────────────────────────────────────────────────────────────

const commentAttachmentSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO", "LOG", "ATTACHMENT"]),
  url: z.url("Attachment url must be a real URL"),
  fileName: z.string().max(255).optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
});

export const createCommentSchema = z.object({
  bugId: nonEmptyId,
  body: shortText(10_000),
  parentId: z.string().trim().min(1).optional(),
  mentionIds: z.array(nonEmptyId).max(50),
  attachments: z.array(commentAttachmentSchema).max(10),
});

export const updateCommentSchema = z.object({
  id: nonEmptyId,
  bugId: nonEmptyId,
  body: shortText(10_000),
});

// ── Areas ────────────────────────────────────────────────────────────────

export const createAreaSchema = z.object({
  name: shortText(80),
  discipline: z
    .enum(["GAMEPLAY", "UI", "AUDIO", "PERFORMANCE", "NETWORKING", "ACCESSIBILITY", "LOCALIZATION"])
    .nullable(),
});

// ── Test cases ───────────────────────────────────────────────────────────

export const testCaseInputSchema = z.object({
  gameId: nonEmptyId,
  title: shortText(200),
  description: longText(2000),
  preconditions: longText(1000),
  steps: shortText(4000),
  expected: shortText(2000),
  categoryId: z.string().trim().min(1).nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  platform: z.enum(["PC", "PLAYSTATION", "XBOX", "SWITCH", "MOBILE"]),
});

// Bug.result/TestStepResult.result are plain unconstrained strings in the
// live schema (see prisma/schema.prisma), not a Prisma enum — the app only
// ever sends one of these four values from its own UI, but a direct POST
// to the action isn't bound by that, so this is the actual constraint.
const testResultSchema = z.enum(["PASS", "FAIL", "BLOCKED", "SKIPPED"]);

export const logTestRunSchema = z.object({
  testCaseId: nonEmptyId,
  sessionId: nonEmptyId,
  result: testResultSchema,
  notes: longText(2000),
});

export const executeTestCaseSchema = z.object({
  testCaseId: nonEmptyId,
  sessionId: nonEmptyId,
  steps: z
    .array(
      z.object({
        stepIndex: z.number().int().nonnegative(),
        stepText: z.string().max(2000),
        result: testResultSchema,
        notes: longText(2000),
      })
    )
    .min(1, "At least one step is required."),
});

// ── Auth ─────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  name: shortText(100),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const requestPasswordResetSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

// ── Attachment uploads ───────────────────────────────────────────────────

export const uploadContextSchema = z.enum(["comment", "evidence"]);
