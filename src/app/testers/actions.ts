"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCanManageRoles } from "@/lib/permissions";
import type { TesterRole } from "@/generated/prisma/enums";

// The one place a role actually changes — gated to Admins only. Everything
// else in the app treats role as read-only data derived from this.
export async function updateTesterRole(testerId: string, role: TesterRole) {
  await assertCanManageRoles();
  await prisma.tester.update({ where: { id: testerId }, data: { role } });
  revalidatePath("/testers");
  revalidatePath(`/testers/${testerId}`);
}
