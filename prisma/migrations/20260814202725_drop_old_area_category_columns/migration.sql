/*
  Warnings:

  - You are about to drop the column `area` on the `Bug` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `TestCase` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "isRegression" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Bug" ("actualResult", "areaId", "assignedToId", "buildId", "createdAt", "description", "environmentGpu", "environmentOS", "expectedResult", "gameId", "gameMode", "id", "isRegression", "map", "priority", "reportedById", "sessionId", "severity", "status", "stepsToReproduce", "title", "updatedAt") SELECT "actualResult", "areaId", "assignedToId", "buildId", "createdAt", "description", "environmentGpu", "environmentOS", "expectedResult", "gameId", "gameMode", "id", "isRegression", "map", "priority", "reportedById", "sessionId", "severity", "status", "stepsToReproduce", "title", "updatedAt" FROM "Bug";
DROP TABLE "Bug";
ALTER TABLE "new_Bug" RENAME TO "Bug";
CREATE TABLE "new_TestCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "preconditions" TEXT,
    "steps" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "categoryId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "platform" TEXT NOT NULL DEFAULT 'PC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "TestCase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TestCase_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TestCase" ("categoryId", "createdAt", "description", "expected", "gameId", "id", "platform", "preconditions", "priority", "steps", "title") SELECT "categoryId", "createdAt", "description", "expected", "gameId", "id", "platform", "preconditions", "priority", "steps", "title" FROM "TestCase";
DROP TABLE "TestCase";
ALTER TABLE "new_TestCase" RENAME TO "TestCase";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
