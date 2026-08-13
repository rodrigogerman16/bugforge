-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Build" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "status" TEXT NOT NULL DEFAULT 'INTERNAL',
    "notes" TEXT,
    "releasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "Build_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Build" ("branch", "gameId", "id", "notes", "releasedAt", "version") SELECT "branch", "gameId", "id", "notes", "releasedAt", "version" FROM "Build";
DROP TABLE "Build";
ALTER TABLE "new_Build" RENAME TO "Build";
CREATE UNIQUE INDEX "Build_gameId_version_key" ON "Build"("gameId", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
