import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, BugSeverity, BugPriority, BugStatus, Platform, SessionStatus, TesterRole } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

import { AREAS } from "../src/lib/areas";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  return new Date(now - Math.floor(Math.random() * daysBack) * 86_400_000);
}

// Picks a random moment within the given day, `daysAgo` days back — callers pass
// a strictly decreasing `daysAgo` per build so releasedAt order always matches
// version order, unlike randomDate() whose overlapping ranges can invert it.
function randomDateOnDay(daysAgo: number): Date {
  const dayMs = 86_400_000;
  const now = Date.now();
  return new Date(now - daysAgo * dayMs + Math.floor(Math.random() * dayMs));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

const BUG_TITLES: Record<string, string[]> = {
  Combat: [
    "Weapon damage not applied after parry",
    "Player stuck in attack animation after death",
    "Critical hits dealing zero damage vs shielded enemies",
  ],
  "UI/HUD": [
    "Health bar desyncs from actual HP after respawn",
    "Inventory tooltip clips off-screen at 21:9 resolution",
    "Objective marker points to wrong coordinates",
  ],
  Networking: [
    "Client desync causes duplicate loot drops",
    "Players rubberbanding on host migration",
    "Voice chat drops after 10 minutes in session",
  ],
  Physics: [
    "Ragdoll clips through terrain on steep slopes",
    "Vehicle flips uncontrollably on minor collision",
    "Player falls through elevator floor",
  ],
  Audio: [
    "Footstep audio missing on metal surfaces",
    "Music loop has audible pop at loop point",
    "Explosion SFX plays twice on kill",
  ],
  "AI/Enemies": [
    "Enemies stuck pathing around destructible cover",
    "Boss skips second phase transition",
    "Allies stop taking cover under fire",
  ],
  Progression: [
    "XP not saved if game closes during loading screen",
    "Skill tree points reset after prestige",
    "Daily challenge progress not tracked",
  ],
  Rendering: [
    "Texture flickering on distant foliage",
    "Shadow popping when rotating camera near buildings",
    "Particle effects cause frame drop below 30fps",
  ],
  "Save/Load": [
    "Save file corrupts after quitting during autosave",
    "Loadout not restored correctly on continue",
    "Cloud save conflicts overwrite local progress",
  ],
  Matchmaking: [
    "Matchmaking hangs indefinitely on party of 3",
    "Skill rating not updated after ranked match",
    "Region lock ignored, causing high ping matches",
  ],
};

const TEST_CASE_TEMPLATES: Record<
  string,
  { title: string; steps: string; expected: string }[]
> = {
  Combat: [
    {
      title: "Melee weapon deals listed damage to an unshielded enemy",
      steps: "1. Equip a melee weapon\n2. Engage an unshielded enemy\n3. Land a hit",
      expected: "Damage dealt matches the weapon's listed value",
    },
    {
      title: "Parry window blocks incoming melee damage",
      steps: "1. Face an attacking enemy\n2. Time a parry input on the incoming hit\n3. Confirm the outcome",
      expected: "Player takes zero damage and the enemy is staggered",
    },
  ],
  "UI/HUD": [
    {
      title: "Health bar reflects current HP immediately after respawn",
      steps: "1. Reduce HP\n2. Die and respawn\n3. Check the health bar",
      expected: "Health bar shows full HP with no desync",
    },
    {
      title: "Inventory tooltip stays fully on-screen at 21:9",
      steps: "1. Switch display to 21:9\n2. Open inventory\n3. Hover an item",
      expected: "Tooltip renders fully within the visible screen area",
    },
  ],
  Networking: [
    {
      title: "Loot drops are not duplicated after a client desync",
      steps: "1. Start a session with 2+ clients\n2. Force a brief desync\n3. Trigger a loot drop",
      expected: "Exactly one loot instance is granted per drop",
    },
    {
      title: "Host migration completes without rubberbanding",
      steps: "1. Start a session as host\n2. Disconnect the host client\n3. Observe migration to a new host",
      expected: "Players continue moving smoothly with no rubberbanding",
    },
  ],
  Physics: [
    {
      title: "Ragdolls stay above terrain on steep slopes",
      steps: "1. Defeat an enemy on a steep slope\n2. Observe the ragdoll settle",
      expected: "Ragdoll rests on the terrain surface without clipping through",
    },
    {
      title: "Vehicles remain stable on minor collisions",
      steps: "1. Drive a vehicle into a small obstacle at low speed\n2. Observe vehicle behavior",
      expected: "Vehicle absorbs the impact without flipping",
    },
  ],
  Audio: [
    {
      title: "Footstep audio plays correctly on metal surfaces",
      steps: "1. Walk onto a metal surface\n2. Listen for footstep audio",
      expected: "Metal-specific footstep audio plays on every step",
    },
    {
      title: "Music loop transitions without an audible pop",
      steps: "1. Let background music play through a full loop\n2. Listen at the loop point",
      expected: "Loop transition is seamless with no audible pop",
    },
  ],
  "AI/Enemies": [
    {
      title: "Enemies path around destructible cover correctly",
      steps: "1. Place destructible cover between player and enemy\n2. Aggro the enemy",
      expected: "Enemy paths around or through cover without getting stuck",
    },
    {
      title: "Boss completes its second phase transition",
      steps: "1. Reduce boss HP to the phase-2 threshold\n2. Observe the transition",
      expected: "Boss plays its phase-2 transition and enters phase 2",
    },
  ],
  Progression: [
    {
      title: "XP earned is saved if the game closes mid-loading-screen",
      steps: "1. Earn XP\n2. Trigger a loading screen\n3. Force-quit during the load",
      expected: "XP earned before the quit is persisted on next launch",
    },
    {
      title: "Skill tree points persist across a prestige reset",
      steps: "1. Allocate skill tree points\n2. Prestige\n3. Check skill tree points",
      expected: "Points behave per the documented prestige rules with no silent loss",
    },
  ],
  Rendering: [
    {
      title: "Distant foliage renders without flickering",
      steps: "1. View foliage at a distance\n2. Pan the camera slowly",
      expected: "Foliage renders stably with no flicker",
    },
    {
      title: "Frame rate stays above 30fps during a large particle effect",
      steps: "1. Trigger a large particle effect (e.g. an explosion)\n2. Monitor frame rate",
      expected: "Frame rate remains at or above 30fps",
    },
  ],
  "Save/Load": [
    {
      title: "Save file remains valid if the game quits during autosave",
      steps: "1. Trigger an autosave\n2. Force-quit while it is in progress\n3. Relaunch",
      expected: "Save file loads without corruption",
    },
    {
      title: "Loadout is restored correctly on continue",
      steps: "1. Set a custom loadout\n2. Quit to main menu\n3. Continue the save",
      expected: "Loadout matches what was equipped before quitting",
    },
  ],
  Matchmaking: [
    {
      title: "Matchmaking completes for a party of 3",
      steps: "1. Form a party of 3\n2. Queue for matchmaking",
      expected: "A match is found within the expected time window",
    },
    {
      title: "Skill rating updates after a ranked match",
      steps: "1. Complete a ranked match\n2. Check skill rating",
      expected: "Skill rating updates according to the match result",
    },
  ],
};

async function main() {
  console.log("Seeding BugForge...");

  await prisma.evidence.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.bug.deleteMany();
  await prisma.qASession.deleteMany();
  await prisma.build.deleteMany();
  await prisma.tester.deleteMany();
  await prisma.game.deleteMany();

  const testers = await Promise.all(
    [
      { name: "Sam Rivera", email: "sam.rivera@bugforge.dev", role: TesterRole.QA_LEAD },
      { name: "Priya Nair", email: "priya.nair@bugforge.dev", role: TesterRole.QA_ENGINEER },
      { name: "Jonas Weber", email: "jonas.weber@bugforge.dev", role: TesterRole.QA_ENGINEER },
      { name: "Mei Chen", email: "mei.chen@bugforge.dev", role: TesterRole.QA_ENGINEER },
      { name: "Diego Alvarez", email: "diego.alvarez@bugforge.dev", role: TesterRole.DEVELOPER },
      { name: "Harper Lee", email: "harper.lee@bugforge.dev", role: TesterRole.PRODUCER },
    ].map((t) => prisma.tester.create({ data: t }))
  );

  const games = await Promise.all([
    prisma.game.create({
      data: {
        name: "King of Meat",
        slug: "king-of-meat",
        platform: Platform.PC,
        coverColor: "#2a78d6",
        releaseDate: new Date("2026-10-15"),
      },
    }),
    prisma.game.create({
      data: {
        name: "Voidrunner Protocol",
        slug: "voidrunner-protocol",
        platform: Platform.PLAYSTATION,
        coverColor: "#6366f1",
        releaseDate: new Date("2027-02-20"),
      },
    }),
    prisma.game.create({
      data: {
        name: "Hollow Frontier",
        slug: "hollow-frontier",
        platform: Platform.SWITCH,
        coverColor: "#d6409f",
        releaseDate: new Date("2026-12-05"),
      },
    }),
  ]);

  for (const game of games) {
    const buildVersions = ["0.9.10-beta", "0.9.12-beta", "0.9.14-beta"];
    const builds = await Promise.all(
      buildVersions.map((version, i) =>
        prisma.build.create({
          data: {
            gameId: game.id,
            version,
            branch: i === buildVersions.length - 1 ? "release/beta" : "main",
            notes: `Automated seed build ${version}`,
            releasedAt: randomDateOnDay((buildVersions.length - 1 - i) * 10 + 1),
          },
        })
      )
    );

    const latestBuild = builds[builds.length - 1];

    const sessions = await Promise.all(
      [
        { name: "Beta Test #22", status: SessionStatus.COMPLETED, build: builds[0] },
        { name: "Beta Test #23", status: SessionStatus.COMPLETED, build: builds[1] },
        { name: "Beta Test #24", status: SessionStatus.ACTIVE, build: latestBuild },
      ].map((s) =>
        prisma.qASession.create({
          data: {
            gameId: game.id,
            buildId: s.build.id,
            name: s.name,
            status: s.status,
            startedAt: randomDate(20),
            endedAt: s.status === SessionStatus.COMPLETED ? randomDate(5) : null,
          },
        })
      )
    );

    const severityWeights: [BugSeverity, number][] = [
      [BugSeverity.BLOCKER, 2],
      [BugSeverity.CRITICAL, 5],
      [BugSeverity.HIGH, 18],
      [BugSeverity.MEDIUM, 40],
      [BugSeverity.LOW, 32],
    ];
    const weightedPool: BugSeverity[] = severityWeights.flatMap(([sev, count]) =>
      Array(count).fill(sev)
    );

    // Priority is rolled independently of severity (see schema comment) — a
    // weighted pool of its own, not derived from the bug's severity pick.
    const priorityWeights: [BugPriority, number][] = [
      [BugPriority.P0, 3],
      [BugPriority.P1, 8],
      [BugPriority.P2, 24],
      [BugPriority.P3, 35],
      [BugPriority.P4, 25],
    ];
    const priorityPool: BugPriority[] = priorityWeights.flatMap(([pri, count]) =>
      Array(count).fill(pri)
    );

    const statusPool = [
      BugStatus.NEW,
      BugStatus.CONFIRMED,
      BugStatus.IN_PROGRESS,
      BugStatus.FIXED,
      BugStatus.READY_FOR_QA,
      BugStatus.VERIFIED,
      BugStatus.CLOSED,
      BugStatus.REJECTED,
      BugStatus.DUPLICATE,
    ];
    const earlyPipelineStatuses: BugStatus[] = [
      BugStatus.NEW,
      BugStatus.CONFIRMED,
      BugStatus.IN_PROGRESS,
    ];

    const bugCount = 60 + Math.floor(Math.random() * 20);
    for (let i = 0; i < bugCount; i++) {
      const area = pick(AREAS);
      const title = pick(BUG_TITLES[area]);
      const severity = pick(weightedPool);
      const priority = pick(priorityPool);
      const build = pick(builds);
      const session = pick(sessions);
      const status = pick(statusPool);

      // Spread discovery over the last ~6.5 weeks so weekly metrics (bugs
      // discovered/fixed this week) have real, non-uniform data to compute from.
      const discoveredDaysAgo = Math.floor(Math.random() * 46);
      const isResolved = !earlyPipelineStatuses.includes(status);
      // A resolved bug's updatedAt (its fix date) can only be on or after its
      // createdAt (its discovery date) — never before.
      const resolvedDaysAgo = isResolved
        ? Math.floor(Math.random() * (discoveredDaysAgo + 1))
        : discoveredDaysAgo;

      // A small slice of bugs still in the early pipeline are regressions —
      // fixed once before, reopened after breaking again.
      const isRegression = earlyPipelineStatuses.includes(status) && Math.random() < 0.15;

      await prisma.bug.create({
        data: {
          gameId: game.id,
          buildId: build.id,
          sessionId: session.id,
          title,
          description: `Observed in ${area} while testing ${game.name} on build ${build.version}. Needs triage confirmation.`,
          stepsToReproduce: "1. Load into a live match\n2. Trigger the affected system\n3. Observe unexpected behavior",
          severity,
          priority,
          status,
          isRegression,
          area,
          reportedById: pick(testers).id,
          assignedToId: Math.random() > 0.3 ? pick(testers).id : null,
          createdAt: daysAgo(discoveredDaysAgo),
          updatedAt: daysAgo(resolvedDaysAgo),
        },
      });
    }

    const testCases = await Promise.all(
      AREAS.flatMap((area) =>
        TEST_CASE_TEMPLATES[area].map((tc) =>
          prisma.testCase.create({
            data: {
              gameId: game.id,
              title: tc.title,
              description: `Regression check for ${area.toLowerCase()} systems.`,
              steps: tc.steps,
              expected: tc.expected,
              area,
            },
          })
        )
      )
    );

    // ~75% pass / 15% fail / 5% blocked / 5% skipped — a believable pass rate
    // for a game still in active beta testing.
    const resultPool = [
      ...Array(15).fill("PASS"),
      ...Array(3).fill("FAIL"),
      ...Array(1).fill("BLOCKED"),
      ...Array(1).fill("SKIPPED"),
    ];

    for (const session of sessions) {
      const runsForSession = 10 + Math.floor(Math.random() * 8);
      for (let i = 0; i < runsForSession; i++) {
        const testCase = pick(testCases);
        const result = pick(resultPool);
        await prisma.testRun.create({
          data: {
            testCaseId: testCase.id,
            sessionId: session.id,
            testerId: pick(testers).id,
            result,
            notes: result === "FAIL" ? "Reproduced — filed as a bug for follow-up." : null,
            runAt: session.startedAt ?? new Date(),
          },
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
