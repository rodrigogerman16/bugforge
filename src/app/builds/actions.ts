"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { BuildStatus } from "@/generated/prisma/enums";

export async function updateBuildStatus(buildId: string, status: BuildStatus) {
  const build = await prisma.build.findUnique({ where: { id: buildId }, select: { status: true } });
  if (!build || build.status === status) return;

  await prisma.build.update({ where: { id: buildId }, data: { status } });

  revalidatePath("/builds");
  revalidatePath("/");
}
