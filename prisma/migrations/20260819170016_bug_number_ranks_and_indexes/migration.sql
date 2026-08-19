-- Performance: the Bugs table is designed to scale to 100,000+ rows.
--
-- Previously, a bug's human-facing "BUG-N" number was never stored — it was
-- recomputed on every single read by loading the id of every bug in the
-- whole table, ordered by createdAt, into Node and finding each bug's
-- position (see the old getBugNumberMap in lib/data.ts). That's a full
-- table scan on every bug list page view, every export, every notification,
-- every bug detail page. It's replaced here with a real, indexed, unique
-- "number" column assigned once at creation from an atomic Counter row.
--
-- severity/priority/status are also given a parallel "Rank" integer column
-- mirroring their position in this app's domain order (Blocker worse than
-- Critical, P0 more urgent than P1, ...) — Prisma/SQLite has no way to sort
-- by a custom enum order directly, so previously every bug list request
-- loaded every matching row into memory just to sort it in JS. The Rank
-- columns let that sort happen in the database, backed by an index.

-- 1) Add "number" nullable first (SQLite can't add a NOT NULL/UNIQUE column
--    to a non-empty table in one step), backfill it from existing data in
--    the same chronological order getBugNumberMap used to compute on every
--    request, then promote it to NOT NULL UNIQUE below via RedefineTables.
ALTER TABLE "Bug" ADD COLUMN "number" INTEGER;

UPDATE "Bug" SET "number" = (
  SELECT "rn" FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS "rn" FROM "Bug"
  ) "ranked" WHERE "ranked"."id" = "Bug"."id"
);

-- RedefineTables: promotes "number" to NOT NULL UNIQUE and adds the Rank
-- columns (added with DEFAULT 0 here, then backfilled from the real
-- severity/priority/status of each row below — SQLite's ADD COLUMN default
-- has to be a constant, so it can't compute the real rank inline).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "severityRank" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "priorityRank" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "statusRank" INTEGER NOT NULL DEFAULT 0,
    "isRegression" BOOLEAN NOT NULL DEFAULT false,
    "platform" TEXT NOT NULL DEFAULT 'PC',
    "areaId" TEXT,
    "stepsToReproduce" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "map" TEXT,
    "gameMode" TEXT,
    "environmentOS" TEXT,
    "environmentGpu" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "gameId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reportedById" TEXT,
    "assignedToId" TEXT,
    CONSTRAINT "Bug_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bug_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bug_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QASession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bug" ("id","number","title","description","severity","priority","status","isRegression","platform","areaId","stepsToReproduce","expectedResult","actualResult","map","gameMode","environmentOS","environmentGpu","createdAt","updatedAt","gameId","buildId","sessionId","reportedById","assignedToId")
SELECT "id","number","title","description","severity","priority","status","isRegression","platform","areaId","stepsToReproduce","expectedResult","actualResult","map","gameMode","environmentOS","environmentGpu","createdAt","updatedAt","gameId","buildId","sessionId","reportedById","assignedToId"
FROM "Bug";
DROP TABLE "Bug";
ALTER TABLE "new_Bug" RENAME TO "Bug";
CREATE UNIQUE INDEX "Bug_number_key" ON "Bug"("number");
CREATE INDEX "Bug_gameId_updatedAt_idx" ON "Bug"("gameId", "updatedAt");
CREATE INDEX "Bug_gameId_createdAt_idx" ON "Bug"("gameId", "createdAt");
CREATE INDEX "Bug_gameId_severityRank_idx" ON "Bug"("gameId", "severityRank");
CREATE INDEX "Bug_gameId_priorityRank_idx" ON "Bug"("gameId", "priorityRank");
CREATE INDEX "Bug_gameId_statusRank_idx" ON "Bug"("gameId", "statusRank");
CREATE INDEX "Bug_buildId_idx" ON "Bug"("buildId");
CREATE INDEX "Bug_areaId_idx" ON "Bug"("areaId");
CREATE INDEX "Bug_sessionId_idx" ON "Bug"("sessionId");
CREATE INDEX "Bug_reportedById_idx" ON "Bug"("reportedById");
CREATE INDEX "Bug_assignedToId_idx" ON "Bug"("assignedToId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DataMigration: severityRank/priorityRank/statusRank didn't exist on the
-- old table, so every row above was copied in with the DEFAULT 0 placeholder
-- regardless of its actual severity/priority/status. Compute the real rank
-- for every row now, matching SEVERITY_RANK/PRIORITY_RANK/BUG_STATUS_RANK in
-- lib/severity.ts, lib/priority.ts, and lib/status-labels.ts exactly.
UPDATE "Bug" SET "severityRank" = CASE "severity"
  WHEN 'BLOCKER' THEN 0 WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 0 END;
UPDATE "Bug" SET "priorityRank" = CASE "priority"
  WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 ELSE 0 END;
UPDATE "Bug" SET "statusRank" = CASE "status"
  WHEN 'NEW' THEN 0 WHEN 'CONFIRMED' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'FIXED' THEN 3 WHEN 'READY_FOR_QA' THEN 4
  WHEN 'VERIFIED' THEN 5 WHEN 'CLOSED' THEN 6 WHEN 'REJECTED' THEN 7 WHEN 'DUPLICATE' THEN 8 ELSE 0 END;

-- 2) The Counter table backing atomically-assigned bug numbers from here on
--    (see getNextBugNumber in lib/data.ts) — seeded to the highest number
--    just backfilled above, so the very next created bug continues the
--    sequence instead of colliding with it.
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "Counter" ("id", "value") SELECT 'bugNumber', COALESCE(MAX("number"), 0) FROM "Bug";
