"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/data";
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
