-- CreateTable
CREATE TABLE "BugRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceBugId" TEXT NOT NULL,
    "targetBugId" TEXT NOT NULL,
    CONSTRAINT "BugRelationship_sourceBugId_fkey" FOREIGN KEY ("sourceBugId") REFERENCES "Bug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BugRelationship_targetBugId_fkey" FOREIGN KEY ("targetBugId") REFERENCES "Bug" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BugRelationship_sourceBugId_targetBugId_type_key" ON "BugRelationship"("sourceBugId", "targetBugId", "type");
