"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { BugStatus } from "@/generated/prisma/enums";

export async function bulkUpdateBugStatus(ids: string[], status: BugStatus) {
  if (ids.length === 0) return;
  await prisma.bug.updateMany({ where: { id: { in: ids } }, data: { status } });
  revalidatePath("/bugs");
  revalidatePath("/");
}

export async function bulkDeleteBugs(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.bug.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/bugs");
  revalidatePath("/");
}
