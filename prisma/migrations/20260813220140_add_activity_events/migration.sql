-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bugId" TEXT NOT NULL,
    "actorId" TEXT,
    "targetTesterId" TEXT,
    CONSTRAINT "ActivityEvent_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_targetTesterId_fkey" FOREIGN KEY ("targetTesterId") REFERENCES "Tester" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
