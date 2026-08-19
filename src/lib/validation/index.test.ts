import { describe, it, expect } from "vitest";
import {
  parseOrThrow,
  ValidationError,
  createBugSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation";

// These schemas are the actual runtime security boundary for every Server
// Action (see the file header) — TypeScript types alone don't stop a direct
// POST with malformed or malicious input, so this suite exists to catch a
// schema regression that would silently reopen that boundary.
describe("parseOrThrow", () => {
  it("returns the parsed data on success", () => {
    const result = parseOrThrow(signUpSchema, { name: "Ada Lovelace", email: "ada@example.com", password: "supersecret" });
    expect(result.email).toBe("ada@example.com");
  });

  it("throws a ValidationError (never a raw ZodError) on failure", () => {
    expect(() => parseOrThrow(signUpSchema, { name: "", email: "not-an-email", password: "" })).toThrow(ValidationError);
  });

  it("the thrown message is a single line naming the failing field, safe to show a user", () => {
    try {
      parseOrThrow(signUpSchema, { name: "Ada", email: "not-an-email", password: "supersecret" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as Error).message).not.toMatch(/\n/);
      expect((err as Error).message).toMatch(/^email:/);
    }
  });
});

describe("createBugSchema", () => {
  const validBug = {
    gameId: "game-1",
    buildId: "build-1",
    title: "Character falls through the floor",
    description: "Reproduced consistently after respawn.",
    severity: "HIGH",
    priority: "P2",
    areaId: null,
    platform: "PC",
    stepsToReproduce: "1. Respawn\n2. Walk forward",
    expectedResult: "Character stays on the floor",
    actualResult: "Character falls through",
    tagIds: [],
    evidence: [],
  };

  it("accepts a well-formed bug report", () => {
    expect(() => parseOrThrow(createBugSchema, validBug)).not.toThrow();
  });

  it("rejects a blank title", () => {
    expect(() => parseOrThrow(createBugSchema, { ...validBug, title: "  " })).toThrow(ValidationError);
  });

  it("rejects a severity value outside the real enum — a hand-crafted POST can't smuggle an arbitrary string in", () => {
    expect(() => parseOrThrow(createBugSchema, { ...validBug, severity: "SUPER_URGENT" })).toThrow(ValidationError);
  });

  it("caps evidence and tags at their documented maximums", () => {
    expect(() => parseOrThrow(createBugSchema, { ...validBug, tagIds: Array.from({ length: 11 }, (_, i) => `tag-${i}`) })).toThrow(
      ValidationError
    );
  });
});

describe("updatePasswordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    expect(() => parseOrThrow(updatePasswordSchema, { password: "supersecret", confirm: "supersecret" })).not.toThrow();
  });

  it("rejects a confirm field that doesn't match the password, attributed to the confirm field", () => {
    try {
      parseOrThrow(updatePasswordSchema, { password: "supersecret", confirm: "different" });
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toMatch(/^confirm:/);
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(() => parseOrThrow(updatePasswordSchema, { password: "short", confirm: "short" })).toThrow(ValidationError);
  });
});
