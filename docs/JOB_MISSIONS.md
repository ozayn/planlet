# Job field and mission classifications

`trackerDetails` has optional arrays `employerIndustries` and `missionFields`, separate evidence notes and HTTP(S) source links, and `classificationOrigin` (`manual` or `backfill`). Existing JSON defaults to empty arrays/Unknown. No schema migration is required; no legacy fields or material snapshots are rewritten.

The role/team mission is distinct from the employer's portfolio. Labels are editable, multiple labels and custom labels are supported, and clearing a manual classification remains authoritative. No live keyword classifier runs. Unknown missions require review; government employment or clearance alone never establishes defense. Explicit military/defense or defense-adjacent labels in either dimension show a current-preference conflict. This is a review prompt, not an automatic submission or status change. Location and suitability remain separate decisions.

Insights use confirmed submissions and their local submission calendar dates. A mixed job appears once in each mission category, but once in the unique confirmed total and the all-missions timeline. Category totals may exceed unique submissions. Empty labels form the Unknown category. The same date filters and chart-to-application interactions apply. Past week includes today and the previous six days; past month includes today and the previous 29 days.

## Conservative backfill rollout

Deploy the new JSON schema reader/writer before applying the data backfill. Older application versions do not recognize the new fields and can strip them when saving details. Do not backfill production while the old writer is serving traffic.

Preview with a private snapshot (no database connection or writes):

```sh
node --import tsx scripts/backfill-job-missions.ts --snapshot=/private/tmp/review.json
```

Or preview a scoped account against the configured database:

```sh
node --import tsx scripts/backfill-job-missions.ts --email=account@example.com
```

Only after rollout, apply the same reviewed rules:

```sh
node --import tsx scripts/backfill-job-missions.ts --email=account@example.com --apply
```

The script defaults to dry-run, requires an explicit account, locks that account's rows for the transaction, matches exact employer/title plus a specific saved evidence excerpt and a source link, skips existing/manual classifications, merges only new mission keys, verifies all original columns and existing detail fields are preserved, and checks confirmed totals before commit. Re-running is a no-op for classified records. Evidence-only rules are in `lib/job-mission-backfill.ts`; uncertain roles stay Unknown. No real account data or snapshots belong in git.
