"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { GateOperator } from "@/generated/prisma/enums";

export async function updateQualityGate(
  id: string,
  data: { operator?: GateOperator; threshold?: number; enabled?: boolean }
) {
  await prisma.qualityGate.update({ where: { id }, data });
  revalidatePath("/settings");
  revalidatePath("/builds");
}
