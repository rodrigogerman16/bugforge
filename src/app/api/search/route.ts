import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const RESULTS_PER_TYPE = 5;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ bugs: [], testCases: [], builds: [], sessions: [], testers: [] });
  }

  const gameSelect = { select: { name: true, slug: true, coverColor: true } };

  const [bugs, testCases, builds, sessions, testers] = await Promise.all([
    prisma.bug.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { area: { name: { contains: q } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: RESULTS_PER_TYPE,
      select: { id: true, title: true, severity: true, status: true, game: gameSelect },
    }),
    prisma.testCase.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { category: { name: { contains: q } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: RESULTS_PER_TYPE,
      select: { id: true, title: true, category: { select: { name: true } }, game: gameSelect },
    }),
    prisma.build.findMany({
      where: {
        OR: [
          { version: { contains: q } },
          { branch: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      orderBy: { releasedAt: "desc" },
      take: RESULTS_PER_TYPE,
      select: { id: true, version: true, branch: true, game: gameSelect },
    }),
    prisma.qASession.findMany({
      where: { name: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: RESULTS_PER_TYPE,
      select: { id: true, name: true, status: true, game: gameSelect },
    }),
    prisma.tester.findMany({
      where: {
        OR: [{ name: { contains: q } }, { email: { contains: q } }],
      },
      orderBy: { name: "asc" },
      take: RESULTS_PER_TYPE,
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  return NextResponse.json({ bugs, testCases, builds, sessions, testers });
}
