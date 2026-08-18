"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCanWrite } from "@/lib/permissions";
import { createNotification, getBugNumber } from "@/lib/notifications";
import type { BugStatus, BugPriority, BugSeverity } from "@/generated/prisma/enums";

function revalidateBug(bugId: string) {
  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/bugs");
  revalidatePath("/");
}

export async function updateBugStatus(bugId: string, status: BugStatus) {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: { status: true, title: true, createdAt: true, game: { select: { name: true } } },
  });
  if (!bug || bug.status === status) return;
  const user = await assertCanWrite();

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { status } }),
    prisma.activityEvent.create({
      data: { type: "STATUS_CHANGED", fromValue: bug.status, toValue: status, bugId, actorId: user.id },
    }),
  ]);

  if (status === "READY_FOR_QA") {
    const number = await getBugNumber(bug.createdAt);
    await createNotification({
      type: "BUG_READY_FOR_QA",
      title: `BUG-${number} marked Ready for QA`,
      detail: `${bug.title} — ${bug.game.name}`,
      link: `/bugs/${bugId}`,
    });
  }

  revalidateBug(bugId);
}

export async function updateBugPriority(bugId: string, priority: BugPriority) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { priority: true } });
  if (!bug || bug.priority === priority) return;
  const user = await assertCanWrite();

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { priority } }),
    prisma.activityEvent.create({
      data: { type: "PRIORITY_CHANGED", fromValue: bug.priority, toValue: priority, bugId, actorId: user.id },
    }),
  ]);

  revalidateBug(bugId);
}

export async function updateBugSeverity(bugId: string, severity: BugSeverity) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { severity: true } });
  if (!bug || bug.severity === severity) return;
  const user = await assertCanWrite();

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { severity } }),
    prisma.activityEvent.create({
      data: { type: "SEVERITY_CHANGED", fromValue: bug.severity, toValue: severity, bugId, actorId: user.id },
    }),
  ]);

  revalidateBug(bugId);
}

export async function updateBugArea(bugId: string, areaId: string | null) {
  await assertCanWrite();
  await prisma.bug.update({ where: { id: bugId }, data: { areaId } });
  revalidateBug(bugId);
}

export async function updateBugAssignee(bugId: string, assigneeId: string | null) {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: { assignedToId: true, title: true, createdAt: true, game: { select: { name: true } } },
  });
  if (!bug || bug.assignedToId === assigneeId) return;
  const user = await assertCanWrite();

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { assignedToId: assigneeId } }),
    prisma.activityEvent.create({
      data: {
        type: assigneeId ? "ASSIGNED" : "UNASSIGNED",
        fromValue: bug.assignedToId,
        targetTesterId: assigneeId,
        bugId,
        actorId: user.id,
      },
    }),
  ]);

  if (assigneeId) {
    const number = await getBugNumber(bug.createdAt);
    await createNotification({
      type: "BUG_ASSIGNED",
      title: `BUG-${number} assigned to you`,
      detail: `${bug.title} — ${bug.game.name}`,
      link: `/bugs/${bugId}`,
      recipientId: assigneeId,
    });
  }

  revalidateBug(bugId);
}
