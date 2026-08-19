"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertCanManageAreas } from "@/lib/permissions";
import { createAreaSchema, parseOrThrow } from "@/lib/validation";
import type { QADiscipline } from "@/generated/prisma/enums";

export async function createArea(rawInput: { name: string; discipline: QADiscipline | null }) {
  const { name, discipline } = parseOrThrow(createAreaSchema, rawInput);
  await assertCanManageAreas();
  const area = await prisma.area.create({
    data: { name: name.trim(), discipline: discipline ?? undefined },
  });

  revalidatePath("/areas");
  revalidatePath("/bugs");
  revalidatePath("/test-cases");
  revalidatePath("/coverage");
  return area.id;
}

export async function deleteArea(id: string) {
  await assertCanManageAreas();
  // Areas are referenced by bugs/test cases with onDelete: SetNull, so
  // deleting one un-tags its bugs/test cases rather than blocking or
  // cascading — the bugs and test cases themselves are never touched.
  await prisma.area.delete({ where: { id } });

  revalidatePath("/areas");
  revalidatePath("/bugs");
  revalidatePath("/test-cases");
  revalidatePath("/coverage");
}
