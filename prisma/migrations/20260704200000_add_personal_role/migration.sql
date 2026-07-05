-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PERSONAL';

-- Promote existing Life Lab allowlist users to the Personal role.
UPDATE "User"
SET role = 'PERSONAL'
WHERE "canUseLifeLabFeatures" = true
  AND role = 'USER';
