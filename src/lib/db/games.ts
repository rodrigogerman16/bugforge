import { prisma } from "@/lib/db/prisma";
import type { Platform, BuildStatus } from "@/generated/prisma/enums";
import { emptySeverityCounts, type SeverityCounts } from "@/lib/severity";
import { computeQualityScore, qualityBand, type QualityBand } from "@/lib/quality-score";
import { formatReleaseDate } from "@/lib/utils";
import type { QADiscipline } from "@/lib/coverage";
import { OPEN_STATUSES } from "./bugs";

export type GameSummary = {
  id: string;
  name: string;
  slug: string;
  platforms: Platform[];
  coverColor: string;
  latestBuild: { version: string; branch: string } | null;
  activeSession: { name: string; status: string } | null;
  bugTotal: number;
  openBugTotal: number;
  severityCounts: SeverityCounts;
  openSeverityCounts: SeverityCounts;
  qualityScore: number;
  qualityBand: QualityBand;
};

export async function getShellGames() {
  const games = await prisma.game.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      platforms: { select: { platform: true } },
      coverColor: true,
      releaseDate: true,
      builds: { orderBy: { releasedAt: "desc" }, take: 1, select: { id: true, version: true } },
      bugs: { select: { severity: true, status: true } },
    },
  });

  return games.map((game) => {
    const openCounts = emptySeverityCounts();
    for (const bug of game.bugs) {
      if (OPEN_STATUSES.includes(bug.status)) openCounts[bug.severity]++;
    }
    const qualityScore = computeQualityScore(openCounts);

    return {
      id: game.id,
      name: game.name,
      slug: game.slug,
      platforms: game.platforms.map((p) => p.platform),
      coverColor: game.coverColor,
      latestBuildId: game.builds[0]?.id ?? null,
      latestBuildVersion: game.builds[0]?.version ?? null,
      qualityScore,
      qualityBand: qualityBand(qualityScore),
      releaseDateLabel: formatReleaseDate(game.releaseDate),
    };
  });
}

export async function getGamesWithBuilds() {
  return prisma.game.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      builds: { orderBy: { releasedAt: "desc" }, select: { id: true, version: true } },
    },
  });
}

export type GameCreateOption = {
  id: string;
  name: string;
  slug: string;
  platforms: Platform[];
  builds: { id: string; version: string; status: BuildStatus }[];
};

// Everything the new-bug form needs about every game: which builds it has
// (a bug must be filed against a real one) and which platforms it supports
// (a bug's platform must be one of them — see the Platform Support feature).
// Build status rides along too — BugForge AI's "Analyze with AI" action
// needs it (severity/priority/regression-risk all weigh how close a build
// is to release) and it's already a real, free column on the same row.
export async function getGamesForBugCreation(): Promise<GameCreateOption[]> {
  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      platforms: { select: { platform: true } },
      builds: { orderBy: { releasedAt: "desc" }, select: { id: true, version: true, status: true } },
    },
  });
  return games.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    platforms: g.platforms.map((p) => p.platform),
    builds: g.builds,
  }));
}

export type AreaSummary = { id: string; name: string; discipline: QADiscipline | null };

// The real, user-manageable game-area taxonomy (see the Area model) — bugs
// and test cases are tagged against these rows, and new custom areas are
// just new rows created from the /areas page, not a hardcoded list.
export async function getAreas(): Promise<AreaSummary[]> {
  return prisma.area.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, discipline: true },
  });
}

export async function getAreaUsageCounts(): Promise<Map<string, { bugs: number; testCases: number }>> {
  const areas = await prisma.area.findMany({
    select: { id: true, _count: { select: { bugs: true, testCases: true } } },
  });
  return new Map(areas.map((a) => [a.id, { bugs: a._count.bugs, testCases: a._count.testCases }]));
}

// The game's real supported platforms — used to generate an "on another
// platform" test case variant only when that platform actually exists.
export async function getGamePlatforms(gameId: string): Promise<Platform[]> {
  const rows = await prisma.gamePlatform.findMany({ where: { gameId }, select: { platform: true } });
  return rows.map((r) => r.platform);
}

