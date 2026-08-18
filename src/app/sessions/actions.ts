"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCanWrite } from "@/lib/permissions";

export async function createSession({ gameId, buildId, name }: { gameId: string; buildId: string; name: string }) {
  await assertCanWrite();
  const session = await prisma.qASession.create({
    data: { gameId, buildId, name: name.trim() },
  });

  revalidatePath("/sessions");
  return session.id;
}

export async function updateSessionNotes(id: string, notes: string) {
  await assertCanWrite();
  await prisma.qASession.update({ where: { id }, data: { notes: notes.trim() || null } });

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
}

export async function startSession(id: string) {
  await assertCanWrite();
  const session = await prisma.qASession.findUnique({ where: { id }, select: { startedAt: true } });
  if (!session) return;

  await prisma.qASession.update({
    where: { id },
    data: { status: "ACTIVE", startedAt: session.startedAt ?? new Date() },
  });

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
}

export async function endSession(id: string) {
  await assertCanWrite();
  await prisma.qASession.update({
    where: { id },
    data: { status: "COMPLETED", endedAt: new Date() },
  });

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
}

export async function deleteSession(id: string) {
  await assertCanWrite();
  await prisma.qASession.delete({ where: { id } });
  revalidatePath("/sessions");
}
