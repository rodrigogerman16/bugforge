"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/data";
import { createNotification, getBugNumber } from "@/lib/notifications";
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

  const [comment] = await prisma.$transaction([
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

  // Every mentioned tester gets a personal notification — except the author,
  // if they mentioned themselves, since that isn't news to them.
  const recipients = [...new Set(mentionIds)].filter((id) => id !== user.id);
  if (recipients.length > 0) {
    const bug = await prisma.bug.findUnique({
      where: { id: bugId },
      select: { title: true, createdAt: true, game: { select: { name: true } } },
    });
    if (bug) {
      const number = await getBugNumber(bug.createdAt);
      const excerpt = trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
      for (const recipientId of recipients) {
        await createNotification({
          type: "COMMENT_MENTION",
          title: `${user.name} mentioned you`,
          detail: `BUG-${number} — ${bug.title}: "${excerpt}"`,
          link: `/bugs/${bugId}#comment-${comment.id}`,
          recipientId,
        });
      }
    }
  }

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
