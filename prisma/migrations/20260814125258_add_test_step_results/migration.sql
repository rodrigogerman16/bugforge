-- CreateTable
CREATE TABLE "TestStepResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepIndex" INTEGER NOT NULL,
    "stepText" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "testRunId" TEXT NOT NULL,
    CONSTRAINT "TestStepResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testCaseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "testerId" TEXT,
    "createdBugId" TEXT,
    CONSTRAINT "TestRun_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QASession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestRun_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TestRun_createdBugId_fkey" FOREIGN KEY ("createdBugId") REFERENCES "Bug" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TestRun" ("id", "notes", "result", "runAt", "sessionId", "testCaseId", "testerId") SELECT "id", "notes", "result", "runAt", "sessionId", "testCaseId", "testerId" FROM "TestRun";
DROP TABLE "TestRun";
ALTER TABLE "new_TestRun" RENAME TO "TestRun";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
