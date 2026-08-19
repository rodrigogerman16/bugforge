"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTestCaseNumberMap, getNextBugNumber } from "@/lib/data";
import { assertCanManageTestCases, assertCanExecuteTests } from "@/lib/permissions";
import { testCaseInputSchema, logTestRunSchema, executeTestCaseSchema, parseOrThrow } from "@/lib/validation";
import {
  computeOverallResult,
  TEST_CASE_PRIORITY_TO_BUG_SEVERITY,
  TEST_CASE_PRIORITY_TO_BUG_PRIORITY,
} from "@/lib/test-case";
import { SEVERITY_RANK } from "@/lib/severity";
import { PRIORITY_RANK } from "@/lib/priority";
import { BUG_STATUS_RANK } from "@/lib/status-labels";
import type { TestCasePriority, Platform } from "@/generated/prisma/enums";

export type TestCaseInput = {
  gameId: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expected: string;
  categoryId: string | null;
  priority: TestCasePriority;
  platform: Platform;
};

async function assertGameSupportsPlatform(gameId: string, platform: Platform) {
  const supported = await prisma.gamePlatform.findUnique({
    where: { gameId_platform: { gameId, platform } },
  });
  if (!supported) throw new Error(`This game does not support ${platform}.`);
}

export async function createTestCase(rawInput: TestCaseInput) {
  const input = parseOrThrow(testCaseInputSchema, rawInput);
  await assertCanManageTestCases();
  await assertGameSupportsPlatform(input.gameId, input.platform);
  const testCase = await prisma.testCase.create({
    data: {
      gameId: input.gameId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      preconditions: input.preconditions.trim() || null,
      steps: input.steps.trim(),
      expected: input.expected.trim(),
      categoryId: input.categoryId,
      priority: input.priority,
      platform: input.platform,
    },
  });

  revalidatePath("/test-cases");
  return testCase.id;
}

export async function updateTestCase(id: string, rawInput: TestCaseInput) {
  const input = parseOrThrow(testCaseInputSchema, rawInput);
  await assertCanManageTestCases();
  await assertGameSupportsPlatform(input.gameId, input.platform);
  await prisma.testCase.update({
    where: { id },
    data: {
      title: input.title.trim(),
      description: input.description.trim() || null,
      preconditions: input.preconditions.trim() || null,
      steps: input.steps.trim(),
      expected: input.expected.trim(),
      categoryId: input.categoryId,
      priority: input.priority,
      platform: input.platform,
    },
  });

  revalidatePath("/test-cases");
  revalidatePath(`/test-cases/${id}`);
}

// Saves whichever AI-generated test case variants the tester approved — the
// approve step happens client-side (checkboxes), so by the time this runs
// every input here is one the tester explicitly chose to keep.
export async function createTestCasesBatch(rawInputs: TestCaseInput[]): Promise<string[]> {
  const inputs = rawInputs.map((raw) => parseOrThrow(testCaseInputSchema, raw));
  await assertCanManageTestCases();
  const uniqueGamePlatforms = new Set(inputs.map((i) => `${i.gameId}:${i.platform}`));
  await Promise.all(
    [...uniqueGamePlatforms].map((key) => {
      const [gameId, platform] = key.split(":");
      return assertGameSupportsPlatform(gameId, platform as Platform);
    })
  );

  const created = await Promise.all(
    inputs.map((input) =>
      prisma.testCase.create({
        data: {
          gameId: input.gameId,
          title: input.title.trim(),
          description: input.description.trim() || null,
          preconditions: input.preconditions.trim() || null,
          steps: input.steps.trim(),
          expected: input.expected.trim(),
          categoryId: input.categoryId,
          priority: input.priority,
          platform: input.platform,
        },
      })
    )
  );

  revalidatePath("/test-cases");
  return created.map((tc) => tc.id);
}

export async function deleteTestCase(id: string) {
  await assertCanManageTestCases();
  await prisma.testCase.delete({ where: { id } });
  revalidatePath("/test-cases");
}

export async function logTestRun(rawInput: {
  testCaseId: string;
  sessionId: string;
  result: string;
  notes: string;
}) {
  const { testCaseId, sessionId, result, notes } = parseOrThrow(logTestRunSchema, rawInput);
  const user = await assertCanExecuteTests();

  await prisma.testRun.create({
    data: {
      testCaseId,
      sessionId,
      testerId: user.id,
      result,
      notes: notes.trim() || null,
    },
  });

  revalidatePath(`/test-cases/${testCaseId}`);
  revalidatePath("/test-cases");
}

export type StepExecutionInput = { stepIndex: number; stepText: string; result: string; notes: string };

export async function executeTestCase(rawInput: {
  testCaseId: string;
  sessionId: string;
  steps: StepExecutionInput[];
}) {
  const { testCaseId, sessionId, steps } = parseOrThrow(executeTestCaseSchema, rawInput);

  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });
  if (!testCase) return null;

  const session = await prisma.qASession.findUnique({ where: { id: sessionId }, select: { buildId: true } });
  if (!session) return null;

  const user = await assertCanExecuteTests();
  const overallResult = computeOverallResult(steps.map((s) => s.result));

  const testRun = await prisma.testRun.create({
    data: {
      testCaseId,
      sessionId,
      testerId: user.id,
      result: overallResult,
      stepResults: {
        create: steps.map((s) => ({
          stepIndex: s.stepIndex,
          stepText: s.stepText,
          result: s.result,
          notes: s.notes.trim() || null,
        })),
      },
    },
  });

  let createdBug: { id: string; number: number } | null = null;

  // A failed execution automatically files a bug, carrying the actual
  // executed steps and failure notes forward as real content — not a
  // generic placeholder — so the test execution context is preserved.
  if (overallResult === "FAIL") {
    const failedSteps = steps.filter((s) => s.result === "FAIL");
    const actualResult = failedSteps
      .map((s) =>
        s.notes.trim()
          ? s.notes.trim()
          : `Step ${s.stepIndex + 1} ("${s.stepText}") failed during test execution.`
      )
      .join(" ");

    const testCaseNumberMap = await getTestCaseNumberMap();
    const testCaseNumber = testCaseNumberMap.get(testCaseId) ?? 0;
    const bugSeverity = TEST_CASE_PRIORITY_TO_BUG_SEVERITY[testCase.priority];
    const bugPriority = TEST_CASE_PRIORITY_TO_BUG_PRIORITY[testCase.priority];
    const number = await getNextBugNumber();

    const bug = await prisma.bug.create({
      data: {
        number,
        gameId: testCase.gameId,
        buildId: session.buildId,
        sessionId,
        title: `Failed: ${testCase.title}`,
        description: `Automatically created from a failed execution of TC-${String(testCaseNumber).padStart(5, "0")} (${testCase.title}).`,
        stepsToReproduce: steps.map((s) => `${s.stepIndex + 1}. ${s.stepText}`).join("\n"),
        expectedResult: testCase.expected,
        actualResult,
        severity: bugSeverity,
        severityRank: SEVERITY_RANK[bugSeverity],
        priority: bugPriority,
        priorityRank: PRIORITY_RANK[bugPriority],
        platform: testCase.platform,
        status: "NEW",
        statusRank: BUG_STATUS_RANK.NEW,
        areaId: testCase.categoryId,
        reportedById: user.id,
      },
    });

    await prisma.$transaction([
      prisma.activityEvent.create({ data: { type: "BUG_CREATED", bugId: bug.id, actorId: user.id } }),
      prisma.testRun.update({ where: { id: testRun.id }, data: { createdBugId: bug.id } }),
    ]);

    createdBug = { id: bug.id, number: bug.number };
  }

  revalidatePath(`/test-cases/${testCaseId}`);
  revalidatePath("/test-cases");
  if (createdBug) {
    revalidatePath(`/bugs/${createdBug.id}`);
    revalidatePath("/bugs");
  }

  return { overallResult, createdBug };
}
