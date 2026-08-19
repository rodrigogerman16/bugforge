"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_PICKER_OPTIONS } from "@/lib/relationships";
import { createNotification, getBugNumber } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/data";
import { hasCapability, PermissionError } from "@/lib/permissions";

// Linking/unlinking two bugs isn't a single-bug edit — "own bug" doesn't
// map cleanly onto a relationship spanning two bugs — so this checks the
// same EDIT_BUG_FIELDS capability a QA Tester/QA Lead/Admin has, without
// the per-bug ownership restriction that capability otherwise carries.
async function assertCanManageRelationships() {
  const user = await getCurrentUser();
  if (!hasCapability(user.role, "EDIT_BUG_FIELDS")) {
    throw new PermissionError("Your role can't link or unlink bugs.");
  }
  return user;
}

export async function createRelationship({
  currentBugId,
  targetBugId,
  pickerLabel,
}: {
  currentBugId: string;
  targetBugId: string;
  pickerLabel: string;
}) {
  await assertCanManageRelationships();
  if (currentBugId === targetBugId) return;

  const option = RELATIONSHIP_PICKER_OPTIONS.find((o) => o.label === pickerLabel);
  if (!option) return;

  const sourceBugId = option.swap ? targetBugId : currentBugId;
  const targetId = option.swap ? currentBugId : targetBugId;

  const existing = await prisma.bugRelationship.findUnique({
    where: { sourceBugId_targetBugId_type: { sourceBugId, targetBugId: targetId, type: option.type } },
  });
  if (existing) return;

  await prisma.bugRelationship.create({
    data: { sourceBugId, targetBugId: targetId, type: option.type },
  });

  // A bug is only ever "the regression" when it has a real REGRESSION_OF
  // link — isRegression is a denormalized mirror of that, kept in sync here
  // rather than a freestanding flag, so the regression banner always has a
  // real original bug to point at.
  if (option.type === "REGRESSION_OF") {
    const sourceBug = await prisma.bug.update({
      where: { id: sourceBugId },
      data: { isRegression: true },
      select: { title: true, createdAt: true, game: { select: { name: true } } },
    });
    const number = await getBugNumber(sourceBug.createdAt);
    await createNotification({
      type: "REGRESSION_DETECTED",
      title: "Regression detected",
      detail: `BUG-${number} — ${sourceBug.title} (${sourceBug.game.name})`,
      link: `/bugs/${sourceBugId}`,
    });
  }

  revalidatePath(`/bugs/${currentBugId}`);
  revalidatePath(`/bugs/${targetBugId}`);
}

export async function deleteRelationship({ id, currentBugId }: { id: string; currentBugId: string }) {
  await assertCanManageRelationships();
  const relationship = await prisma.bugRelationship.delete({ where: { id } }).catch(() => null);
  if (!relationship) return;

  if (relationship.type === "REGRESSION_OF") {
    const remaining = await prisma.bugRelationship.count({
      where: { sourceBugId: relationship.sourceBugId, type: "REGRESSION_OF" },
    });
    if (remaining === 0) {
      await prisma.bug.update({ where: { id: relationship.sourceBugId }, data: { isRegression: false } });
    }
  }

  revalidatePath(`/bugs/${currentBugId}`);
  revalidatePath(`/bugs/${relationship.sourceBugId}`);
  revalidatePath(`/bugs/${relationship.targetBugId}`);
}
