"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/data";
import type { BugStatus, BugPriority, BugSeverity } from "@/generated/prisma/enums";

function revalidateBug(bugId: string) {
  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/bugs");
  revalidatePath("/");
}

export async function updateBugStatus(bugId: string, status: BugStatus) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { status: true } });
  if (!bug || bug.status === status) return;
  const user = await getCurrentUser();

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { status } }),
    prisma.activityEvent.create({
      data: { type: "STATUS_CHANGED", fromValue: bug.status, toValue: status, bugId, actorId: user.id },
    }),
  ]);

  revalidateBug(bugId);
}

export async function updateBugPriority(bugId: string, priority: BugPriority) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { priority: true } });
  if (!bug || bug.priority === priority) return;
  const user = await getCurrentUser();

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
  const user = await getCurrentUser();

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { severity } }),
    prisma.activityEvent.create({
      data: { type: "SEVERITY_CHANGED", fromValue: bug.severity, toValue: severity, bugId, actorId: user.id },
    }),
  ]);

  revalidateBug(bugId);
}

export async function updateBugAssignee(bugId: string, assigneeId: string | null) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { assignedToId: true } });
  if (!bug || bug.assignedToId === assigneeId) return;
  const user = await getCurrentUser();

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

  revalidateBug(bugId);
}
