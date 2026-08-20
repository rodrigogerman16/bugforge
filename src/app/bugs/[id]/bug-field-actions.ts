"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { assertCanEditBugFields, assertCanChangeBugStatus, assertCanAssignBug } from "@/lib/auth/permissions";
import { createNotification } from "@/lib/db/notifications";
import { SEVERITY_RANK } from "@/lib/severity";
import { PRIORITY_RANK } from "@/lib/priority";
import { BUG_STATUS_RANK } from "@/lib/status-labels";
import type { BugStatus, BugPriority, BugSeverity } from "@/generated/prisma/enums";

function revalidateBug(bugId: string) {
  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/bugs");
  revalidatePath("/");
}

export async function updateBugStatus(bugId: string, status: BugStatus) {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: {
      number: true,
      status: true,
      title: true,
      reportedById: true,
      gameId: true,
      fixedInBuildId: true,
      verifiedInBuildId: true,
      game: { select: { name: true } },
    },
  });
  if (!bug || bug.status === status) return;
  const user = await assertCanChangeBugStatus(bug, status);

  // Reaching Fixed/Verified for the first time captures which build that
  // happened in — defaulting to the game's current latest build, since
  // that's what "fixed"/"verified" almost always means in practice. Stays
  // editable afterward (see updateBugFixedBuild/updateBugVerifiedBuild)
  // for the cases where that guess is wrong.
  const buildUpdate: { fixedInBuildId?: string; verifiedInBuildId?: string } = {};
  if (status === "FIXED" && !bug.fixedInBuildId) {
    const latestBuild = await prisma.build.findFirst({ where: { gameId: bug.gameId }, orderBy: { releasedAt: "desc" } });
    if (latestBuild) buildUpdate.fixedInBuildId = latestBuild.id;
  }
  if (status === "VERIFIED" && !bug.verifiedInBuildId) {
    if (bug.fixedInBuildId || buildUpdate.fixedInBuildId) {
      buildUpdate.verifiedInBuildId = buildUpdate.fixedInBuildId ?? bug.fixedInBuildId!;
    } else {
      const latestBuild = await prisma.build.findFirst({ where: { gameId: bug.gameId }, orderBy: { releasedAt: "desc" } });
      if (latestBuild) buildUpdate.verifiedInBuildId = latestBuild.id;
    }
  }

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { status, statusRank: BUG_STATUS_RANK[status], ...buildUpdate } }),
    prisma.activityEvent.create({
      data: { type: "STATUS_CHANGED", fromValue: bug.status, toValue: status, bugId, actorId: user.id },
    }),
  ]);

  if (status === "READY_FOR_QA") {
    await createNotification({
      type: "BUG_READY_FOR_QA",
      title: `BUG-${bug.number} marked Ready for QA`,
      detail: `${bug.title} — ${bug.game.name}`,
      link: `/bugs/${bugId}`,
    });
  }

  revalidateBug(bugId);
}

export async function updateBugPriority(bugId: string, priority: BugPriority) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { priority: true, reportedById: true } });
  if (!bug || bug.priority === priority) return;
  const user = await assertCanEditBugFields(bug);

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { priority, priorityRank: PRIORITY_RANK[priority] } }),
    prisma.activityEvent.create({
      data: { type: "PRIORITY_CHANGED", fromValue: bug.priority, toValue: priority, bugId, actorId: user.id },
    }),
  ]);

  revalidateBug(bugId);
}

export async function updateBugSeverity(bugId: string, severity: BugSeverity) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { severity: true, reportedById: true } });
  if (!bug || bug.severity === severity) return;
  const user = await assertCanEditBugFields(bug);

  await prisma.$transaction([
    prisma.bug.update({ where: { id: bugId }, data: { severity, severityRank: SEVERITY_RANK[severity] } }),
    prisma.activityEvent.create({
      data: { type: "SEVERITY_CHANGED", fromValue: bug.severity, toValue: severity, bugId, actorId: user.id },
    }),
  ]);

  revalidateBug(bugId);
}

export async function updateBugArea(bugId: string, areaId: string | null) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { reportedById: true } });
  if (!bug) return;
  await assertCanEditBugFields(bug);
  await prisma.bug.update({ where: { id: bugId }, data: { areaId } });
  revalidateBug(bugId);
}

export async function updateBugAssignee(bugId: string, assigneeId: string | null) {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: { number: true, assignedToId: true, title: true, game: { select: { name: true } } },
  });
  if (!bug || bug.assignedToId === assigneeId) return;
  const user = await assertCanAssignBug();

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
    await createNotification({
      type: "BUG_ASSIGNED",
      title: `BUG-${bug.number} assigned to you`,
      detail: `${bug.title} — ${bug.game.name}`,
      link: `/bugs/${bugId}`,
      recipientId: assigneeId,
    });
  }

  revalidateBug(bugId);
}

// Corrects the build a fix/verification was auto-attributed to (see
// updateBugStatus's default) — gated the same way setting that status
// would be, so a Developer can fix their own "fixed in" guess but can't
// touch "verified in" (Developers can't reach Verified at all), and a QA
// Tester/Lead can fix either at any time, matching who actually owns each
// half of the workflow.
export async function updateBugFixedBuild(bugId: string, buildId: string | null) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { reportedById: true } });
  if (!bug) return;
  await assertCanChangeBugStatus(bug, "FIXED");
  await prisma.bug.update({ where: { id: bugId }, data: { fixedInBuildId: buildId } });
  revalidateBug(bugId);
}

export async function updateBugVerifiedBuild(bugId: string, buildId: string | null) {
  const bug = await prisma.bug.findUnique({ where: { id: bugId }, select: { reportedById: true } });
  if (!bug) return;
  await assertCanChangeBugStatus(bug, "VERIFIED");
  await prisma.bug.update({ where: { id: bugId }, data: { verifiedInBuildId: buildId } });
  revalidateBug(bugId);
}
