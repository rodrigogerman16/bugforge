-- RedefineTables
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
    "fixedInBuildId" TEXT,
    "verifiedInBuildId" TEXT,
    "sessionId" TEXT,
    "reportedById" TEXT,
    "assignedToId" TEXT,
    CONSTRAINT "Bug_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bug_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bug_fixedInBuildId_fkey" FOREIGN KEY ("fixedInBuildId") REFERENCES "Build" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_verifiedInBuildId_fkey" FOREIGN KEY ("verifiedInBuildId") REFERENCES "Build" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QASession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bug" ("actualResult", "areaId", "assignedToId", "buildId", "createdAt", "description", "environmentGpu", "environmentOS", "expectedResult", "gameId", "gameMode", "id", "isRegression", "map", "number", "platform", "priority", "priorityRank", "reportedById", "sessionId", "severity", "severityRank", "status", "statusRank", "stepsToReproduce", "title", "updatedAt") SELECT "actualResult", "areaId", "assignedToId", "buildId", "createdAt", "description", "environmentGpu", "environmentOS", "expectedResult", "gameId", "gameMode", "id", "isRegression", "map", "number", "platform", "priority", "priorityRank", "reportedById", "sessionId", "severity", "severityRank", "status", "statusRank", "stepsToReproduce", "title", "updatedAt" FROM "Bug";
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
