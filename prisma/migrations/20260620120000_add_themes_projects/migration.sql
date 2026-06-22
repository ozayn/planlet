-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeId" TEXT,
    "name" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- AlterTable Theme: replace active/description with color/isArchived
ALTER TABLE "Theme" ADD COLUMN "color" TEXT;
ALTER TABLE "Theme" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Theme" SET "isArchived" = NOT "active";
ALTER TABLE "Theme" DROP COLUMN "description";
ALTER TABLE "Theme" DROP COLUMN "active";

-- AlterTable PlanItem
ALTER TABLE "PlanItem" ADD COLUMN "themeId" TEXT;
ALTER TABLE "PlanItem" ADD COLUMN "projectId" TEXT;

-- Migrate first linked theme per item from junction table
UPDATE "PlanItem" pi
SET "themeId" = sub."themeId"
FROM (
    SELECT DISTINCT ON ("planItemId") "planItemId", "themeId"
    FROM "PlanItemTheme"
    ORDER BY "planItemId", "createdAt" ASC
) sub
WHERE pi."id" = sub."planItemId";

-- DropTable
DROP TABLE "PlanItemTheme";

-- CreateIndex
CREATE INDEX "Project_userId_name_idx" ON "Project"("userId", "name");
CREATE INDEX "Project_themeId_idx" ON "Project"("themeId");
CREATE INDEX "PlanItem_themeId_idx" ON "PlanItem"("themeId");
CREATE INDEX "PlanItem_projectId_idx" ON "PlanItem"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
