import { prisma } from "@/lib/db/prisma";
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

export type NotificationSummary = {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

// Every notification is a row created at the moment its real event happened
// (see the write sites in bugs/actions.ts, bug-field-actions.ts,
// relationship-actions.ts, and the seed script's backfill of the same five
// event types from data that already exists) — a null recipient is a
// team-wide event, a set recipient is personal to that tester.
export async function getNotifications(userId: string, limit = 30): Promise<NotificationSummary[]> {
  return prisma.notification.findMany({
    where: { OR: [{ recipientId: null }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, title: true, detail: true, link: true, read: true, createdAt: true },
  });
}
