import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/enums";

// The single write path every real event (a bug getting assigned, marked
// Ready for QA, discovered as Critical, or confirmed as a regression) goes
// through to create its notification — called from the server actions that
// perform those mutations, right alongside the mutation itself, so a
// notification can never exist without the real event that caused it.
export async function createNotification(input: {
  type: NotificationType;
  title: string;
  detail: string;
  link?: string;
  recipientId?: string | null;
}) {
  await prisma.notification.create({
    data: {
      type: input.type,
      title: input.title,
      detail: input.detail,
      link: input.link ?? null,
      recipientId: input.recipientId ?? null,
    },
  });
}
