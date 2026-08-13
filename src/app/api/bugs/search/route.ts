import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBugNumberMap } from "@/lib/data";

const RESULTS_LIMIT = 8;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const excludeId = url.searchParams.get("excludeId") ?? undefined;

  if (q.length < 1) {
    return NextResponse.json({ bugs: [] });
  }

  const [bugs, numberMap] = await Promise.all([
    prisma.bug.findMany({
      where: {
        AND: [
          excludeId ? { id: { not: excludeId } } : {},
          { title: { contains: q } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: RESULTS_LIMIT,
      select: { id: true, title: true, severity: true, status: true, game: { select: { name: true } } },
    }),
    getBugNumberMap(),
  ]);

  return NextResponse.json({
    bugs: bugs.map((bug) => ({ ...bug, number: numberMap.get(bug.id) ?? 0 })),
  });
}
