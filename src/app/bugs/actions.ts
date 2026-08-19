"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCanCreateBug, assertCanBulkActOnBugs } from "@/lib/permissions";
import { createNotification, getBugNumber } from "@/lib/notifications";
import { createBugSchema, parseOrThrow } from "@/lib/validation";
import type { BugStatus, BugSeverity, BugPriority, Platform } from "@/generated/prisma/enums";

export type CreateBugInput = {
  gameId: string;
  buildId: string;
  title: string;
  description: string;
  severity: BugSeverity;
  priority: BugPriority;
  areaId: string | null;
  platform: Platform;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
};

async function assertGameSupportsPlatform(gameId: string, platform: Platform) {
  const supported = await prisma.gamePlatform.findUnique({
    where: { gameId_platform: { gameId, platform } },
  });
  if (!supported) throw new Error(`This game does not support ${platform}.`);
}

export async function createBug(rawInput: CreateBugInput): Promise<string> {
  const input = parseOrThrow(createBugSchema, rawInput);
  await assertGameSupportsPlatform(input.gameId, input.platform);
  const user = await assertCanCreateBug();

  const bug = await prisma.bug.create({
    data: {
      gameId: input.gameId,
      buildId: input.buildId,
      title: input.title.trim(),
      description: input.description.trim(),
      severity: input.severity,
      priority: input.priority,
      areaId: input.areaId,
      platform: input.platform,
      stepsToReproduce: input.stepsToReproduce.trim() || null,
      expectedResult: input.expectedResult.trim() || null,
      actualResult: input.actualResult.trim() || null,
      status: "NEW",
      reportedById: user.id,
    },
    include: { game: { select: { name: true } } },
  });

  await prisma.activityEvent.create({
    data: { type: "BUG_CREATED", bugId: bug.id, actorId: user.id },
  });

  if (bug.severity === "CRITICAL" || bug.severity === "BLOCKER") {
    const number = await getBugNumber(bug.createdAt);
    await createNotification({
      type: "CRITICAL_BUG",
      title: "Critical bug discovered",
      detail: `BUG-${number} — ${bug.title} (${bug.game.name})`,
      link: `/bugs/${bug.id}`,
    });
  }

  revalidatePath("/bugs");
  revalidatePath("/");
  return bug.id;
}

export async function bulkUpdateBugStatus(ids: string[], status: BugStatus) {
  await assertCanBulkActOnBugs();
  if (ids.length === 0) return;

  if (status === "READY_FOR_QA") {
    const bugs = await prisma.bug.findMany({
      where: { id: { in: ids }, status: { not: status } },
      select: { id: true, title: true, createdAt: true, game: { select: { name: true } } },
    });
    for (const bug of bugs) {
      const number = await getBugNumber(bug.createdAt);
      await createNotification({
        type: "BUG_READY_FOR_QA",
        title: `BUG-${number} marked Ready for QA`,
        detail: `${bug.title} — ${bug.game.name}`,
        link: `/bugs/${bug.id}`,
      });
    }
  }

  await prisma.bug.updateMany({ where: { id: { in: ids } }, data: { status } });
  revalidatePath("/bugs");
  revalidatePath("/");
}

export async function bulkDeleteBugs(ids: string[]) {
  await assertCanBulkActOnBugs();
  if (ids.length === 0) return;
  await prisma.bug.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/bugs");
  revalidatePath("/");
}
