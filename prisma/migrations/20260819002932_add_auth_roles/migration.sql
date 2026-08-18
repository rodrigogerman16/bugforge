-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tester" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authUserId" TEXT
);
INSERT INTO "new_Tester" ("avatarUrl", "createdAt", "email", "id", "name", "role") SELECT "avatarUrl", "createdAt", "email", "id", "name", "role" FROM "Tester";
DROP TABLE "Tester";
ALTER TABLE "new_Tester" RENAME TO "Tester";
CREATE UNIQUE INDEX "Tester_email_key" ON "Tester"("email");
CREATE UNIQUE INDEX "Tester_authUserId_key" ON "Tester"("authUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DataMigration: TesterRole.QA_ENGINEER was renamed to QA_TESTER, and ADMIN
-- / VIEWER were added. Existing rows carry the old string value (SQLite has
-- no real enum constraint), so it's rewritten explicitly here rather than
-- left to silently stop matching anything in the app.
UPDATE "Tester" SET "role" = 'QA_TESTER' WHERE "role" = 'QA_ENGINEER';
