"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(id: string) {
  await prisma.notification.updateMany({ where: { id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { read: false, OR: [{ recipientId: null }, { recipientId: userId }] },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
