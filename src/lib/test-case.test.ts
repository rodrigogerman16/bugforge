import { describe, it, expect } from "vitest";
import { deriveTestCaseStatus, computeOverallResult } from "@/lib/test-case";

describe("deriveTestCaseStatus", () => {
  it("maps each real run result to its status", () => {
    expect(deriveTestCaseStatus("PASS")).toBe("PASSING");
    expect(deriveTestCaseStatus("FAIL")).toBe("FAILING");
    expect(deriveTestCaseStatus("BLOCKED")).toBe("BLOCKED");
    expect(deriveTestCaseStatus("SKIPPED")).toBe("SKIPPED");
  });

  it("falls back to NOT_RUN for a test case with no runs yet", () => {
    expect(deriveTestCaseStatus(null)).toBe("NOT_RUN");
    expect(deriveTestCaseStatus(undefined)).toBe("NOT_RUN");
  });

  it("falls back to NOT_RUN for any unrecognized value rather than throwing", () => {
    expect(deriveTestCaseStatus("SOMETHING_UNEXPECTED")).toBe("NOT_RUN");
  });
});

describe("computeOverallResult", () => {
  it("passes only when every step passes", () => {
    expect(computeOverallResult(["PASS", "PASS", "PASS"])).toBe("PASS");
  });

  it("fails the whole run if a single step fails, regardless of position", () => {
    expect(computeOverallResult(["PASS", "FAIL", "PASS"])).toBe("FAIL");
    expect(computeOverallResult(["FAIL", "PASS", "PASS"])).toBe("FAIL");
  });

  it("ranks FAIL worse than BLOCKED worse than SKIPPED worse than PASS", () => {
    expect(computeOverallResult(["BLOCKED", "FAIL"])).toBe("FAIL");
    expect(computeOverallResult(["SKIPPED", "BLOCKED"])).toBe("BLOCKED");
    expect(computeOverallResult(["PASS", "SKIPPED"])).toBe("SKIPPED");
  });

  it("treats an empty step list as SKIPPED rather than a false PASS", () => {
    expect(computeOverallResult([])).toBe("SKIPPED");
  });
});
