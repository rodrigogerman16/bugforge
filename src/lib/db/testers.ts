import { prisma } from "@/lib/db/prisma";
import { BugStatus, type TesterRole } from "@/generated/prisma/enums";
import { reproductionQualityPercent } from "@/lib/tester";
import { groupActivityByDay, type ActivityEventRow } from "@/lib/activity";
import { isSupabaseAuthConfigured } from "@/lib/auth";
import { createClient as createSupabaseServerClient } from "@/lib/auth/supabase/server";

// "Confirmed" here means the tester's own reported bugs that were validated
// as real (anything past NEW that wasn't REJECTED) — a reproduction-quality
// signal about their own reports, never a comparison against anyone else.
const REJECTED_BUG_STATUSES: BugStatus[] = [BugStatus.REJECTED];

export type TesterProfileSummary = {
  id: string;
  name: string;
  email: string;
  role: TesterRole;
  bugsReported: number;
  bugsConfirmed: number;
  bugsRejected: number;
  testCasesExecuted: number;
  reproductionQuality: number | null;
};

export async function getTesterProfiles(): Promise<TesterProfileSummary[]> {
  const [testers, bugCounts, testRunCounts] = await Promise.all([
    // Alphabetical, not sorted by any stat — this is a directory, not a
    // leaderboard.
    prisma.tester.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true } }),
    prisma.bug.groupBy({ by: ["reportedById", "status"], _count: { _all: true } }),
    prisma.testRun.groupBy({ by: ["testerId"], _count: { _all: true } }),
  ]);

  const testCaseCountByTester = new Map(testRunCounts.map((r) => [r.testerId, r._count._all]));

  return testers.map((tester) => {
    let bugsReported = 0;
    let bugsRejected = 0;
    let bugsConfirmed = 0;
    for (const row of bugCounts) {
      if (row.reportedById !== tester.id) continue;
      bugsReported += row._count._all;
      if (REJECTED_BUG_STATUSES.includes(row.status)) bugsRejected += row._count._all;
      else if (row.status !== BugStatus.NEW) bugsConfirmed += row._count._all;
    }

    return {
      id: tester.id,
      name: tester.name,
      email: tester.email,
      role: tester.role,
      bugsReported,
      bugsConfirmed,
      bugsRejected,
      testCasesExecuted: testCaseCountByTester.get(tester.id) ?? 0,
      reproductionQuality: reproductionQualityPercent(bugsConfirmed, bugsRejected),
    };
  });
}

export type TesterActivityRow = ActivityEventRow & { bug: { id: string; number: number; title: string } };

export async function getTesterProfileDetail(id: string) {
  const tester = await prisma.tester.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!tester) return null;

  const [profiles, activityEvents] = await Promise.all([
    getTesterProfiles(),
    prisma.activityEvent.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        actor: { select: { id: true, name: true, role: true } },
        targetTester: { select: { id: true, name: true, role: true } },
        bug: { select: { id: true, number: true, title: true } },
      },
    }),
  ]);

  const summary = profiles.find((p) => p.id === id);
  if (!summary) return null;

  const activity: TesterActivityRow[] = activityEvents;

  return { ...summary, activityByDay: groupActivityByDay(activity) };
}

// Resolves the real Supabase Auth session (once configured — see
// lib/auth.ts) to the Tester profile it belongs to, matched by email since
// Supabase Auth and this app's own database are two separate systems with
// no shared foreign keys. The first time a given auth identity is seen,
// either a new Tester row is provisioned (role defaults to the safest
// option, Viewer, until an Admin promotes them — see
// testers/[id]/role-actions.ts) or an existing seeded Tester with a
// matching email is linked to it via authUserId.
//
// Falls back to the pre-auth demo behavior (the seeded QA Lead) whenever
// Supabase Auth isn't configured yet, so the app stays fully usable while
// real credentials haven't been added to .env — see item 46/47's shared
// "build now, wire up credentials later" pattern.
export async function getCurrentUser() {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.email) {
      let tester = await prisma.tester.findUnique({ where: { email: authUser.email } });
      if (!tester) {
        const fullName = typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name.trim() : "";
        tester = await prisma.tester.create({
          data: {
            name: fullName || authUser.email.split("@")[0],
            email: authUser.email,
            role: "VIEWER",
            authUserId: authUser.id,
          },
        });
      } else if (tester.authUserId !== authUser.id) {
        tester = await prisma.tester.update({ where: { id: tester.id }, data: { authUserId: authUser.id } });
      }
      return tester;
    }
  }

  const tester = await prisma.tester.findFirst({
    where: { role: "QA_LEAD" },
    orderBy: { createdAt: "asc" },
  });
  return (
    tester ?? {
      id: "mock-user",
      name: "Guest QA",
      email: "guest@bugforge.dev",
      role: "QA_TESTER" as const,
    }
  );
}

export async function getTesters() {
  return prisma.tester.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}
