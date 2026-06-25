-- Drop unique constraint on normalizedUrl until duplicate rows are cleaned up.
DROP INDEX IF EXISTS "JobApplication_userId_normalizedUrl_key";

-- Ensure column exists for environments that may have missed the prior migration.
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "normalizedUrl" TEXT;

-- Ensure lookup index exists.
CREATE INDEX IF NOT EXISTS "JobApplication_userId_normalizedUrl_idx"
ON "JobApplication"("userId", "normalizedUrl");

-- Best-effort SQL backfill for rows still missing normalizedUrl.
UPDATE "JobApplication"
SET "normalizedUrl" = 'https://www.linkedin.com/jobs/view/' || (regexp_match("url", '/jobs/view/(?:[^/?#]*-)?(\d+)'))[1]
WHERE "url" IS NOT NULL
  AND "normalizedUrl" IS NULL
  AND "url" ~* 'linkedin\.com/jobs/view/';

UPDATE "JobApplication"
SET "normalizedUrl" = regexp_replace(
  regexp_replace(split_part(trim("url"), '#', 1), '/$', ''),
  '[?&](utm_[^=&]*|trackingId|refId|ref|trk|trkInfo|campaignId|gh_jid|gh_src|fbclid|gclid|mc_cid|mc_eid|currentJobId|lever-source)=[^&#]*',
  '',
  'gi'
)
WHERE "url" IS NOT NULL
  AND "normalizedUrl" IS NULL;
