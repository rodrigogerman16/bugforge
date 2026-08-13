"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_PICKER_OPTIONS } from "@/lib/relationships";

export async function createRelationship({
  currentBugId,
  targetBugId,
  pickerLabel,
}: {
  currentBugId: string;
  targetBugId: string;
  pickerLabel: string;
}) {
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

  revalidatePath(`/bugs/${currentBugId}`);
  revalidatePath(`/bugs/${targetBugId}`);
}

export async function deleteRelationship({ id, currentBugId }: { id: string; currentBugId: string }) {
  const relationship = await prisma.bugRelationship.delete({ where: { id } }).catch(() => null);
  if (!relationship) return;

  revalidatePath(`/bugs/${currentBugId}`);
  revalidatePath(`/bugs/${relationship.sourceBugId}`);
  revalidatePath(`/bugs/${relationship.targetBugId}`);
}
