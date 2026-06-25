-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN "normalizedUrl" TEXT;

-- Backfill normalizedUrl from existing url values where possible.
-- LinkedIn URLs are canonicalized to https://www.linkedin.com/jobs/view/{id}
UPDATE "JobApplication"
SET "normalizedUrl" = 'https://www.linkedin.com/jobs/view/' || (regexp_match("url", '/jobs/view/(?:[^/?#]*-)?(\d+)'))[1]
WHERE "url" IS NOT NULL
  AND "url" ~* 'linkedin\.com/jobs/view/';

-- Non-LinkedIn URLs: strip hash and common tracking query params in SQL (best-effort backfill).
UPDATE "JobApplication"
SET "normalizedUrl" = regexp_replace(split_part("url", '#', 1), '[?&](utm_[^=&]*|trackingId|refId|ref|trk|trkInfo|campaignId|gh_jid|gh_src|fbclid|gclid|mc_cid|mc_eid|currentJobId|lever-source)=[^&#]*', '', 'gi')
WHERE "url" IS NOT NULL
  AND "normalizedUrl" IS NULL;

-- CreateIndex
CREATE INDEX "JobApplication_userId_normalizedUrl_idx" ON "JobApplication"("userId", "normalizedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_userId_normalizedUrl_key" ON "JobApplication"("userId", "normalizedUrl");
