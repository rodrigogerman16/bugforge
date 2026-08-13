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
    "area" TEXT,
    "stepsToReproduce" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "gameId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reportedById" TEXT,
    "assignedToId" TEXT,
    CONSTRAINT "Bug_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bug_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bug_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QASession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bug_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bug" ("area", "assignedToId", "buildId", "createdAt", "description", "gameId", "id", "isRegression", "reportedById", "sessionId", "severity", "status", "stepsToReproduce", "title", "updatedAt") SELECT "area", "assignedToId", "buildId", "createdAt", "description", "gameId", "id", "isRegression", "reportedById", "sessionId", "severity", "status", "stepsToReproduce", "title", "updatedAt" FROM "Bug";
DROP TABLE "Bug";
ALTER TABLE "new_Bug" RENAME TO "Bug";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
