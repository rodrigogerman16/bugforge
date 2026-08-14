"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getBugNumberMap, getTestCaseNumberMap } from "@/lib/data";
import {
  computeOverallResult,
  TEST_CASE_PRIORITY_TO_BUG_SEVERITY,
  TEST_CASE_PRIORITY_TO_BUG_PRIORITY,
} from "@/lib/test-case";
import type { TestCasePriority, Platform } from "@/generated/prisma/enums";

export type TestCaseInput = {
  gameId: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expected: string;
  category: string;
  priority: TestCasePriority;
  platform: Platform;
};

export async function createTestCase(input: TestCaseInput) {
  const testCase = await prisma.testCase.create({
    data: {
      gameId: input.gameId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      preconditions: input.preconditions.trim() || null,
      steps: input.steps.trim(),
      expected: input.expected.trim(),
      category: input.category.trim() || null,
      priority: input.priority,
      platform: input.platform,
    },
  });

  revalidatePath("/test-cases");
  return testCase.id;
}

export async function updateTestCase(id: string, input: TestCaseInput) {
  await prisma.testCase.update({
    where: { id },
    data: {
      title: input.title.trim(),
      description: input.description.trim() || null,
      preconditions: input.preconditions.trim() || null,
      steps: input.steps.trim(),
      expected: input.expected.trim(),
      category: input.category.trim() || null,
      priority: input.priority,
      platform: input.platform,
    },
  });

  revalidatePath("/test-cases");
  revalidatePath(`/test-cases/${id}`);
}

export async function deleteTestCase(id: string) {
  await prisma.testCase.delete({ where: { id } });
  revalidatePath("/test-cases");
}

export async function logTestRun({
  testCaseId,
  sessionId,
  result,
  notes,
}: {
  testCaseId: string;
  sessionId: string;
  result: string;
  notes: string;
}) {
  const user = await getCurrentUser();

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

export async function executeTestCase({
  testCaseId,
  sessionId,
  steps,
}: {
  testCaseId: string;
  sessionId: string;
  steps: StepExecutionInput[];
}) {
  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });
  if (!testCase) return null;

  const session = await prisma.qASession.findUnique({ where: { id: sessionId }, select: { buildId: true } });
  if (!session) return null;

  const user = await getCurrentUser();
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

    const bug = await prisma.bug.create({
      data: {
        gameId: testCase.gameId,
        buildId: session.buildId,
        sessionId,
        title: `Failed: ${testCase.title}`,
        description: `Automatically created from a failed execution of TC-${String(testCaseNumber).padStart(5, "0")} (${testCase.title}).`,
        stepsToReproduce: steps.map((s) => `${s.stepIndex + 1}. ${s.stepText}`).join("\n"),
        expectedResult: testCase.expected,
        actualResult,
        severity: TEST_CASE_PRIORITY_TO_BUG_SEVERITY[testCase.priority],
        priority: TEST_CASE_PRIORITY_TO_BUG_PRIORITY[testCase.priority],
        status: "NEW",
        area: testCase.category,
        reportedById: user.id,
      },
    });

    await prisma.$transaction([
      prisma.activityEvent.create({ data: { type: "BUG_CREATED", bugId: bug.id, actorId: user.id } }),
      prisma.testRun.update({ where: { id: testRun.id }, data: { createdBugId: bug.id } }),
    ]);

    const bugNumberMap = await getBugNumberMap();
    createdBug = { id: bug.id, number: bugNumberMap.get(bug.id) ?? 0 };
  }

  revalidatePath(`/test-cases/${testCaseId}`);
  revalidatePath("/test-cases");
  if (createdBug) {
    revalidatePath(`/bugs/${createdBug.id}`);
    revalidatePath("/bugs");
  }

  return { overallResult, createdBug };
}
