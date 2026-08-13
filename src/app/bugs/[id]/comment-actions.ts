"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/data";
import type { EvidenceType } from "@/generated/prisma/enums";

export type CommentAttachmentInput = {
  type: EvidenceType;
  url: string;
  fileName?: string;
  fileSizeBytes?: number;
};

export async function createComment({
  bugId,
  body,
  parentId,
  mentionIds,
  attachments,
}: {
  bugId: string;
  body: string;
  parentId?: string;
  mentionIds: string[];
  attachments: CommentAttachmentInput[];
}) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const user = await getCurrentUser();

  await prisma.$transaction([
    prisma.comment.create({
      data: {
        bugId,
        body: trimmed,
        parentId: parentId || null,
        authorId: user.id,
        mentions: mentionIds.length ? { connect: mentionIds.map((id) => ({ id })) } : undefined,
        attachments: attachments.length ? { create: attachments } : undefined,
      },
    }),
    prisma.activityEvent.create({
      data: { type: "COMMENT_ADDED", bugId, actorId: user.id },
    }),
  ]);

  revalidatePath(`/bugs/${bugId}`);
}

export async function updateComment({ id, bugId, body }: { id: string; bugId: string; body: string }) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const user = await getCurrentUser();

  const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
  if (!comment || comment.authorId !== user.id) return;

  await prisma.comment.update({
    where: { id },
    data: { body: trimmed, editedAt: new Date() },
  });

  revalidatePath(`/bugs/${bugId}`);
}

export async function deleteComment({ id, bugId }: { id: string; bugId: string }) {
  const user = await getCurrentUser();
  const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
  if (!comment || comment.authorId !== user.id) return;

  // Cascades to replies, reactions, and attachments.
  await prisma.comment.delete({ where: { id } });

  revalidatePath(`/bugs/${bugId}`);
}

export async function toggleReaction({
  commentId,
  bugId,
  emoji,
}: {
  commentId: string;
  bugId: string;
  emoji: string;
}) {
  const user = await getCurrentUser();

  const existing = await prisma.reaction.findUnique({
    where: { commentId_testerId_emoji: { commentId, testerId: user.id, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { commentId, testerId: user.id, emoji } });
  }

  revalidatePath(`/bugs/${bugId}`);
}
