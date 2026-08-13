-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#898781'
);

-- CreateTable
CREATE TABLE "_BugToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BugToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Bug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BugToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_BugToTag_AB_unique" ON "_BugToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_BugToTag_B_index" ON "_BugToTag"("B");
